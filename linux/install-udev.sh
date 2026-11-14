#!/usr/bin/env bash
# One-shot installer for the udev rule that lets Chrome WebUSB claim the
# Kondo ICS USB Adapter HS without root.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
RULE="$HERE/99-kondo-ics-usb.rules"
TARGET="/etc/udev/rules.d/99-kondo-ics-usb.rules"

if [ ! -f "$RULE" ]; then
  echo "Rule file missing: $RULE" >&2
  exit 1
fi

if [ "$EUID" -ne 0 ]; then
  echo "Installing udev rule (requires sudo)..."
  sudo cp "$RULE" "$TARGET"
  sudo udevadm control --reload-rules
  sudo udevadm trigger
else
  cp "$RULE" "$TARGET"
  udevadm control --reload-rules
  udevadm trigger
fi

echo "Installed → $TARGET"
echo "Unplug and reconnect the ICS USB Adapter HS so the rule takes effect."
