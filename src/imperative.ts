import { reactNativePermissionsAdapter } from './adapters/reactNativePermissions';
import { promptQueue } from './core/queue';
import type {
  PermissionAdapter,
  PermissionName,
  PermissionStatus,
  RequestOptions,
} from './types';

/**
 * Imperative helpers for use outside React (services, sagas, utilities). These
 * are the raw check/request/openSettings calls with no rationale UX — for the
 * full flow with pre-prompts, use {@link usePermission} or {@link PermissionGate}.
 */

/** Read current status without prompting. */
export function checkPermission(
  name: PermissionName,
  adapter: PermissionAdapter = reactNativePermissionsAdapter
): Promise<PermissionStatus> {
  return adapter.check(name);
}

/**
 * Trigger the native OS prompt and resolve with the resulting status. Goes
 * through the same app-wide prompt queue as the hooks, so imperative requests
 * never collide with a mounted gate's prompt.
 */
export function requestPermission(
  name: PermissionName,
  adapter: PermissionAdapter = reactNativePermissionsAdapter,
  options?: RequestOptions
): Promise<PermissionStatus> {
  return promptQueue.enqueue(() => adapter.request(name, options));
}

/** Open the OS settings screen for this app. */
export function openAppSettings(
  adapter: PermissionAdapter = reactNativePermissionsAdapter
): Promise<void> {
  return adapter.openSettings();
}

/** iOS: reopen the limited photo picker. No-op if the adapter lacks support. */
export function openLimitedPicker(
  adapter: PermissionAdapter = reactNativePermissionsAdapter
): Promise<void> {
  return adapter.openLimitedPicker?.() ?? Promise.resolve();
}
