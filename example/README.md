# permission-gate example

Bare React Native app demoing `react-native-permission-gate`:

- **Single tab** — pick a permission (camera, microphone, photoLibrary, notifications) and drive the full flow: rationale sheet → native prompt → granted/blocked, with live `status` / `phase` readout.
- **Media (multi) tab** — `usePermissions(['camera', 'microphone'])`: one shared rationale, sequential prompts, `allGranted` aggregation.

## Run it

From the repository root:

```sh
yarn                 # install workspace deps
cd example/ios && pod install && cd ../..
yarn example ios     # or: yarn example android
```

iOS `Info.plist` usage strings and `Podfile` `setup_permissions` are already configured for the demoed permissions.

## Reset permissions between runs

Once a permission is granted/denied the OS remembers it. To replay the flow on the iOS simulator:

```sh
xcrun simctl privacy booted reset all permissiongate.example
```
