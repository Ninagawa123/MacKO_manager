#!/usr/bin/env bash
# Launcher for Linux (Ubuntu, Fedora, Debian, Arch). Opens MacKO Manager in
# Chrome / Chromium / Edge. On macOS use launch.command instead.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
URL="file://$DIR/index.html"
for browser in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge brave-browser; do
  if command -v "$browser" >/dev/null 2>&1; then
    echo "Launching $browser..."
    nohup "$browser" "$URL" >/dev/null 2>&1 &
    exit 0
  fi
done
cat <<EOF
No Chromium-based browser found. Install one of:
  Ubuntu/Debian:  sudo apt install chromium-browser
                  or download Chrome .deb from https://www.google.com/chrome/
  Fedora:         sudo dnf install chromium
  Arch:           sudo pacman -S chromium

Safari / Firefox are not supported (no WebUSB).
EOF
exit 1
