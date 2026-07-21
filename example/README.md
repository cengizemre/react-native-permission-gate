# permission-gate example

Bare React Native app demonstrating [`react-native-permission-gate`](../README.md).

Two tabs:

- **Single** — a permission playground: pick `camera` / `microphone` / `photoLibrary` / `notifications`, watch `status` + `phase` live, drive the rationale sheet and the blocked → Settings path.
- **Media (multi)** — `usePermissions(['camera', 'microphone'])`: one shared rationale, one request, an `allGranted` aggregate.

## Run it

From the **repo root**:

```sh
yarn                      # install workspace deps

# iOS
cd example/ios && pod install && cd ../..
yarn example ios

# Android
yarn example android
```

The app uses the local library source directly — edits under `src/` hot-reload into the app.

> Permission prompts only appear once per install. To reset iOS simulator permissions: Device → Erase All Content and Settings, or `xcrun simctl privacy booted reset all`.
