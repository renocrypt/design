// The journey FSM — ~90 lines, zero libraries.
// States: poster | reveal | travel(n) | station(n) | finale.
// Unguarded events drop silently; the guard table IS the design.

export type StateName = 'poster' | 'reveal' | 'travel' | 'station' | 'finale';
export interface State {
  name: StateName;
  station: number; // 0 when not station-scoped
}

export type Event = 'START' | 'ARRIVED' | 'NEXT' | 'AGAIN' | 'EXIT';

export interface FsmContext {
  enter: (s: State) => void;
}

const GUARDS: Record<string, Partial<Record<Event, State>>> = {
  poster: { START: { name: 'reveal', station: 1 } },
  reveal: { ARRIVED: { name: 'station', station: 1 }, EXIT: { name: 'poster', station: 0 } },
  station: {
    NEXT: { name: 'travel', station: -1 }, // resolved below: station(n)→travel(n+1), station(5)→finale
    EXIT: { name: 'poster', station: 0 },
  },
  travel: {
    ARRIVED: { name: 'station', station: -1 }, // → station(n), n carried
    EXIT: { name: 'poster', station: 0 },
  },
  finale: {
    AGAIN: { name: 'station', station: 1 },
    EXIT: { name: 'poster', station: 0 },
  },
};

export function createFsm(ctx: FsmContext) {
  let state: State = { name: 'poster', station: 0 };

  function dispatch(event: Event): void {
    const table = GUARDS[state.name];
    const next = table?.[event];
    if (!next) return;
    const resolved: State = { ...next };
    if (resolved.station === -1) resolved.station = state.station + (state.name === 'station' ? 1 : 0);
    if (state.name === 'station' && state.station === 5 && event === 'NEXT') {
      resolved.name = 'finale';
      resolved.station = 0;
    }
    state = resolved;
    ctx.enter(state);
  }

  return {
    dispatch,
    state: () => state,
  };
}

export type Fsm = ReturnType<typeof createFsm>;
