import type { FlowPhase, PermissionStatus } from '../types';

/**
 * Pure, framework-free state machine that drives the permission UX flow.
 *
 * It has zero React and zero native dependencies: given the current state and an
 * event, it returns the next state plus a list of side effects for the caller to
 * interpret. This is what makes the whole flow unit-testable without a device.
 */
export interface MachineState {
  status: PermissionStatus;
  phase: FlowPhase;
}

export type MachineEvent =
  | { type: 'REQUEST' }
  | { type: 'CONFIRM_RATIONALE' }
  | { type: 'CANCEL_RATIONALE' }
  | { type: 'REQUEST_RESULT'; status: PermissionStatus }
  | { type: 'CHECK_RESULT'; status: PermissionStatus }
  | { type: 'REFRESH_RESULT'; status: PermissionStatus };

export type MachineEffect =
  /** Fire the adapter's native `request()`. */
  | { type: 'runRequest' }
  /** Resolve the pending `request()` promise with a final status. */
  | { type: 'resolve'; status: PermissionStatus };

export interface MachineContext {
  rationale: boolean;
}

export interface Transition {
  state: MachineState;
  effects: MachineEffect[];
}

const noop = (state: MachineState): Transition => ({ state, effects: [] });

export function reduce(
  state: MachineState,
  event: MachineEvent,
  ctx: MachineContext
): Transition {
  switch (event.type) {
    case 'REQUEST': {
      // Only `requestable` can produce an OS prompt. Every other status is
      // terminal for a request (granted/limited/blocked/unavailable): settle
      // immediately so callers can react (e.g. show a "go to Settings" UI when
      // blocked) without a dead-end.
      if (state.status !== 'requestable') {
        return {
          state: { ...state, phase: 'settled' },
          effects: [{ type: 'resolve', status: state.status }],
        };
      }
      if (ctx.rationale) {
        return { state: { ...state, phase: 'rationale' }, effects: [] };
      }
      return {
        state: { ...state, phase: 'requesting' },
        effects: [{ type: 'runRequest' }],
      };
    }

    case 'CONFIRM_RATIONALE': {
      if (state.phase !== 'rationale') return noop(state);
      return {
        state: { ...state, phase: 'requesting' },
        effects: [{ type: 'runRequest' }],
      };
    }

    case 'CANCEL_RATIONALE': {
      if (state.phase !== 'rationale') return noop(state);
      return {
        state: { ...state, phase: 'idle' },
        effects: [{ type: 'resolve', status: state.status }],
      };
    }

    case 'REQUEST_RESULT': {
      return {
        state: { status: event.status, phase: 'settled' },
        effects: [{ type: 'resolve', status: event.status }],
      };
    }

    case 'CHECK_RESULT':
    case 'REFRESH_RESULT': {
      // Update the known status without disturbing an in-flight phase.
      return noop({ ...state, status: event.status });
    }

    default:
      return noop(state);
  }
}
