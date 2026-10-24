# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-10-24

### Added

- `siri` permission alias (iOS) and `nearbyWifiDevices` permission alias (Android 13+). Thanks to @leandroltz0 ([#10](https://github.com/cengizemre/react-native-permission-gate/pull/10)).

### Fixed

- A failing `adapter.check` no longer causes an unhandled promise rejection. `usePermission` ignores a failed foreground re-check and keeps the current status. In `usePermissions`, one failing check no longer rejects the whole refresh, and on mount it no longer skips `requestOnMount`.

### Changed

- Dev and example dependencies: `react-native` 0.85.3, `react-native-permissions` 5.6.3, React Native CLI 20.1.3 (moves the example toolchain off the vulnerable `fast-xml-parser` 4.x, [#3](https://github.com/cengizemre/react-native-permission-gate/issues/3)). The published package has no runtime dependencies, so nothing changes for consumers.

## [0.2.0] - 2026-07-22

### Added

- **App-wide prompt queue** — native permission prompts from every `usePermission` / `usePermissions` / `PermissionGate` (and imperative `requestPermission`) are serialized through a shared queue, so two concurrently mounted gates can no longer fire colliding OS dialogs. Exported as `promptQueue` / `createPromptQueue`.
- **`notificationOptions`** — configure iOS notification authorization (`alert`, `badge`, `sound`, `carPlay`, `criticalAlert`, `provisional`, `providesAppSettings`) per hook or via `PermissionProvider` defaults. Enables quiet provisional delivery.
- **Limited photo access helpers** — `controller.isLimited`, `controller.openLimitedPicker()` and the imperative `openLimitedPicker()` reopen the iOS limited photo picker while `status === 'limited'`. Custom adapters can opt in via the optional `PermissionAdapter.openLimitedPicker`.

### Changed

- `PermissionAdapter.request` now receives an optional second `RequestOptions` argument. Existing custom adapters keep working unchanged (the parameter is optional).

## [0.1.0] - 2026-07-21

### Added

- `usePermission` - headless permission-flow controller: status/phase state machine, rationale gating, blocked → Settings routing, foreground re-validation, in-flight request de-duplication.
- `usePermissions` - aggregate variant for permissions acquired together (shared rationale gate, sequential prompts, `allGranted` / `anyBlocked`).
- `<PermissionGate>` - declarative gate with `rationale` / `blocked` / `fallback` render props and a function-children escape hatch.
- `<PermissionProvider>` - optional shared adapter + default options.
- Imperative helpers: `checkPermission`, `requestPermission`, `openAppSettings`.
- Default adapter backed by `react-native-permissions` with 20 cross-platform permission aliases.
- Full TypeScript types and an adapter-agnostic core testable without a device.
