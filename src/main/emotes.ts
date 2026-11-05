import fs from 'node:fs/promises';
import path from 'node:path';
import { BrowserWindow, app, net } from 'electron';
import {
  IpcChannel,
  type Emote,
  type EmoteList,
  type ResolvedSet,
} from '../shared/ipc';
import { isEmoteId } from './overlay';
import { getSettings, onSettingChange } from './store';

// Cached sets older than this are refreshed in the background.
const MAX_AGE_MS = 24 * 60 * 60 * 1_000;
const FETCH_TIMEOUT_MS = 10_000;

// 7TV set IDs: current ULIDs, and the 24-hex ObjectIDs older links still use.
const ULID = /^[0-9A-Z]{26}$/;
const SET_IN_INPUT = /(?:^|\/)([0-9A-Za-z]{26}|[0-9a-fA-F]{24})(?:$|[/?#])/;

interface CachedSet {
  fetchedAt: number;
  emotes: Emote[];
  /** Missing in caches written before set names were stored. */
  name?: string;
}

interface FetchedSet {
  id: string;
  name: string;
  emotes: Emote[];
}

interface CacheFile {
  version: 1;
  sets: Record<string, CachedSet>;
}

let cache: CacheFile = { version: 1, sets: {} };
let list: EmoteList = { emotes: [], setNames: {}, error: null, loading: false };
let refreshing: Promise<void> | null = null;

const cachePath = (): string =>
  path.join(app.getPath('userData'), 'emote-cache.json');

function setNames(): Record<string, string> {
  const names: Record<string, string> = {};
  for (const [id, set] of Object.entries(cache.sets)) {
    if (set.name) names[id] = set.name;
  }
  return names;
}

function publish(next: Partial<EmoteList>): void {
  list = { ...list, setNames: setNames(), ...next };
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IpcChannel.EmotesChanged, list);
  }
}

/**
 * Merge the configured sets in order. The first emote wins on both name and
 * ID: sets often contain the same emote (same ID) under a different alias,
 * and the picker keys its grid by ID, so duplicates would break rendering.
 */
function combine(): Emote[] {
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  const out: Emote[] = [];
  for (const setId of getSettings().emoteSets) {
    for (const emote of cache.sets[setId]?.emotes ?? []) {
      if (seenNames.has(emote.name) || seenIds.has(emote.id)) continue;
      seenNames.add(emote.name);
      seenIds.add(emote.id);
      out.push(emote);
    }
  }
  return out;
}

/** Keep only well-formed parts of a 7TV emote set response. */
function parseSet(body: unknown, requestedId: string): FetchedSet {
  const set = body as {
    id?: unknown;
    name?: unknown;
    emotes?: unknown;
    owner?: { display_name?: unknown } | null;
  };
  if (!Array.isArray(set?.emotes)) {
    throw new Error('unexpected response from 7TV');
  }
  const emotes = set.emotes.flatMap((e): Emote[] => {
    const id: unknown = e?.id;
    const name: unknown = e?.name;
    if (!isEmoteId(id) || typeof name !== 'string' || !name) return [];
    return [{ id, name, animated: e?.data?.animated === true }];
  });
  // The API answers old ObjectID requests with the set's current ULID.
  const id =
    typeof set.id === 'string' && ULID.test(set.id) ? set.id : requestedId;
  // Many sets keep a generic name ("Default Emote Set"), so add the owner.
  const setName = typeof set.name === 'string' && set.name ? set.name : id;
  const owner = set.owner?.display_name;
  const name = (
    typeof owner === 'string' && owner ? `${setName} · ${owner}` : setName
  ).slice(0, 100);
  return { id, name, emotes };
}

async function fetchSet(setId: string): Promise<FetchedSet> {
  const res = await net.fetch(
    `https://7tv.io/v3/emote-sets/${encodeURIComponent(setId)}`,
    { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
  );
  if (res.status === 404 || res.status === 400) {
    throw new Error("7TV doesn't know that emote set");
  }
  if (!res.ok) throw new Error(`7TV returned ${res.status} for set ${setId}`);
  return parseSet(await res.json(), setId);
}

/**
 * Look up a set from a 7tv.app link or a bare ID, old or new format, and
 * cache it. Used before a set is added, so typos never get saved.
 */
export async function resolveSet(input: unknown): Promise<ResolvedSet> {
  if (typeof input !== 'string') return { ok: false, error: 'Invalid input.' };
  const text = input.trim();
  const requested =
    text.toLowerCase() === 'global' ? 'global' : SET_IN_INPUT.exec(text)?.[1];
  if (!requested) {
    return { ok: false, error: 'Paste a 7TV emote set link or ID.' };
  }

  try {
    const set = await fetchSet(
      // ULIDs are uppercase; ObjectIDs are hex and case-insensitive.
      requested.length === 26
        ? requested.toUpperCase()
        : requested.toLowerCase(),
    );
    const id = requested === 'global' ? 'global' : set.id;
    cache.sets[id] = {
      fetchedAt: Date.now(),
      emotes: set.emotes,
      name: set.name,
    };
    await writeCache().catch((err) =>
      console.warn('[emotes] could not write cache:', err),
    );
    publish({});
    return { ok: true, id, name: set.name, count: set.emotes.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Couldn't add that set: ${message}` };
  }
}

async function readCache(): Promise<void> {
  try {
    const parsed = JSON.parse(await fs.readFile(cachePath(), 'utf8'));
    if (parsed?.version === 1 && typeof parsed.sets === 'object') {
      cache = parsed as CacheFile;
    }
  } catch {
    // No cache yet, or unreadable: start empty and fetch.
  }
}

async function writeCache(): Promise<void> {
  // Write to a temp file and rename so a crash never leaves half a file.
  const tmp = `${cachePath()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(cache));
  await fs.rename(tmp, cachePath());
}

/**
 * Fetch every configured set that is missing or stale (or all, if `force`).
 * Failed sets keep their cached copy; the error is reported to the picker.
 */
export function refreshEmotes(force = false): Promise<void> {
  refreshing ??= (async () => {
    const now = Date.now();
    const due = getSettings().emoteSets.filter((id) => {
      const cached = cache.sets[id];
      return force || !cached || now - cached.fetchedAt > MAX_AGE_MS;
    });
    if (due.length === 0) return;

    publish({ loading: true });
    const failures: string[] = [];
    await Promise.all(
      due.map(async (id) => {
        try {
          const set = await fetchSet(id);
          cache.sets[id] = {
            fetchedAt: Date.now(),
            emotes: set.emotes,
            name: set.name,
          };
        } catch (err) {
          failures.push(err instanceof Error ? err.message : String(err));
        }
      }),
    );

    if (failures.length < due.length) {
      await writeCache().catch((err) =>
        console.warn('[emotes] could not write cache:', err),
      );
    }
    publish({
      emotes: combine(),
      loading: false,
      error: failures.length ? `Couldn't load emotes: ${failures[0]}` : null,
    });
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export function getEmotes(): EmoteList {
  return list;
}

export async function initEmotes(): Promise<void> {
  await readCache();
  publish({ emotes: combine() });
  onSettingChange((key) => {
    if (key !== 'emoteSets') return;
    publish({ emotes: combine() });
    void refreshEmotes();
  });
  await refreshEmotes();
}
