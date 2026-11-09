// Protocol 2, client side. chatbox-server keeps its own copy in
// src/protocol.ts; the repos share no code, so change both together.

export const PROTOCOL = 2;

export const Event = {
  Hello: 'hello',
  Welcome: 'welcome',
  Rejected: 'rejected',
  Emote: 'emote',
  Members: 'members',
  Limited: 'limited',
} as const;

export interface HelloPayload {
  protocol: number;
  name: string;
  group: string;
}

export interface EmoteOut {
  emoteId: string;
}

// What the server sends, checked before use: a server is still input.

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isNameList = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length <= 1_000 &&
  v.every((n) => typeof n === 'string' && n.length <= 64);

export function parseWelcome(
  v: unknown,
): { group: string; members: string[] } | null {
  if (!isRecord(v) || v.protocol !== PROTOCOL) return null;
  if (typeof v.group !== 'string' || !isNameList(v.members)) return null;
  return { group: v.group, members: v.members };
}

export function parseMembers(v: unknown): string[] | null {
  return isRecord(v) && isNameList(v.members) ? v.members : null;
}

export function parseRejected(v: unknown): string {
  return isRecord(v) && typeof v.reason === 'string'
    ? v.reason.slice(0, 200)
    : 'The server refused to let you join.';
}

export function parseIncomingEmote(
  v: unknown,
): { emoteId: unknown; from: string } | null {
  if (!isRecord(v)) return null;
  const from = typeof v.from === 'string' ? v.from.slice(0, 64) : '';
  return { emoteId: v.emoteId, from };
}

export function parseLimited(v: unknown): number | null {
  if (!isRecord(v) || typeof v.retryInMs !== 'number') return null;
  return Math.max(0, Math.min(60_000, Math.round(v.retryInMs)));
}
