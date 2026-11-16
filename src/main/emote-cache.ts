// The emote cache file's shape and its validation. No Electron imports, so
// it can be tested with plain Node.
import type { Emote } from '../shared/ipc';

const EMOTE_ID = /^[0-9A-Z]{26}$/;
const SET_ID = /^(global|[0-9A-Z]{26})$/;

export interface CachedSet {
  fetchedAt: number;
  emotes: Emote[];
  /** Missing in caches written before set names were stored. */
  name?: string;
}

export interface CacheFile {
  version: 1;
  sets: Record<string, CachedSet>;
}

/**
 * Keep only the well-formed parts of a cache file. A damaged or hand-edited
 * file must never break the picker: whatever is dropped is fetched again.
 */
export function parseCache(parsed: unknown): CacheFile {
  const clean: CacheFile = { version: 1, sets: {} };
  const file = parsed as { version?: unknown; sets?: unknown } | null;
  if (file?.version !== 1 || typeof file.sets !== 'object' || !file.sets) {
    return clean;
  }
  for (const [id, value] of Object.entries(file.sets)) {
    const set = value as Partial<CachedSet> | null;
    if (!SET_ID.test(id) || !Array.isArray(set?.emotes)) continue;
    clean.sets[id] = {
      fetchedAt: typeof set.fetchedAt === 'number' ? set.fetchedAt : 0,
      emotes: set.emotes.flatMap((e: Partial<Emote> | null): Emote[] =>
        typeof e?.id === 'string' &&
        EMOTE_ID.test(e.id) &&
        typeof e.name === 'string' &&
        e.name
          ? [{ id: e.id, name: e.name, animated: e.animated === true }]
          : [],
      ),
      ...(typeof set.name === 'string' ? { name: set.name.slice(0, 100) } : {}),
    };
  }
  return clean;
}
