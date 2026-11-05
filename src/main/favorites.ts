import { MAX_FAVORITES, type Emote, type FavoriteResult } from '../shared/ipc';
import { getSetting, isStoredEmote, setSetting } from './store';

/** Add the emote to the front of the favorites, or remove it if present. */
export function toggleFavorite(input: unknown): FavoriteResult {
  if (!isStoredEmote(input)) return 'invalid';
  const { id, name, animated } = input as Emote;

  const favorites = getSetting('favorites');
  if (favorites.some((f) => f.id === id)) {
    setSetting(
      'favorites',
      favorites.filter((f) => f.id !== id),
    );
    return 'removed';
  }
  if (favorites.length >= MAX_FAVORITES) return 'full';

  setSetting('favorites', [{ id, name, animated }, ...favorites]);
  return 'added';
}
