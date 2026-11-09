import { EventEmitter } from 'node:events';
import { BrowserWindow, app } from 'electron';
import { io, type Socket } from 'socket.io-client';
import {
  IpcChannel,
  type ConnectionStatus,
  type LimitedNotice,
} from '../shared/ipc';
import { isEmoteId, showEmote } from './overlay';
import {
  Event,
  PROTOCOL,
  parseIncomingEmote,
  parseLimited,
  parseMembers,
  parseRejected,
  parseWelcome,
  type EmoteOut,
  type HelloPayload,
} from './protocol';
import { getSettings, onSettingChange } from './store';

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const CONNECT_TIMEOUT_MS = 5_000;
// A v1 server ignores `hello`; after this long without `welcome`, say so.
const WELCOME_TIMEOUT_MS = 3_000;

const OLD_SERVER =
  'This server is too old for this version of Chatbox. Ask whoever runs it to update to chatbox-server v2.';

let socket: Socket | null = null;
let welcomeTimer: ReturnType<typeof setTimeout> | undefined;
let status: ConnectionStatus = {
  state: 'not-configured',
  address: null,
  error: null,
  group: null,
  members: [],
};
const events = new EventEmitter<{ status: [ConnectionStatus] }>();

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

function setStatus(next: Partial<ConnectionStatus>): void {
  status = { ...status, ...next };
  events.emit('status', status);
  broadcast(IpcChannel.StatusChanged, status);
}

/** Not in a group (any more): forget the group and its members. */
const notJoined = {
  group: null,
  members: [],
} satisfies Partial<ConnectionStatus>;

function disconnect(): void {
  clearTimeout(welcomeTimer);
  socket?.removeAllListeners();
  socket?.io.removeAllListeners();
  socket?.disconnect();
  socket = null;
}

/** Join (or re-join) with the current name and group code. */
function sendHello(s: Socket): void {
  const { displayName, groupCode } = getSettings();
  const hello: HelloPayload = {
    protocol: PROTOCOL,
    name: displayName,
    group: groupCode,
  };
  s.emit(Event.Hello, hello);

  clearTimeout(welcomeTimer);
  welcomeTimer = setTimeout(() => {
    if (status.state === 'connecting') {
      setStatus({ state: 'rejected', error: OLD_SERVER, ...notJoined });
    }
  }, WELCOME_TIMEOUT_MS);
}

/** (Re)connect to the server from the current settings. */
function connect(): void {
  disconnect();

  const { serverHost, serverPort } = getSettings();
  if (!serverHost) {
    setStatus({
      state: 'not-configured',
      address: null,
      error: null,
      ...notJoined,
    });
    return;
  }

  const address = `${serverHost}:${serverPort}`;
  setStatus({ state: 'connecting', address, error: null, ...notJoined });

  const s = io(`http://${address}`, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: RECONNECT_MIN_MS,
    reconnectionDelayMax: RECONNECT_MAX_MS,
    timeout: CONNECT_TIMEOUT_MS,
  });
  socket = s;

  // Connected is not joined: wait for `welcome`.
  s.on('connect', () => {
    setStatus({ state: 'connecting', error: null });
    sendHello(s);
  });

  s.on(Event.Welcome, (payload: unknown) => {
    const welcome = parseWelcome(payload);
    if (!welcome) return;
    clearTimeout(welcomeTimer);
    setStatus({
      state: 'connected',
      error: null,
      group: welcome.group,
      members: welcome.members,
    });
  });

  s.on(Event.Rejected, (payload: unknown) => {
    clearTimeout(welcomeTimer);
    setStatus({
      state: 'rejected',
      error: parseRejected(payload),
      ...notJoined,
    });
  });

  s.on(Event.Members, (payload: unknown) => {
    const members = parseMembers(payload);
    if (members && status.state === 'connected') setStatus({ members });
  });

  s.on(Event.Emote, (payload: unknown) => {
    const incoming = parseIncomingEmote(payload);
    if (incoming) showEmote(incoming.emoteId, true, incoming.from);
  });

  s.on(Event.Limited, (payload: unknown) => {
    const retryInMs = parseLimited(payload);
    if (retryInMs === null) return;
    const notice: LimitedNotice = { retryInMs };
    broadcast(IpcChannel.Limited, notice);
  });

  s.on('disconnect', (reason) => {
    clearTimeout(welcomeTimer);
    setStatus({ state: 'reconnecting', error: reason, ...notJoined });
    // The client only retries by itself if the drop wasn't the server's choice.
    if (reason === 'io server disconnect') s.connect();
  });

  s.on('connect_error', (err) => {
    setStatus({ state: 'reconnecting', error: err.message, ...notJoined });
  });

  s.io.on('reconnect_attempt', () => {
    if (status.state !== 'connected') setStatus({ state: 'reconnecting' });
  });
}

export function initConnection(): void {
  // Leave cleanly on quit: the group sees you go at once, and no status
  // events fire into a tray that's being torn down.
  app.on('before-quit', disconnect);
  onSettingChange((key) => {
    if (key === 'serverHost' || key === 'serverPort') {
      connect();
    } else if (key === 'displayName' || key === 'groupCode') {
      // Same server, new name or group: just join again.
      if (socket?.connected) {
        setStatus({ state: 'connecting', error: null, ...notJoined });
        sendHello(socket);
      }
    }
  });
  connect();
}

export function getStatus(): ConnectionStatus {
  return status;
}

export function onStatus(listener: (status: ConnectionStatus) => void): void {
  events.on('status', listener);
}

/**
 * Send an emote to the rest of your group and show it locally too.
 * Returns false for an invalid ID; offline sends still show the local preview.
 */
export function sendEmote(emoteId: string): boolean {
  if (!isEmoteId(emoteId)) return false;
  if (socket?.connected && status.state === 'connected') {
    const out: EmoteOut = { emoteId };
    socket.emit(Event.Emote, out);
  }
  showEmote(emoteId, false);
  return true;
}
