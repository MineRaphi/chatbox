import { app, session } from 'electron';

// Chatbox's windows only ever show their own bundled page. Nothing in them
// links anywhere today; these rules make sure that stays true even if a
// page were ever tricked into trying.

/** True when `next` is the page `current` itself (a reload, or its #hash). */
function samePage(current: string, next: string): boolean {
  try {
    const a = new URL(current);
    const b = new URL(next);
    return a.origin === b.origin && a.pathname === b.pathname;
  } catch {
    return false;
  }
}

export function hardenWebContents(): void {
  app.on('web-contents-created', (_event, contents) => {
    // No navigating away from the bundled page.
    contents.on('will-navigate', (event, url) => {
      if (!samePage(contents.getURL(), url)) {
        console.warn(`[harden] blocked navigation to ${url}`);
        event.preventDefault();
      }
    });
    // No new windows, and no <webview> tags.
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });

  // The pages need no camera, microphone, location or other permission.
  // (Update notifications are shown by the main process, not a page.)
  void app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler(
      (_contents, _permission, callback) => callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);
  });
}
