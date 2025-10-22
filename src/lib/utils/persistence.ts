import type { GameActionId, GameState } from '../types/game'

const STORAGE_KEY = 'self-storage-mogul-save'
const CURRENT_VERSION = 1
const HISTORY_LIMIT = 72

interface SaveFile {
  version: number
  timestamp: number
  state: GameState
}

const isBrowser = typeof window !== 'undefined'

const allowedActions: GameActionId[] = [
  'expand_capacity',
  'launch_campaign',
  'optimize_pricing',
  'train_ai_manager',
]

const clampHistory = (series: unknown, fallback: number[]) => {
  if (!Array.isArray(series)) return [...fallback]
  const sanitized = series.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (sanitized.length === 0) return [...fallback]
  return sanitized.slice(-HISTORY_LIMIT)
}

const computeGoalProgress = (state: GameState) => {
  switch (state.goals.metric) {
    case 'automation':
      return state.automation.level
    case 'valuation':
      return state.financials.valuation
    case 'occupancy':
    default:
      return state.facility.occupancyRate
  }
}

const finalizeState = (merged: GameState): GameState => {
  const state: GameState = {
    ...merged,
    clock: { ...merged.clock },
    facility: { ...merged.facility },
    financials: { ...merged.financials },
    marketing: { ...merged.marketing },
    market: { ...merged.market },
    automation: { ...merged.automation },
    goals: { ...merged.goals },
    events: [...merged.events],
    unlockedActions: [...merged.unlockedActions],
    cooldowns: { ...merged.cooldowns },
    history: {
      cash: [...merged.history.cash],
      net: [...merged.history.net],
      occupancy: [...merged.history.occupancy],
      demand: [...merged.history.demand],
    },
  }

  state.facility.occupancyRate = state.facility.totalUnits
    ? state.facility.occupiedUnits / state.facility.totalUnits
    : 0
  state.financials.monthlyDebtService = (state.financials.debt * state.financials.interestRate) / 12
  state.financials.burnRate = state.financials.expensesLastTick - state.financials.revenueLastTick
  state.financials.valuation = Math.max(
    0,
    state.facility.totalUnits * state.facility.averageRent * 8 + state.financials.cash - state.financials.debt
  )

  state.history.cash = clampHistory(state.history.cash, [state.financials.cash])
  state.history.net = clampHistory(state.history.net, [state.financials.netLastTick])
  state.history.occupancy = clampHistory(state.history.occupancy, [state.facility.occupancyRate])
  state.history.demand = clampHistory(state.history.demand, [state.market.demandIndex])

  state.events = state.events.slice(0, 12)
  state.unlockedActions = state.unlockedActions.filter((action, index, list) => {
    const known = allowedActions.includes(action)
    return known && list.indexOf(action) === index
  })

  const sanitizedCooldowns: Partial<Record<GameActionId, number>> = {}
  for (const action of allowedActions) {
    const value = state.cooldowns[action]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      sanitizedCooldowns[action] = Math.floor(value)
    }
  }
  state.cooldowns = sanitizedCooldowns

  state.seed = typeof state.seed === 'number' ? state.seed : 112358
  state.logSequence = typeof state.logSequence === 'number' ? state.logSequence : state.events.length
  state.paused = true

  state.goals.progress = computeGoalProgress(state)
  state.goals.completed = state.goals.progress >= state.goals.target

  return state
}

const mergeState = (base: GameState, incoming: GameState): GameState => {
  const history = (incoming as Partial<GameState>).history
  return finalizeState({
    ...base,
    ...incoming,
    clock: { ...base.clock, ...incoming.clock },
    facility: { ...base.facility, ...incoming.facility },
    financials: { ...base.financials, ...incoming.financials },
    marketing: { ...base.marketing, ...incoming.marketing },
    market: { ...base.market, ...incoming.market },
    automation: { ...base.automation, ...incoming.automation },
    goals: { ...base.goals, ...incoming.goals },
    events: Array.isArray(incoming.events) ? incoming.events : base.events,
    unlockedActions: Array.isArray(incoming.unlockedActions)
      ? (incoming.unlockedActions as GameActionId[])
      : base.unlockedActions,
    cooldowns: { ...base.cooldowns, ...incoming.cooldowns },
    history: {
      cash: history?.cash ?? base.history.cash,
      net: history?.net ?? base.history.net,
      occupancy: history?.occupancy ?? base.history.occupancy,
      demand: history?.demand ?? base.history.demand,
    },
  })
}

export const loadGame = (base: GameState): GameState | null => {
  if (!isBrowser) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SaveFile>
    if (!parsed || typeof parsed !== 'object' || !parsed.state) return null

    if (parsed.version && parsed.version > CURRENT_VERSION) {
      // Future save version; ignore to avoid corrupting current session.
      return null
    }

    return mergeState(base, parsed.state as GameState)
  } catch (error) {
    console.warn('[storage] Failed to load save data', error)
    return null
  }
}

export const saveGame = (state: GameState) => {
  if (!isBrowser) return
  try {
    const payload: SaveFile = {
      version: CURRENT_VERSION,
      timestamp: Date.now(),
      state,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('[storage] Failed to persist save data', error)
  }
}

export const clearSavedGame = () => {
  if (!isBrowser) return
  window.localStorage.removeItem(STORAGE_KEY)
}
