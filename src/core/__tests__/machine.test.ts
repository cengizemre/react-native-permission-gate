import { reduce, type MachineState } from '../machine';

const idle = (status: MachineState['status']): MachineState => ({
  status,
  phase: 'idle',
});

describe('machine.reduce', () => {
  describe('REQUEST', () => {
    it('goes straight to requesting when requestable and no rationale', () => {
      const t = reduce(
        idle('requestable'),
        { type: 'REQUEST' },
        {
          rationale: false,
        }
      );
      expect(t.state).toEqual({ status: 'requestable', phase: 'requesting' });
      expect(t.effects).toEqual([{ type: 'runRequest' }]);
    });

    it('enters the rationale phase when requestable and rationale is on', () => {
      const t = reduce(
        idle('requestable'),
        { type: 'REQUEST' },
        {
          rationale: true,
        }
      );
      expect(t.state.phase).toBe('rationale');
      expect(t.effects).toEqual([]);
    });

    it.each(['granted', 'limited', 'blocked', 'unavailable'] as const)(
      'settles immediately (no prompt) when status is %s',
      (status) => {
        const t = reduce(
          idle(status),
          { type: 'REQUEST' },
          { rationale: true }
        );
        expect(t.state).toEqual({ status, phase: 'settled' });
        expect(t.effects).toEqual([{ type: 'resolve', status }]);
      }
    );
  });

  describe('rationale gate', () => {
    it('CONFIRM_RATIONALE moves to requesting and fires the request', () => {
      const t = reduce(
        { status: 'requestable', phase: 'rationale' },
        { type: 'CONFIRM_RATIONALE' },
        { rationale: true }
      );
      expect(t.state.phase).toBe('requesting');
      expect(t.effects).toEqual([{ type: 'runRequest' }]);
    });

    it('CANCEL_RATIONALE returns to idle and resolves with current status', () => {
      const t = reduce(
        { status: 'requestable', phase: 'rationale' },
        { type: 'CANCEL_RATIONALE' },
        { rationale: true }
      );
      expect(t.state).toEqual({ status: 'requestable', phase: 'idle' });
      expect(t.effects).toEqual([{ type: 'resolve', status: 'requestable' }]);
    });

    it('ignores CONFIRM/CANCEL outside the rationale phase', () => {
      expect(
        reduce(
          idle('requestable'),
          { type: 'CONFIRM_RATIONALE' },
          {
            rationale: true,
          }
        ).effects
      ).toEqual([]);
      expect(
        reduce(
          idle('requestable'),
          { type: 'CANCEL_RATIONALE' },
          {
            rationale: true,
          }
        ).effects
      ).toEqual([]);
    });
  });

  describe('results', () => {
    it('REQUEST_RESULT settles and resolves with the new status', () => {
      const t = reduce(
        { status: 'requestable', phase: 'requesting' },
        { type: 'REQUEST_RESULT', status: 'granted' },
        { rationale: false }
      );
      expect(t.state).toEqual({ status: 'granted', phase: 'settled' });
      expect(t.effects).toEqual([{ type: 'resolve', status: 'granted' }]);
    });

    it('CHECK_RESULT / REFRESH_RESULT update status without touching phase', () => {
      const base: MachineState = { status: 'requestable', phase: 'requesting' };
      expect(
        reduce(
          base,
          { type: 'CHECK_RESULT', status: 'blocked' },
          {
            rationale: false,
          }
        ).state
      ).toEqual({ status: 'blocked', phase: 'requesting' });
      expect(
        reduce(
          base,
          { type: 'REFRESH_RESULT', status: 'granted' },
          {
            rationale: false,
          }
        ).state
      ).toEqual({ status: 'granted', phase: 'requesting' });
    });
  });
});
