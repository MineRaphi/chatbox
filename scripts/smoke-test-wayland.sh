#!/usr/bin/env bash
# Start the given command as if in a Wayland session. Chatbox should restart
# itself once with --ozone-platform=x11 (XWayland) and keep running; pass if
# that X11 copy is still alive after SECONDS_TO_RUN (default 30).
#
#   scripts/smoke-test-wayland.sh chatbox
set -uo pipefail

seconds="${SECONDS_TO_RUN:-30}"
log="$(mktemp)"

export XDG_SESSION_TYPE=wayland
xvfb-run -a bash -c '
  "$@" >"'"$log"'" 2>&1 &
  sleep '"$seconds"'
  if pgrep -f -- "--ozone-platform=x11" >/dev/null; then
    pkill -f -- "--ozone-platform=x11"
    exit 0
  fi
  exit 1
' _ "$@"
code=$?

if [ "$code" -ne 0 ]; then
  echo "::error::'$*' did not keep an X11 copy running after ${seconds} s"
  tail -40 "$log"
  exit 1
fi
echo "'$*' relaunched on X11 and ran for ${seconds} s"
