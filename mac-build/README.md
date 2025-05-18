# Plot Bunni - Mac Build Configuration

This folder contains the necessary configuration to build Plot Bunni for macOS. It's designed to be portable so you can easily copy it to new versions of the app when it's updated.

## Setup

1. Copy this entire `mac-build` folder to the root of the Plot Bunni project
2. Navigate to the mac-build directory:
   ```bash
   cd mac-build
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. To build only for Mac:
   ```bash
   npm run build
   ```

The built applications will be available in the `dist` folder as a dmg file. Double click the dmg file to install Plot Bunni.

## Folder Structure

- `resources/` - Contains generated Mac-specific resources (icons)
- `scripts/` - Contains build preparation scripts
  - `prepare-build.js` - Prepares the build environment
  - `create-mac-icon.sh` - Converts the original icon to Mac format

## Updating the App

When the original Plot Bunni app is updated:

1. Download/update the main app
2. Copy this entire `mac-build` folder to the root of the updated app
3. Follow the setup and build instructions above

The configuration is designed to reference the main app's files while maintaining its own Mac-specific build settings.
