#!/usr/bin/env bash
# Start the given command on a virtual display and pass if it is still
# running after SECONDS_TO_RUN (default 30): timeout's exit code 124 means
# it was stopped while running, anything else means it exited or crashed.
#
#   scripts/smoke-test.sh chatbox
#   SECONDS_TO_RUN=45 scripts/smoke-test.sh nix run nixpkgs#appimage-run -- Chatbox.AppImage
set -uo pipefail

seconds="${SECONDS_TO_RUN:-30}"
log="$(mktemp)"

xvfb-run -a timeout "$seconds" "$@" >"$log" 2>&1
code=$?

if [ "$code" -ne 124 ]; then
  echo "::error::'$*' exited with code $code within ${seconds} s"
  tail -40 "$log"
  exit 1
fi
echo "'$*' ran for ${seconds} s without crashing"
