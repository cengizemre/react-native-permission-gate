import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { PermissionContext } from '../context';
import type {
  FlowPhase,
  PermissionName,
  PermissionStatus,
  UsePermissionOptions,
} from '../types';

export type PermissionStatusMap = Partial<
  Record<PermissionName, PermissionStatus>
>;

export interface PermissionsController {
  /** Current status per requested permission. */
  statuses: PermissionStatusMap;
  /** Shared flow position for the batch. */
  phase: FlowPhase;
  /** Every requested permission is `granted`. */
  allGranted: boolean;
  /** At least one requested permission is `blocked`. */
  anyBlocked: boolean;
  /**
   * Run the flow for every not-yet-granted permission behind a single shared
   * rationale gate. Prompts are shown one after another. Resolves with the
   * final status map.
   */
  request: () => Promise<PermissionStatusMap>;
  /** Proceed from the shared `rationale` phase to the prompts. */
  confirmRationale: () => void;
  /** Abort the shared `rationale` phase. */
  cancelRationale: () => void;
  openSettings: () => Promise<void>;
  refresh: () => Promise<PermissionStatusMap>;
}

interface Pending {
  promise: Promise<PermissionStatusMap>;
  resolve: (map: PermissionStatusMap) => void;
}

/**
 * Aggregate variant of {@link usePermission} for permissions acquired together
 * (e.g. camera + microphone for video). One shared rationale gate, one
 * `request()`, one status map. The `names` array is treated as a stable set -
 * pass a constant or memoized array.
 */
export function usePermissions(
  names: PermissionName[],
  options: UsePermissionOptions = {}
): PermissionsController {
  const ctx = useContext(PermissionContext);
  const rationale = options.rationale ?? ctx.defaults.rationale ?? false;
  const revalidateOnFocus =
    options.revalidateOnFocus ?? ctx.defaults.revalidateOnFocus ?? true;
  const requestOnMount =
    options.requestOnMount ?? ctx.defaults.requestOnMount ?? false;
  const adapter = options.adapter ?? ctx.adapter;

  // Stable identity for the set so effects don't re-run on every new array.
  const key = names.join(',');

  const buildInitial = useCallback((): PermissionStatusMap => {
    const map: PermissionStatusMap = {};
    for (const name of names) {
      map[name] = adapter.isSupported(name) ? 'requestable' : 'unavailable';
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, key]);

  const [statuses, setStatuses] = useState<PermissionStatusMap>(buildInitial);
  const [phase, setPhase] = useState<FlowPhase>('idle');

  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const rationaleRef = useRef(rationale);
  rationaleRef.current = rationale;
  const requestOnMountRef = useRef(requestOnMount);
  requestOnMountRef.current = requestOnMount;

  const pendingRef = useRef<Pending | null>(null);
  const requestableRef = useRef<PermissionName[]>([]);
  const mountedRef = useRef(true);

  const commit = useCallback((next: PermissionStatusMap) => {
    statusesRef.current = next;
    if (mountedRef.current) setStatuses(next);
  }, []);

  const settle = useCallback(() => {
    if (mountedRef.current) setPhase('settled');
    const pending = pendingRef.current;
    pendingRef.current = null;
    pending?.resolve(statusesRef.current);
  }, []);

  const runBatch = useCallback(
    async (list: PermissionName[]) => {
      if (mountedRef.current) setPhase('requesting');
      for (const name of list) {
        try {
          const status = await adapter.request(name);
          commit({ ...statusesRef.current, [name]: status });
        } catch {
          // Keep the previous status for this permission on failure.
        }
      }
      settle();
    },
    [adapter, commit, settle]
  );
  const runBatchRef = useRef(runBatch);
  runBatchRef.current = runBatch;

  const request = useCallback(() => {
    if (pendingRef.current) return pendingRef.current.promise;

    let resolve!: (map: PermissionStatusMap) => void;
    const promise = new Promise<PermissionStatusMap>((r) => {
      resolve = r;
    });
    pendingRef.current = { promise, resolve };

    const requestable = names.filter(
      (name) => statusesRef.current[name] === 'requestable'
    );
    requestableRef.current = requestable;

    if (requestable.length === 0) {
      settle();
    } else if (rationaleRef.current) {
      if (mountedRef.current) setPhase('rationale');
    } else {
      runBatchRef.current(requestable);
    }
    return promise;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, settle]);
  const requestRef = useRef(request);
  requestRef.current = request;

  const confirmRationale = useCallback(() => {
    if (phaseRef.current !== 'rationale') return;
    runBatchRef.current(requestableRef.current);
  }, []);

  const cancelRationale = useCallback(() => {
    if (phaseRef.current !== 'rationale') return;
    if (mountedRef.current) setPhase('idle');
    const pending = pendingRef.current;
    pendingRef.current = null;
    pending?.resolve(statusesRef.current);
  }, []);

  const refresh = useCallback(async () => {
    const entries = await Promise.all(
      names.map(async (name) => {
        if (!adapter.isSupported(name)) {
          return [name, 'unavailable'] as const;
        }
        return [name, await adapter.check(name)] as const;
      })
    );
    const next: PermissionStatusMap = {};
    for (const [name, status] of entries) next[name] = status;
    commit(next);
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, key, commit]);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const openSettings = useCallback(() => adapter.openSettings(), [adapter]);

  // Initial check on mount / when the set changes.
  const firstRunRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    if (!firstRunRef.current) {
      commit(buildInitial());
      setPhase('idle');
      pendingRef.current = null;
    }
    firstRunRef.current = false;

    refreshRef.current().then(() => {
      if (requestOnMountRef.current) requestRef.current();
    });

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Re-check on foreground.
  useEffect(() => {
    if (!revalidateOnFocus) return;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') refreshRef.current();
    });
    return () => sub.remove();
  }, [revalidateOnFocus]);

  return useMemo<PermissionsController>(() => {
    const allGranted = names.every((name) => statuses[name] === 'granted');
    const anyBlocked = names.some((name) => statuses[name] === 'blocked');
    return {
      statuses,
      phase,
      allGranted,
      anyBlocked,
      request,
      confirmRationale,
      cancelRationale,
      openSettings,
      refresh,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    key,
    statuses,
    phase,
    request,
    confirmRationale,
    cancelRationale,
    openSettings,
    refresh,
  ]);
}
