#!/bin/zsh
# Double-click to open MacKO Manager in Chrome (macOS).
# Works on Apple Silicon and Intel — Chrome handles arch automatically.
DIR="$(cd "$(dirname "$0")" && pwd)"
URL="file://$DIR/index.html"
if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" "$URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -a "Microsoft Edge" "$URL"
elif [ -d "/Applications/Brave Browser.app" ]; then
  open -a "Brave Browser" "$URL"
else
  echo "Install Google Chrome from https://www.google.com/chrome/"
  exit 1
fi
