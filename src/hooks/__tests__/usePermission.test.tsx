import { AppState } from 'react-native';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePermission } from '../usePermission';
import type { PermissionAdapter, PermissionStatus } from '../../types';

interface MockAdapter extends PermissionAdapter {
  check: jest.Mock<Promise<PermissionStatus>, []>;
  request: jest.Mock<Promise<PermissionStatus>, []>;
  openSettings: jest.Mock<Promise<void>, []>;
  setStatus: (status: PermissionStatus) => void;
}

function mockAdapter(opts: {
  initial: PermissionStatus;
  afterRequest?: PermissionStatus;
  supported?: boolean;
}): MockAdapter {
  let status = opts.initial;
  const check = jest.fn(async () => status);
  const request = jest.fn(async () => {
    if (opts.afterRequest) status = opts.afterRequest;
    return status;
  });
  const openSettings = jest.fn(async () => {});
  return {
    isSupported: () => opts.supported ?? true,
    check,
    request,
    openSettings,
    setStatus: (s) => {
      status = s;
    },
  };
}

// Focus revalidation is exercised explicitly per-test; silence it elsewhere.
const noFocus = { revalidateOnFocus: false };

describe('usePermission', () => {
  it('runs an initial check and reflects the status', async () => {
    const adapter = mockAdapter({ initial: 'granted' });
    const { result } = renderHook(() =>
      usePermission('camera', { adapter, ...noFocus })
    );

    await waitFor(() => expect(result.current.status).toBe('granted'));
    expect(result.current.isGranted).toBe(true);
    expect(adapter.check).toHaveBeenCalledTimes(1);
  });

  it('drives the rationale → confirm → granted flow and resolves request()', async () => {
    const adapter = mockAdapter({
      initial: 'requestable',
      afterRequest: 'granted',
    });
    const { result } = renderHook(() =>
      usePermission('camera', { adapter, rationale: true, ...noFocus })
    );
    await waitFor(() => expect(result.current.status).toBe('requestable'));

    let promise!: Promise<PermissionStatus>;
    await act(async () => {
      promise = result.current.request();
    });
    await waitFor(() => expect(result.current.phase).toBe('rationale'));
    expect(adapter.request).not.toHaveBeenCalled();

    await act(async () => {
      result.current.confirmRationale();
      await promise;
    });

    expect(await promise).toBe('granted');
    expect(result.current.status).toBe('granted');
    expect(adapter.request).toHaveBeenCalledTimes(1);
  });

  it('cancels the rationale without prompting and resolves with the current status', async () => {
    const adapter = mockAdapter({ initial: 'requestable' });
    const { result } = renderHook(() =>
      usePermission('camera', { adapter, rationale: true, ...noFocus })
    );
    await waitFor(() => expect(result.current.status).toBe('requestable'));

    let promise!: Promise<PermissionStatus>;
    await act(async () => {
      promise = result.current.request();
    });
    await waitFor(() => expect(result.current.phase).toBe('rationale'));

    await act(async () => {
      result.current.cancelRationale();
      await promise;
    });

    expect(await promise).toBe('requestable');
    expect(result.current.phase).toBe('idle');
    expect(adapter.request).not.toHaveBeenCalled();
  });

  it('never prompts when already blocked and exposes isBlocked', async () => {
    const adapter = mockAdapter({ initial: 'blocked' });
    const { result } = renderHook(() =>
      usePermission('camera', { adapter, ...noFocus })
    );
    await waitFor(() => expect(result.current.isBlocked).toBe(true));

    let promise!: Promise<PermissionStatus>;
    await act(async () => {
      promise = result.current.request();
      await promise;
    });

    expect(await promise).toBe('blocked');
    expect(adapter.request).not.toHaveBeenCalled();
  });

  it('dedupes concurrent request() calls into a single native prompt', async () => {
    const adapter = mockAdapter({
      initial: 'requestable',
      afterRequest: 'granted',
    });
    const { result } = renderHook(() =>
      usePermission('camera', { adapter, ...noFocus })
    );
    await waitFor(() => expect(result.current.status).toBe('requestable'));

    let a!: Promise<PermissionStatus>;
    let b!: Promise<PermissionStatus>;
    await act(async () => {
      a = result.current.request();
      b = result.current.request();
      await Promise.all([a, b]);
    });

    expect(await a).toBe('granted');
    expect(await b).toBe('granted');
    expect(adapter.request).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable for unsupported permissions and skips the prompt', async () => {
    const adapter = mockAdapter({ initial: 'requestable', supported: false });
    const { result } = renderHook(() =>
      usePermission('faceId', { adapter, ...noFocus })
    );
    expect(result.current.status).toBe('unavailable');

    let promise!: Promise<PermissionStatus>;
    await act(async () => {
      promise = result.current.request();
      await promise;
    });

    expect(await promise).toBe('unavailable');
    expect(adapter.request).not.toHaveBeenCalled();
    expect(adapter.check).not.toHaveBeenCalled();
  });

  it('re-checks status when the app returns to the foreground', async () => {
    let handler: ((s: string) => void) | undefined;
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _event: string,
      cb: (s: string) => void
    ) => {
      handler = cb;
      return { remove: jest.fn() };
    }) as unknown as typeof AppState.addEventListener);

    const adapter = mockAdapter({ initial: 'requestable' });
    const { result } = renderHook(() =>
      usePermission('camera', { adapter, revalidateOnFocus: true })
    );
    await waitFor(() => expect(adapter.check).toHaveBeenCalledTimes(1));

    adapter.setStatus('granted');
    await act(async () => {
      handler?.('active');
    });

    await waitFor(() => expect(result.current.status).toBe('granted'));
    expect(adapter.check).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
