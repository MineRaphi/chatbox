#!/usr/bin/env bash
# Start the given command as if in a Wayland session. Chatbox should restart
# itself once with --ozone-platform=x11 (XWayland) and keep running; pass if
# that X11 copy is still alive after SECONDS_TO_RUN (default 30).
#
#   scripts/smoke-test-wayland.sh chatbox
#
# XVFB_RUN replaces "xvfb-run -a" (for testing where a display already runs).
set -uo pipefail

export SMOKE_SECONDS="${SECONDS_TO_RUN:-30}"
export SMOKE_LOG="$(mktemp)"
# Passed through the environment, never written into a command line: on
# Linux, pgrep/pkill -f also match the shells running this check, and would
# find (and kill) them instead of Chatbox. [C] keeps the pattern from
# matching its own text, too.
export SMOKE_PATTERN='[C]hatbox.*--ozone-platform=x11'
export XDG_SESSION_TYPE=wayland

# The first Chatbox exits right after starting the X11 copy, so the virtual
# display has to outlive it: the check runs inside the same xvfb-run.
${XVFB_RUN:-xvfb-run -a} bash -c '
  "$@" >"$SMOKE_LOG" 2>&1 &
  sleep "$SMOKE_SECONDS"
  if pgrep -f -- "$SMOKE_PATTERN" >/dev/null; then
    pkill -f -- "$SMOKE_PATTERN"
    exit 0
  fi
  exit 1
' _ "$@"
code=$?

if [ "$code" -ne 0 ]; then
  echo "::error::'$*' did not keep an X11 copy running after ${SMOKE_SECONDS} s (exit $code)"
  tail -40 "$SMOKE_LOG"
  exit 1
fi
echo "'$*' relaunched on X11 and ran for ${SMOKE_SECONDS} s"
