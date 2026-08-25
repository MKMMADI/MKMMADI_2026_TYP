# mobile-app (Expo / EAS)

This folder contains a production-ready starting skeleton for a React Native app using Expo and EAS.

Quick start
1. Install Node.js (16+ recommended) and npm or Yarn.
2. From this folder, install dependencies:
   - npm: `npm install`
   - yarn: `yarn`
3. Install Expo CLI / EAS CLI if needed:
   - npm: `npm install -g expo-cli eas-cli` (or use npx to avoid global installs)
4. Start the dev server:
   - `npm start` (or `expo start`)
5. Build for production with EAS:
   - Configure credentials: `eas credentials` and `eas build:configure` if prompted
   - `npm run build` (uses `eas build --profile production`)

Notes
- Replace placeholder images in ./assets (icon.png, splash.png, adaptive-icon.png, favicon.png) with production assets before building.
- Update `expo.sdkVersion` in app.json to match the installed expo dependency version if you change it.
- For a managed workflow, EAS builds use the configuration in eas.json. Adjust profiles as needed.

Project layout
- src/ - application source (entry: src/App.js)
- assets/ - images and static assets
- app.json - Expo app configuration
- eas.json - EAS build profiles
- package.json - scripts and dependency list

Helpful links
- Expo docs: https://docs.expo.dev/
- EAS build docs: https://docs.expo.dev/eas/
