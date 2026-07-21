import { reactNativePermissionsAdapter } from './adapters/reactNativePermissions';
import type {
  PermissionAdapter,
  PermissionName,
  PermissionStatus,
} from './types';

/**
 * Imperative helpers for use outside React (services, sagas, utilities). These
 * are the raw check/request/openSettings calls with no rationale UX - for the
 * full flow with pre-prompts, use {@link usePermission} or {@link PermissionGate}.
 */

/** Read current status without prompting. */
export function checkPermission(
  name: PermissionName,
  adapter: PermissionAdapter = reactNativePermissionsAdapter
): Promise<PermissionStatus> {
  return adapter.check(name);
}

/** Trigger the native OS prompt and resolve with the resulting status. */
export function requestPermission(
  name: PermissionName,
  adapter: PermissionAdapter = reactNativePermissionsAdapter
): Promise<PermissionStatus> {
  return adapter.request(name);
}

/** Open the OS settings screen for this app. */
export function openAppSettings(
  adapter: PermissionAdapter = reactNativePermissionsAdapter
): Promise<void> {
  return adapter.openSettings();
}
