import { EventEmitter } from 'node:events';
import { BrowserWindow } from 'electron';
import { io, type Socket } from 'socket.io-client';
import { IpcChannel, type ConnectionStatus } from '../shared/ipc';
import { isEmoteId, showEmote } from './overlay';
import { getSettings, onSettingChange } from './store';

// Server event names. The current chatbox-server only knows `7tvEmote`.
const EMOTE_EVENT = '7tvEmote';

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const CONNECT_TIMEOUT_MS = 5_000;

let socket: Socket | null = null;
let status: ConnectionStatus = {
  state: 'not-configured',
  address: null,
  error: null,
};
const events = new EventEmitter<{ status: [ConnectionStatus] }>();

function setStatus(next: Partial<ConnectionStatus>): void {
  status = { ...status, ...next };
  events.emit('status', status);
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IpcChannel.StatusChanged, status);
  }
}

function disconnect(): void {
  socket?.removeAllListeners();
  socket?.io.removeAllListeners();
  socket?.disconnect();
  socket = null;
}

/** (Re)connect to the server from the current settings. */
function connect(): void {
  disconnect();

  const { serverHost, serverPort } = getSettings();
  if (!serverHost) {
    setStatus({ state: 'not-configured', address: null, error: null });
    return;
  }

  const address = `${serverHost}:${serverPort}`;
  setStatus({ state: 'connecting', address, error: null });

  const s = io(`http://${address}`, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: RECONNECT_MIN_MS,
    reconnectionDelayMax: RECONNECT_MAX_MS,
    timeout: CONNECT_TIMEOUT_MS,
  });
  socket = s;

  s.on('connect', () => setStatus({ state: 'connected', error: null }));

  s.on('disconnect', (reason) => {
    setStatus({ state: 'reconnecting', error: reason });
    // The client only retries by itself if the drop wasn't the server's choice.
    if (reason === 'io server disconnect') s.connect();
  });

  s.on('connect_error', (err) => {
    setStatus({ state: 'reconnecting', error: err.message });
  });

  s.io.on('reconnect_attempt', () => {
    if (status.state !== 'connected') setStatus({ state: 'reconnecting' });
  });

  s.on(EMOTE_EVENT, (emoteId: unknown) => {
    showEmote(emoteId, true);
  });
}

export function initConnection(): void {
  onSettingChange((key) => {
    if (key === 'serverHost' || key === 'serverPort') connect();
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
 * Send an emote to everyone else on the server and show it locally too.
 * Returns false for an invalid ID; offline sends still show the local preview.
 */
export function sendEmote(emoteId: string): boolean {
  if (!isEmoteId(emoteId)) return false;
  if (socket?.connected) socket.emit(EMOTE_EVENT, emoteId);
  showEmote(emoteId, false);
  return true;
}
