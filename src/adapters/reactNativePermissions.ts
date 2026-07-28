import { Platform } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  request,
  checkNotifications,
  requestNotifications,
  openSettings,
  openPhotoPicker,
  type Permission,
  type PermissionStatus as RNPermissionStatus,
} from 'react-native-permissions';
import type {
  PermissionAdapter,
  PermissionName,
  PermissionStatus,
} from '../types';

type NativeMap = Partial<Record<PermissionName, Permission>>;

const IOS: NativeMap = {
  camera: PERMISSIONS.IOS.CAMERA,
  microphone: PERMISSIONS.IOS.MICROPHONE,
  photoLibrary: PERMISSIONS.IOS.PHOTO_LIBRARY,
  photoLibraryAddOnly: PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY,
  mediaLibrary: PERMISSIONS.IOS.MEDIA_LIBRARY,
  contacts: PERMISSIONS.IOS.CONTACTS,
  calendar: PERMISSIONS.IOS.CALENDARS,
  calendarWriteOnly: PERMISSIONS.IOS.CALENDARS_WRITE_ONLY,
  reminders: PERMISSIONS.IOS.REMINDERS,
  locationWhenInUse: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
  locationAlways: PERMISSIONS.IOS.LOCATION_ALWAYS,
  bluetooth: PERMISSIONS.IOS.BLUETOOTH,
  motion: PERMISSIONS.IOS.MOTION,
  speechRecognition: PERMISSIONS.IOS.SPEECH_RECOGNITION,
  appTrackingTransparency: PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY,
  faceId: PERMISSIONS.IOS.FACE_ID,
  // Android-only aliases (storageReadAudio, storageReadVideo, bodySensors)
  // resolve to unavailable here.
};

const ANDROID: NativeMap = {
  camera: PERMISSIONS.ANDROID.CAMERA,
  microphone: PERMISSIONS.ANDROID.RECORD_AUDIO,
  photoLibrary: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
  storageReadAudio: PERMISSIONS.ANDROID.READ_MEDIA_AUDIO,
  storageReadVideo: PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
  contacts: PERMISSIONS.ANDROID.READ_CONTACTS,
  calendar: PERMISSIONS.ANDROID.READ_CALENDAR,
  calendarWriteOnly: PERMISSIONS.ANDROID.WRITE_CALENDAR,
  locationWhenInUse: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  locationAlways: PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
  bluetooth: PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
  motion: PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION,
  bodySensors: PERMISSIONS.ANDROID.BODY_SENSORS,
  nearbyWifiDevices: PERMISSIONS.ANDROID.NEARBY_WIFI_DEVICES,
  // iOS-only aliases (photoLibraryAddOnly, mediaLibrary, reminders,
  // speechRecognition, appTrackingTransparency, faceId) → unavailable here.
};

const TABLE: NativeMap =
  Platform.OS === 'ios' ? IOS : Platform.OS === 'android' ? ANDROID : {};

const DEFAULT_NOTIFICATION_OPTIONS = ['alert', 'sound', 'badge'] as const;

function toStatus(result: RNPermissionStatus): PermissionStatus {
  switch (result) {
    case RESULTS.GRANTED:
      return 'granted';
    case RESULTS.LIMITED:
      return 'limited';
    case RESULTS.BLOCKED:
      return 'blocked';
    case RESULTS.DENIED:
      return 'requestable';
    case RESULTS.UNAVAILABLE:
    default:
      return 'unavailable';
  }
}

/**
 * Default adapter, backed by `react-native-permissions`. Notifications are a
 * special case in the native library (a dedicated check/request API) and are
 * routed accordingly.
 */
export const reactNativePermissionsAdapter: PermissionAdapter = {
  isSupported(name) {
    if (name === 'notifications') {
      return Platform.OS === 'ios' || Platform.OS === 'android';
    }
    return TABLE[name] !== undefined;
  },

  async check(name) {
    if (name === 'notifications') {
      const { status } = await checkNotifications();
      return toStatus(status);
    }
    const native = TABLE[name];
    if (!native) return 'unavailable';
    return toStatus(await check(native));
  },

  async request(name, options) {
    if (name === 'notifications') {
      const { status } = await requestNotifications(
        options?.notificationOptions ?? [...DEFAULT_NOTIFICATION_OPTIONS]
      );
      return toStatus(status);
    }
    const native = TABLE[name];
    if (!native) return 'unavailable';
    return toStatus(await request(native));
  },

  async openSettings() {
    await openSettings();
  },

  async openLimitedPicker() {
    if (Platform.OS !== 'ios') return;
    await openPhotoPicker();
  },
};
