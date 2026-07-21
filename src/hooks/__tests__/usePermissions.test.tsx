import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePermissions } from '../usePermissions';
import type {
  PermissionAdapter,
  PermissionName,
  PermissionStatus,
} from '../../types';

type StatusMap = Partial<Record<PermissionName, PermissionStatus>>;

interface MultiMock extends PermissionAdapter {
  check: jest.Mock;
  request: jest.Mock;
}

function multiMock(cfg: {
  initial: StatusMap;
  afterRequest?: StatusMap;
  unsupported?: PermissionName[];
}): MultiMock {
  const statuses: StatusMap = { ...cfg.initial };
  const unsupported = new Set(cfg.unsupported ?? []);
  const check = jest.fn(
    async (name: PermissionName) => statuses[name] ?? 'requestable'
  );
  const request = jest.fn(async (name: PermissionName) => {
    const after = cfg.afterRequest?.[name];
    if (after) statuses[name] = after;
    return statuses[name] ?? 'requestable';
  });
  return {
    isSupported: (name) => !unsupported.has(name),
    check,
    request,
    openSettings: jest.fn(async () => {}),
  };
}

const noFocus = { revalidateOnFocus: false };

describe('usePermissions', () => {
  it('checks every permission on mount and aggregates allGranted', async () => {
    const adapter = multiMock({
      initial: { camera: 'granted', microphone: 'requestable' },
    });
    const { result } = renderHook(() =>
      usePermissions(['camera', 'microphone'], { adapter, ...noFocus })
    );

    await waitFor(() => expect(result.current.statuses.camera).toBe('granted'));
    expect(result.current.statuses.microphone).toBe('requestable');
    expect(result.current.allGranted).toBe(false);
  });

  it('requests only the not-yet-granted permissions', async () => {
    const adapter = multiMock({
      initial: { camera: 'granted', microphone: 'requestable' },
      afterRequest: { microphone: 'granted' },
    });
    const { result } = renderHook(() =>
      usePermissions(['camera', 'microphone'], { adapter, ...noFocus })
    );
    await waitFor(() =>
      expect(result.current.statuses.microphone).toBe('requestable')
    );

    let promise!: Promise<StatusMap>;
    await act(async () => {
      promise = result.current.request();
      await promise;
    });

    expect(result.current.allGranted).toBe(true);
    expect(adapter.request).toHaveBeenCalledTimes(1);
    expect(adapter.request).toHaveBeenCalledWith('microphone');
    expect(await promise).toEqual(
      expect.objectContaining({ camera: 'granted', microphone: 'granted' })
    );
  });

  it('drives the shared rationale gate → confirm', async () => {
    const adapter = multiMock({
      initial: { camera: 'requestable', microphone: 'requestable' },
      afterRequest: { camera: 'granted', microphone: 'granted' },
    });
    const { result } = renderHook(() =>
      usePermissions(['camera', 'microphone'], {
        adapter,
        rationale: true,
        ...noFocus,
      })
    );
    await waitFor(() =>
      expect(result.current.statuses.camera).toBe('requestable')
    );

    let promise!: Promise<StatusMap>;
    await act(async () => {
      promise = result.current.request();
    });
    await waitFor(() => expect(result.current.phase).toBe('rationale'));
    expect(adapter.request).not.toHaveBeenCalled();

    await act(async () => {
      result.current.confirmRationale();
      await promise;
    });

    expect(result.current.allGranted).toBe(true);
    expect(adapter.request).toHaveBeenCalledTimes(2);
  });

  it('cancels the shared rationale without prompting', async () => {
    const adapter = multiMock({
      initial: { camera: 'requestable', microphone: 'requestable' },
    });
    const { result } = renderHook(() =>
      usePermissions(['camera', 'microphone'], {
        adapter,
        rationale: true,
        ...noFocus,
      })
    );
    await waitFor(() =>
      expect(result.current.statuses.camera).toBe('requestable')
    );

    let promise!: Promise<StatusMap>;
    await act(async () => {
      promise = result.current.request();
    });
    await waitFor(() => expect(result.current.phase).toBe('rationale'));

    await act(async () => {
      result.current.cancelRationale();
      await promise;
    });

    expect(result.current.phase).toBe('idle');
    expect(adapter.request).not.toHaveBeenCalled();
  });

  it('reports anyBlocked and marks unsupported permissions unavailable', async () => {
    const adapter = multiMock({
      initial: { camera: 'blocked', microphone: 'granted' },
      unsupported: ['faceId'],
    });
    const { result } = renderHook(() =>
      usePermissions(['camera', 'microphone', 'faceId'], {
        adapter,
        ...noFocus,
      })
    );

    await waitFor(() => expect(result.current.anyBlocked).toBe(true));
    expect(result.current.statuses.faceId).toBe('unavailable');
    expect(result.current.allGranted).toBe(false);
  });
});
