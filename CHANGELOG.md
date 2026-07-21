# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-21

### Added

- `usePermission` - headless permission-flow controller: status/phase state machine, rationale gating, blocked → Settings routing, foreground re-validation, in-flight request de-duplication.
- `usePermissions` - aggregate variant for permissions acquired together (shared rationale gate, sequential prompts, `allGranted` / `anyBlocked`).
- `<PermissionGate>` - declarative gate with `rationale` / `blocked` / `fallback` render props and a function-children escape hatch.
- `<PermissionProvider>` - optional shared adapter + default options.
- Imperative helpers: `checkPermission`, `requestPermission`, `openAppSettings`.
- Default adapter backed by `react-native-permissions` with 20 cross-platform permission aliases.
- Full TypeScript types and an adapter-agnostic core testable without a device.
