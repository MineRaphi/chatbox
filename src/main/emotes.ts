import fs from 'node:fs/promises';
import path from 'node:path';
import { BrowserWindow, app, net } from 'electron';
import { IpcChannel, type Emote, type EmoteList } from '../shared/ipc';
import { isEmoteId } from './overlay';
import { getSettings, onSettingChange } from './store';

// Cached sets older than this are refreshed in the background.
const MAX_AGE_MS = 24 * 60 * 60 * 1_000;
const FETCH_TIMEOUT_MS = 10_000;

interface CachedSet {
  fetchedAt: number;
  emotes: Emote[];
}

interface CacheFile {
  version: 1;
  sets: Record<string, CachedSet>;
}

let cache: CacheFile = { version: 1, sets: {} };
let list: EmoteList = { emotes: [], error: null, loading: false };
let refreshing: Promise<void> | null = null;

const cachePath = (): string =>
  path.join(app.getPath('userData'), 'emote-cache.json');

function publish(next: Partial<EmoteList>): void {
  list = { ...list, ...next };
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IpcChannel.EmotesChanged, list);
  }
}

/** Merge the configured sets in order; the first emote with a name wins. */
function combine(): Emote[] {
  const seen = new Set<string>();
  const out: Emote[] = [];
  for (const setId of getSettings().emoteSets) {
    for (const emote of cache.sets[setId]?.emotes ?? []) {
      if (seen.has(emote.name)) continue;
      seen.add(emote.name);
      out.push(emote);
    }
  }
  return out;
}

/** Keep only well-formed emotes from a 7TV API response. */
function parseSet(body: unknown): Emote[] {
  const raw = (body as { emotes?: unknown })?.emotes;
  if (!Array.isArray(raw)) throw new Error('unexpected response from 7TV');
  return raw.flatMap((e): Emote[] => {
    const id: unknown = e?.id;
    const name: unknown = e?.name;
    if (!isEmoteId(id) || typeof name !== 'string' || !name) return [];
    return [{ id, name, animated: e?.data?.animated === true }];
  });
}

async function fetchSet(setId: string): Promise<Emote[]> {
  const res = await net.fetch(`https://7tv.io/v3/emote-sets/${setId}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`7TV returned ${res.status} for set ${setId}`);
  return parseSet(await res.json());
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
          cache.sets[id] = {
            fetchedAt: Date.now(),
            emotes: await fetchSet(id),
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
