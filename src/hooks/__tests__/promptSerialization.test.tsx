import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePermission } from '../usePermission';
import type {
  NotificationOption,
  PermissionAdapter,
  PermissionStatus,
  RequestOptions,
} from '../../types';

const wait = (ms: number) =>
  new Promise<void>((r) => setTimeout(() => r(), ms));
const noFocus = { revalidateOnFocus: false };

describe('prompt serialization across hooks', () => {
  it('never overlaps native prompts from concurrently requesting hooks', async () => {
    let active = 0;
    let maxActive = 0;

    const slowAdapter: PermissionAdapter = {
      isSupported: () => true,
      check: async () => 'requestable',
      request: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await wait(15);
        active -= 1;
        return 'granted';
      },
      openSettings: async () => {},
    };

    const camera = renderHook(() =>
      usePermission('camera', { adapter: slowAdapter, ...noFocus })
    );
    const mic = renderHook(() =>
      usePermission('microphone', { adapter: slowAdapter, ...noFocus })
    );
    await waitFor(() =>
      expect(camera.result.current.status).toBe('requestable')
    );
    await waitFor(() => expect(mic.result.current.status).toBe('requestable'));

    let a!: Promise<PermissionStatus>;
    let b!: Promise<PermissionStatus>;
    await act(async () => {
      a = camera.result.current.request();
      b = mic.result.current.request();
      await Promise.all([a, b]);
    });

    expect(await a).toBe('granted');
    expect(await b).toBe('granted');
    expect(maxActive).toBe(1);
  });
});

describe('notification options', () => {
  function capturingAdapter() {
    const seen: Array<RequestOptions | undefined> = [];
    const adapter: PermissionAdapter = {
      isSupported: () => true,
      check: async () => 'requestable',
      request: async (_name, options) => {
        seen.push(options);
        return 'granted';
      },
      openSettings: async () => {},
    };
    return { adapter, seen };
  }

  it('forwards notificationOptions to the adapter request', async () => {
    const { adapter, seen } = capturingAdapter();
    const opts: NotificationOption[] = ['alert', 'provisional'];

    const { result } = renderHook(() =>
      usePermission('notifications', {
        adapter,
        notificationOptions: opts,
        ...noFocus,
      })
    );
    await waitFor(() => expect(result.current.status).toBe('requestable'));

    await act(async () => {
      await result.current.request();
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.notificationOptions).toEqual(['alert', 'provisional']);
  });
});

describe('limited photo access', () => {
  it('exposes isLimited and calls the adapter picker', async () => {
    const openLimitedPicker = jest.fn(async () => {});
    const adapter: PermissionAdapter = {
      isSupported: () => true,
      check: async () => 'limited',
      request: async () => 'limited',
      openSettings: async () => {},
      openLimitedPicker,
    };

    const { result } = renderHook(() =>
      usePermission('photoLibrary', { adapter, ...noFocus })
    );
    await waitFor(() => expect(result.current.isLimited).toBe(true));

    await act(async () => {
      await result.current.openLimitedPicker();
    });
    expect(openLimitedPicker).toHaveBeenCalledTimes(1);
  });

  it('resolves silently when the adapter has no picker support', async () => {
    const adapter: PermissionAdapter = {
      isSupported: () => true,
      check: async () => 'limited',
      request: async () => 'limited',
      openSettings: async () => {},
    };

    const { result } = renderHook(() =>
      usePermission('photoLibrary', { adapter, ...noFocus })
    );
    await waitFor(() => expect(result.current.isLimited).toBe(true));

    await expect(result.current.openLimitedPicker()).resolves.toBeUndefined();
  });
});
