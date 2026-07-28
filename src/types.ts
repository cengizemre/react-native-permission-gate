/**
 * The OS-level truth about a permission, normalized across platforms.
 *
 * - `granted`      — access is allowed.
 * - `limited`      — partial access (iOS: e.g. selected photos / contacts).
 * - `requestable`  — not granted yet, but the OS prompt can still be shown.
 * - `blocked`      — denied and the OS will no longer prompt; only Settings helps.
 * - `unavailable`  — the capability does not exist on this device/build.
 */
export type PermissionStatus =
  'granted' | 'limited' | 'requestable' | 'blocked' | 'unavailable';

/**
 * Where the request flow currently sits. Independent from {@link PermissionStatus}:
 * `status` is the OS truth, `phase` is the position in the UX state machine.
 *
 * - `idle`        — nothing in flight.
 * - `rationale`   — pre-prompt is shown, awaiting the user's decision.
 * - `requesting`  — the native OS dialog is up.
 * - `settled`     — the flow finished; read `status` for the outcome.
 */
export type FlowPhase = 'idle' | 'rationale' | 'requesting' | 'settled';

/**
 * Cross-platform permission aliases. Each maps to the correct native permission
 * per platform inside the adapter. Aliases with no meaning on the current
 * platform resolve to `unavailable`.
 */
export type PermissionName =
  | 'camera'
  | 'microphone'
  | 'photoLibrary'
  | 'photoLibraryAddOnly'
  | 'mediaLibrary'
  | 'contacts'
  | 'calendar'
  | 'calendarWriteOnly'
  | 'reminders'
  | 'locationWhenInUse'
  | 'locationAlways'
  | 'notifications'
  | 'bluetooth'
  | 'motion'
  | 'speechRecognition'
  | 'appTrackingTransparency'
  | 'bodySensors'
  | 'storageReadAudio'
  | 'storageReadVideo'
  | 'faceId'
  | 'nearbyWifiDevices';

/**
 * iOS notification-authorization options for `notifications` requests.
 * `provisional` delivers quietly without a prompt (iOS 12+); `criticalAlert`
 * requires a special Apple entitlement. Ignored on Android.
 */
export type NotificationOption =
  | 'alert'
  | 'badge'
  | 'sound'
  | 'carPlay'
  | 'criticalAlert'
  | 'provisional'
  | 'providesAppSettings';

/** Extra context forwarded to {@link PermissionAdapter.request}. */
export interface RequestOptions {
  /** Options for `notifications` requests. Default: `['alert', 'sound', 'badge']`. */
  notificationOptions?: NotificationOption[];
}

/**
 * Backend that performs the actual native permission calls. The core state
 * machine is adapter-agnostic, which keeps it fully unit-testable without any
 * native module. The default adapter is built on `react-native-permissions`.
 */
export interface PermissionAdapter {
  /** Whether the alias is meaningful on the current platform. */
  isSupported(name: PermissionName): boolean;
  /** Read current status without prompting. */
  check(name: PermissionName): Promise<PermissionStatus>;
  /** Trigger the native OS prompt and resolve with the resulting status. */
  request(
    name: PermissionName,
    options?: RequestOptions
  ): Promise<PermissionStatus>;
  /** Open the OS settings screen for this app. */
  openSettings(): Promise<void>;
  /**
   * iOS: reopen the limited photo-library picker so the user can adjust their
   * selection while `photoLibrary` is `limited`. Optional — adapters without
   * the capability may omit it.
   */
  openLimitedPicker?(): Promise<void>;
}

export interface UsePermissionOptions {
  /**
   * Gate the native prompt behind a `rationale` phase so you can show a
   * pre-prompt explanation first. When `true`, `request()` moves to
   * `phase: 'rationale'` and waits for `confirmRationale()` / `cancelRationale()`.
   * @default false
   */
  rationale?: boolean;
  /**
   * Re-check status when the app returns to the foreground — catches changes the
   * user made in the OS Settings screen.
   * @default true
   */
  revalidateOnFocus?: boolean;
  /**
   * Run the full request flow automatically on mount.
   * @default false
   */
  requestOnMount?: boolean;
  /**
   * iOS notification-authorization options used when requesting `notifications`.
   * @default ['alert', 'sound', 'badge']
   */
  notificationOptions?: NotificationOption[];
  /** Called whenever the resolved {@link PermissionStatus} changes. */
  onStatusChange?: (status: PermissionStatus) => void;
  /** Override the backend. Defaults to the `react-native-permissions` adapter. */
  adapter?: PermissionAdapter;
}

/** The headless controller returned by {@link usePermission}. */
export interface PermissionController {
  status: PermissionStatus;
  phase: FlowPhase;
  /** Convenience: `status === 'granted'`. */
  isGranted: boolean;
  /** Convenience: `status === 'limited'` (iOS partial access). */
  isLimited: boolean;
  /** Convenience: `status === 'blocked'`. */
  isBlocked: boolean;
  /**
   * Run the flow: check → (rationale gate) → native prompt → settle. The promise
   * resolves with the final status once the whole flow finishes, so it works
   * both imperatively (`await request()`) and declaratively (render on `phase`).
   */
  request: () => Promise<PermissionStatus>;
  /** Proceed from the `rationale` phase to the native prompt. */
  confirmRationale: () => void;
  /** Abort the `rationale` phase and return to `idle`. */
  cancelRationale: () => void;
  /** Open the OS settings screen for this app. */
  openSettings: () => Promise<void>;
  /**
   * iOS: reopen the limited photo picker while `status === 'limited'`. No-op if
   * the adapter doesn't support it.
   */
  openLimitedPicker: () => Promise<void>;
  /** Re-check status on demand (also happens automatically on focus). */
  refresh: () => Promise<PermissionStatus>;
}
