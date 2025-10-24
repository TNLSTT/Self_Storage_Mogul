import type { GameActionId, GameState, PlayerState } from '../types/game'
import { createDefaultDelinquency, createDefaultPricing } from '../data/defaults'
import {
  computeFacilityAverageRent,
  normalizeDelinquencyPolicy,
  normalizeFacilityPricing,
} from '../utils/facility'
import { computeCashFlowSnapshot } from '../simulation/finance'

const STORAGE_KEY = 'self-storage-mogul-save'
const CURRENT_VERSION = 2
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

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const sanitizeNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? (value as number) : fallback

const sanitizeRegions = (incoming: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(incoming)) return [...fallback]
  const cleaned = incoming.filter((value): value is string => typeof value === 'string' && value.length > 0)
  if (!cleaned.length) return [...fallback]
  return Array.from(new Set(cleaned))
}

const sanitizePlayer = (incoming: Partial<PlayerState> | undefined, state: GameState): PlayerState => {
  const facilityValue = state.facility.totalUnits * state.facility.averageRent * 8
  const netWorth = state.financials.cash + facilityValue - state.financials.debt
  const fallbackScore = state.player?.creditScore ?? 620
  const rawScore = sanitizeNumber(incoming?.creditScore, fallbackScore)
  const creditScore = clampValue(rawScore, 300, 850)
  const selectedRegion =
    typeof incoming?.selectedRegionId === 'string'
      ? incoming.selectedRegionId
      : state.player?.selectedRegionId ?? null
  const regions = sanitizeRegions(incoming?.regionsUnlocked, selectedRegion ? [selectedRegion] : state.player?.regionsUnlocked ?? [])
  const creditHistory = Array.isArray(incoming?.creditHistory)
    ? incoming.creditHistory
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
        .slice(-HISTORY_LIMIT)
    : [creditScore]

  return {
    cash: sanitizeNumber(incoming?.cash, state.financials.cash),
    creditScore,
    loanToValue: clampValue(sanitizeNumber(incoming?.loanToValue, state.player?.loanToValue ?? 0.9), 0.4, 0.95),
    maxPurchase: sanitizeNumber(incoming?.maxPurchase, state.player?.maxPurchase ?? 1_000_000),
    buildUnlocked: Boolean(incoming?.buildUnlocked ?? state.player?.buildUnlocked ?? false),
    monthToDateNet: sanitizeNumber(incoming?.monthToDateNet, 0),
    negativeNetMonthStreak: Math.max(0, Math.floor(sanitizeNumber(incoming?.negativeNetMonthStreak, 0))),
    lastMonthNetWorth: sanitizeNumber(incoming?.lastMonthNetWorth, netWorth),
    creditHistory: creditHistory.length ? creditHistory : [creditScore],
    regionsUnlocked: regions,
    selectedRegionId: selectedRegion,
    startYear: Math.floor(sanitizeNumber(incoming?.startYear, state.player?.startYear ?? state.clock.year)),
    expansionUnlocked: Boolean(incoming?.expansionUnlocked ?? state.player?.expansionUnlocked ?? false),
    propertyPaidOff: Boolean(incoming?.propertyPaidOff ?? state.financials.debt <= 0),
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
      monthlyNet: Array.isArray(merged.history.monthlyNet)
        ? [...merged.history.monthlyNet]
        : [],
      occupancy: [...merged.history.occupancy],
      demand: [...merged.history.demand],
    },
  }

  state.session = merged.session
    ? {
        started: Boolean((merged.session as { started?: boolean }).started ?? true),
        origin:
          (merged.session as { origin?: string }).origin === 'start_flow'
            ? 'start_flow'
            : (merged.session as { origin?: string }).origin === 'default'
              ? 'default'
              : 'save',
      }
    : { started: true, origin: 'save' }

  const pricingDefaults = createDefaultPricing()
  const delinquencyDefaults = createDefaultDelinquency()
  state.facility.pricing = normalizeFacilityPricing(state.facility.pricing, pricingDefaults)
  state.facility.delinquency = normalizeDelinquencyPolicy(
    state.facility.delinquency,
    delinquencyDefaults
  )
  state.facility.occupancyRate = state.facility.totalUnits
    ? state.facility.occupiedUnits / state.facility.totalUnits
    : 0
  state.facility.averageRent = computeFacilityAverageRent(state.facility)
  const snapshot = computeCashFlowSnapshot(state)
  state.financials.revenueLastTick = Number.isFinite(state.financials.revenueLastTick)
    ? state.financials.revenueLastTick
    : snapshot.dailyRevenue
  state.financials.expensesLastTick = Number.isFinite(state.financials.expensesLastTick)
    ? state.financials.expensesLastTick
    : snapshot.dailyExpenses
  state.financials.netLastTick = Number.isFinite(state.financials.netLastTick)
    ? state.financials.netLastTick
    : snapshot.operatingDailyNet
  state.financials.revenueMonthly = state.financials.revenueLastTick * 30
  state.financials.expensesMonthly = state.financials.expensesLastTick * 30
  state.financials.netMonthly = state.financials.netLastTick * 30
  state.financials.averageDailyRent = snapshot.averageDailyRent
  state.financials.effectiveOccupancyRate = snapshot.effectiveOccupancyRate
  state.financials.delinquentShare = snapshot.delinquentShare
  const maintenance = Number.isFinite(state.financials.deferredMaintenance)
    ? (state.financials.deferredMaintenance as number)
    : 0
  state.financials.deferredMaintenance = Math.min(Math.max(maintenance, 0), 250000)
  state.financials.monthlyDebtService = (state.financials.debt * state.financials.interestRate) / 12
  state.financials.burnRate = state.financials.expensesLastTick - state.financials.revenueLastTick
  state.financials.valuation = Math.max(
    0,
    state.facility.totalUnits * state.facility.averageRent * 8 + state.financials.cash - state.financials.debt
  )

  state.player = sanitizePlayer((merged as Partial<GameState>).player, state)
  state.player.cash = state.financials.cash

  state.history.cash = clampHistory(state.history.cash, [state.financials.cash])
  state.history.net = clampHistory(state.history.net, [state.financials.netLastTick])
  state.history.monthlyNet = clampHistory(state.history.monthlyNet, [state.financials.netMonthly])
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
      monthlyNet: history?.monthlyNet ?? base.history.monthlyNet,
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
