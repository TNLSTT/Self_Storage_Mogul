import type { Draft } from 'immer'
import type { GameActionId, GameLogEntry, GameState, LogTone } from '../types/game'

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const pushLog = (state: Draft<GameState>, message: string, tone: LogTone = 'info') => {
  const entry: GameLogEntry = {
    id: state.logSequence + 1,
    tick: state.tick,
    tone,
    message,
    year: state.clock.year,
    month: state.clock.month,
    day: state.clock.day,
  }
  state.logSequence = entry.id
  state.events = [entry, ...state.events].slice(0, 12)
}

export const tickCooldowns = (state: Draft<GameState>) => {
  for (const key of Object.keys(state.cooldowns) as GameActionId[]) {
    const remaining = state.cooldowns[key]
    if (remaining === undefined) continue
    if (remaining <= 1) {
      delete state.cooldowns[key]
    } else {
      state.cooldowns[key] = remaining - 1
    }
  }
}
