// Hooks — the primary, headless API.
export { usePermission } from './hooks/usePermission';
export { usePermissions } from './hooks/usePermissions';
export type {
  PermissionsController,
  PermissionStatusMap,
} from './hooks/usePermissions';

// Declarative convenience.
export { PermissionGate } from './components/PermissionGate';
export type {
  PermissionGateProps,
  RationaleControls,
  BlockedControls,
} from './components/PermissionGate';

// Provider — optional shared adapter + default options.
export { PermissionProvider, PermissionContext } from './context';
export type {
  PermissionProviderProps,
  PermissionContextValue,
  PermissionDefaults,
} from './context';

// Imperative helpers for use outside React.
export {
  checkPermission,
  requestPermission,
  openAppSettings,
} from './imperative';

// Default adapter (override via options.adapter or PermissionProvider).
export { reactNativePermissionsAdapter } from './adapters/reactNativePermissions';

export type {
  PermissionName,
  PermissionStatus,
  FlowPhase,
  PermissionController,
  PermissionAdapter,
  UsePermissionOptions,
} from './types';
