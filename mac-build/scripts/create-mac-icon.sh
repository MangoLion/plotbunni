#!/bin/bash

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RESOURCES_DIR="$SCRIPT_DIR/../resources"
ORIGINAL_ICON="$SCRIPT_DIR/../../electron/icon.ico"

# Create iconset directory
mkdir -p "$RESOURCES_DIR/icon.iconset"

# Convert icon.ico to PNG images of different sizes
sips -s format png "$ORIGINAL_ICON" --out "$RESOURCES_DIR/icon.png"
for size in 16 32 64 128 256 512; do
  sips -z $size $size "$RESOURCES_DIR/icon.png" --out "$RESOURCES_DIR/icon.iconset/icon_${size}x${size}.png"
  if [ $size -le 32 ]; then
    sips -z $size $size "$RESOURCES_DIR/icon.png" --out "$RESOURCES_DIR/icon.iconset/icon_${size}x${size}@2x.png"
  fi
done

# Create icns file
cd "$RESOURCES_DIR"
iconutil -c icns icon.iconset

# Clean up
rm -rf icon.iconset icon.png
