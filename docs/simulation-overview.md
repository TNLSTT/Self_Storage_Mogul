# Simulation Overview

The Self Storage Mogul prototype advances the game state once per in-game day. Each tick runs inside the `requestAnimationFrame`
loop exposed by `src/lib/stores/game.ts` and is implemented in `src/lib/simulation/tick.ts`.

## Tick Flow

1. **Cooldowns** – Decrement action cooldown timers (`tickCooldowns`).
2. **Calendar** – Advance the calendar by one day, rolling months/years.
3. **Marketing & Reputation** – Decay marketing momentum, update brand strength, and recompute facility reputation.
4. **Market Demand** – Apply deterministic noise, macro shifts, automation bonuses, and pricing pressure to the demand index.
5. **Occupancy** – Move occupied units toward the target occupancy using the latest demand, marketing lift, and automation level.
6. **Financials** – Calculate revenue, expenses, debt service, and update cash, valuation, and burn rate.
7. **Story Beats** – Refresh market narratives and emit warnings for climate risk or low liquidity.
8. **Unlocks & Goals** – Unlock new actions (AI manager training) and promote the active goal when its metric crosses the target.
9. **Telemetry** – Append cash, net income, occupancy, and demand snapshots to history arrays powering the UI sparklines.

## Deterministic Randomness

`src/lib/utils/random.ts` provides a seeded linear congruential generator. The seed lives on the game state so the same sequence
is replayable across sessions.

## Actions

Player commands are defined in `src/lib/data/actions.ts` and resolved in `src/lib/simulation/actions.ts`. Effects are applied via
Immer drafts so complex mutations remain ergonomic while keeping updates immutable for Svelte stores.

## State Management

- `src/lib/stores/game.ts` holds the writable store, start/pause/reset helpers, and the animation frame loop.
- `src/lib/utils/persistence.ts` serializes the game state into versioned localStorage snapshots and sanitizes restores.
- `src/lib/types/game.ts` defines all shared interfaces.
- UI components read directly from the store (`App.svelte` subscribes on mount) and dispatch actions via custom events.

## Future Extensions

- Add competitor AI modules that feed into the demand/competition curves.
- Introduce modular facility upgrades that plug into the same action system.
- Wire browser storage sync (e.g., Supabase, Firebase) for cross-device play.
