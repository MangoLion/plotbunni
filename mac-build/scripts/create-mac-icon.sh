#!/bin/bash

# Set the current directory to the script's directory
cd "$(dirname "$0")"

# Convert Windows icon to PNG
sips -s format png "../../electron/icon.ico" --out "../resources/icon.png"

# Create iconset directory
mkdir -p "../resources/icon.iconset"

# Generate different sizes
sips -z 16 16     "../resources/icon.png" --out "../resources/icon.iconset/icon_16x16.png"
sips -z 32 32     "../resources/icon.png" --out "../resources/icon.iconset/icon_16x16@2x.png"
sips -z 32 32     "../resources/icon.png" --out "../resources/icon.iconset/icon_32x32.png"
sips -z 64 64     "../resources/icon.png" --out "../resources/icon.iconset/icon_32x32@2x.png"
sips -z 64 64     "../resources/icon.png" --out "../resources/icon.iconset/icon_64x64.png"
sips -z 128 128   "../resources/icon.png" --out "../resources/icon.iconset/icon_128x128.png"
sips -z 256 256   "../resources/icon.png" --out "../resources/icon.iconset/icon_256x256.png"
sips -z 512 512   "../resources/icon.png" --out "../resources/icon.iconset/icon_512x512.png"

# Convert to icns
iconutil -c icns "../resources/icon.iconset" -o "../resources/icon.icns"
