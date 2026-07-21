import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { reduce, type MachineEvent, type MachineState } from '../core/machine';
import { PermissionContext } from '../context';
import type {
  PermissionController,
  PermissionName,
  PermissionStatus,
  UsePermissionOptions,
} from '../types';

interface Pending {
  promise: Promise<PermissionStatus>;
  resolve: (status: PermissionStatus) => void;
}

/**
 * Headless permission-flow controller. Owns the state machine and wires its
 * effects to the native adapter; renders nothing. Bring your own rationale and
 * "blocked" UI and drive it off `phase` / `status`.
 */
export function usePermission(
  name: PermissionName,
  options: UsePermissionOptions = {}
): PermissionController {
  const ctx = useContext(PermissionContext);

  const rationale = options.rationale ?? ctx.defaults.rationale ?? false;
  const revalidateOnFocus =
    options.revalidateOnFocus ?? ctx.defaults.revalidateOnFocus ?? true;
  const requestOnMount =
    options.requestOnMount ?? ctx.defaults.requestOnMount ?? false;
  const onStatusChange = options.onStatusChange;
  const adapter = options.adapter ?? ctx.adapter;

  const supported = adapter.isSupported(name);

  const neutral = (): MachineState => ({
    status: supported ? 'requestable' : 'unavailable',
    phase: 'idle',
  });

  const [state, setState] = useState<MachineState>(neutral);

  // Mirror volatile values in refs so async effect callbacks read fresh data
  // and the public callbacks stay referentially stable.
  const stateRef = useRef(state);
  stateRef.current = state;
  const rationaleRef = useRef(rationale);
  rationaleRef.current = rationale;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const requestOnMountRef = useRef(requestOnMount);
  requestOnMountRef.current = requestOnMount;

  // Single in-flight request. Dedupes concurrent/double `request()` calls so a
  // double-tap can never orphan a promise or fire two native prompts.
  const pendingRef = useRef<Pending | null>(null);
  const mountedRef = useRef(true);

  const dispatch = useCallback(
    (event: MachineEvent) => {
      const { state: next, effects } = reduce(stateRef.current, event, {
        rationale: rationaleRef.current,
      });
      stateRef.current = next;
      if (mountedRef.current) setState(next);

      for (const effect of effects) {
        if (effect.type === 'resolve') {
          const pending = pendingRef.current;
          pendingRef.current = null;
          pending?.resolve(effect.status);
        } else if (effect.type === 'runRequest') {
          adapter
            .request(name)
            .then((status) =>
              dispatchRef.current({ type: 'REQUEST_RESULT', status })
            )
            .catch(() =>
              dispatchRef.current({
                type: 'REQUEST_RESULT',
                status: stateRef.current.status,
              })
            );
        }
      }
    },
    [adapter, name]
  );
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const request = useCallback(() => {
    // Reuse the in-flight promise instead of starting a second flow.
    if (pendingRef.current) return pendingRef.current.promise;
    let resolve!: (status: PermissionStatus) => void;
    const promise = new Promise<PermissionStatus>((r) => {
      resolve = r;
    });
    pendingRef.current = { promise, resolve };
    dispatchRef.current({ type: 'REQUEST' });
    return promise;
  }, []);
  const requestRef = useRef(request);
  requestRef.current = request;

  const confirmRationale = useCallback(
    () => dispatchRef.current({ type: 'CONFIRM_RATIONALE' }),
    []
  );

  const cancelRationale = useCallback(
    () => dispatchRef.current({ type: 'CANCEL_RATIONALE' }),
    []
  );

  const refresh = useCallback(async () => {
    if (!supported) return 'unavailable' as PermissionStatus;
    const status = await adapter.check(name);
    dispatchRef.current({ type: 'REFRESH_RESULT', status });
    return status;
  }, [adapter, name, supported]);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const openSettings = useCallback(() => adapter.openSettings(), [adapter]);

  // Initial check on mount and whenever the permission identity changes. On a
  // change we reset to a neutral state first so a stale status never lingers.
  const firstRunRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    if (!firstRunRef.current) {
      const reset = neutral();
      stateRef.current = reset;
      setState(reset);
      pendingRef.current = null;
    }
    firstRunRef.current = false;

    if (supported) {
      adapter
        .check(name)
        .then((status) => {
          dispatchRef.current({ type: 'CHECK_RESULT', status });
          if (requestOnMountRef.current) requestRef.current();
        })
        .catch(() => {});
    }
    return () => {
      mountedRef.current = false;
    };
    // `neutral` is derived from supported; requestOnMount is read via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, name, supported]);

  // Re-check when the app returns to the foreground.
  useEffect(() => {
    if (!revalidateOnFocus || !supported) return;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') refreshRef.current();
    });
    return () => sub.remove();
  }, [revalidateOnFocus, supported]);

  // Notify on resolved-status changes.
  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    if (prevStatusRef.current !== state.status) {
      prevStatusRef.current = state.status;
      onStatusChangeRef.current?.(state.status);
    }
  }, [state.status]);

  return useMemo<PermissionController>(
    () => ({
      status: state.status,
      phase: state.phase,
      isGranted: state.status === 'granted',
      isBlocked: state.status === 'blocked',
      request,
      confirmRationale,
      cancelRationale,
      openSettings,
      refresh,
    }),
    [
      state.status,
      state.phase,
      request,
      confirmRationale,
      cancelRationale,
      openSettings,
      refresh,
    ]
  );
}
