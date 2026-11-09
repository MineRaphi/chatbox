#!/usr/bin/env bash
# Download the AppImage runtime (the small launcher at the start of every
# AppImage) at a pinned version, and check it against a known checksum.
# The AppImage maker would otherwise fetch the moving "continuous" build.
#
# The checksum matches GitHub's recorded digest for this release asset.
# To update: pick a release at https://github.com/AppImage/type2-runtime/releases,
# then set VERSION and SHA256 from the asset's digest.
set -euo pipefail

VERSION=20251108
SHA256=2fca8b443c92510f1483a883f60061ad09b46b978b2631c807cd873a47ec260d
URL="https://github.com/AppImage/type2-runtime/releases/download/${VERSION}/runtime-x86_64"

cd "$(dirname "$0")/.."
OUT=build/appimage-runtime-x86_64
mkdir -p build

if [ -f "$OUT" ] && echo "${SHA256}  ${OUT}" | sha256sum -c --status 2>/dev/null; then
  echo "AppImage runtime ${VERSION} already present"
  exit 0
fi

curl -sSLf -o "${OUT}.tmp" "$URL"
if ! echo "${SHA256}  ${OUT}.tmp" | sha256sum -c --status; then
  rm -f "${OUT}.tmp"
  echo "AppImage runtime checksum mismatch; refusing to use it" >&2
  exit 1
fi
mv "${OUT}.tmp" "$OUT"
echo "AppImage runtime ${VERSION} downloaded and verified"
