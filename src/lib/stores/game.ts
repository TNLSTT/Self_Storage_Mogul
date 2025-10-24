import { writable } from 'svelte/store'
import { produce } from 'immer'
import { ACTION_LOOKUP } from '../data/actions'
import { START_FACILITIES, TRADE_AREAS } from '../data/startFacilities'
import { createDefaultDelinquency, createDefaultPricing } from '../data/defaults'
import { applyActionEffects } from '../simulation/actions'
import { advanceTick, goalForStage, TICK_INTERVAL_MS } from '../simulation/tick'
import { computeCashFlowSnapshot } from '../simulation/finance'
import { pushLog } from '../simulation/helpers'
import { clearSavedGame, loadGame, saveGame } from '../utils/persistence'
import { randomBetween } from '../utils/random'
import {
  type DelinquencyPolicy,
  type FacilityPricing,
  type GameActionId,
  type GameState,
  type GoalState,
  type PricingTier,
} from '../types/game'
import type { StartGameResult } from '../types/start'
import { computeInterestRate, loanSeedFrom, pmt } from '../utils/loan'
import {
  computeFacilityAverageRent,
  normalizeDelinquencyPolicy,
  normalizeFacilityPricing,
  normalizePricingTier,
} from '../utils/facility'

type PricingKey = 'climateControlled' | 'driveUp' | 'vault'

const BASE_PLAYER = {
  cash: 100_000,
  creditScore: 620,
  loanToValue: 0.9,
  maxPurchase: 1_000_000,
}

const defaultFinancing = {
  downPaymentPercent: 0.2,
  termYears: 20 as const,
  rateType: 'fixed' as const,
}

const scalePricingTier = (tier: PricingTier, multiplier: number): PricingTier => ({
  standard: tier.standard * multiplier,
  prime: tier.prime * multiplier,
  primeShare: tier.primeShare,
})

const buildStartPricing = (pricing: FacilityPricing, multiplier: number): FacilityPricing => ({
  climateControlled: scalePricingTier(pricing.climateControlled, multiplier),
  driveUp: scalePricingTier(pricing.driveUp, multiplier),
  vault: scalePricingTier(pricing.vault, multiplier),
  specials: pricing.specials,
})

const createDefaultStartConfig = (): StartGameResult => {
  const region = TRADE_AREAS[0]
  const facility = START_FACILITIES.find((item) => item.regionId === region.id) ?? START_FACILITIES[0]
  const downPayment = facility.price * defaultFinancing.downPaymentPercent
  const loanAmount = facility.price - downPayment
  const interestRate = computeInterestRate(region.baseRate, BASE_PLAYER.creditScore)
  const termMonths = defaultFinancing.termYears * 12
  const monthlyPayment = pmt(interestRate, termMonths, loanAmount)
  return {
    region,
    facility,
    financing: { ...defaultFinancing },
    loan: {
      baseRate: region.baseRate,
      downPayment,
      interestRate,
      loanAmount,
      monthlyPayment,
      rateType: defaultFinancing.rateType,
      termMonths,
    },
    player: {
      ...BASE_PLAYER,
      cashAfterPurchase: BASE_PLAYER.cash - downPayment,
    },
    seed: loanSeedFrom([
      region.id,
      facility.id,
      String(loanAmount.toFixed(2)),
      termMonths.toString(),
      defaultFinancing.rateType,
    ]),
  }
}

const goalProgressFor = (goal: GoalState, state: GameState) => {
  switch (goal.metric) {
    case 'occupancy':
      return state.facility.occupancyRate
    case 'automation':
      return state.automation.level
    case 'valuation':
      return state.financials.valuation
    default:
      return 0
  }
}

const createInitialState = (
  start: StartGameResult,
  options: { sessionOrigin?: GameState['session']['origin']; started?: boolean } = {}
): GameState => {
  const goal = goalForStage(0)
  const pricingTemplate = createDefaultPricing()
  const delinquencyTemplate = createDefaultDelinquency()
  const averageUnitSize = start.facility.totalUnits > 0 ? start.facility.sizeSqft / start.facility.totalUnits : 100
  const targetAverageRent = start.facility.avgRentPerSqft * averageUnitSize

  const facility: GameState['facility'] = {
    name: start.facility.name,
    location: start.facility.city,
    totalUnits: start.facility.totalUnits,
    occupiedUnits: Math.round(start.facility.totalUnits * start.facility.occupancy),
    occupancyRate: 0,
    averageRent: 0,
    mix: {
      climateControlled: {
        units: start.facility.mix.climateControlled,
        dimensions: ['5×5', '5×10', '10×10', '10×15'],
      },
      driveUp: {
        units: start.facility.mix.driveUp,
        dimensions: ['5×10', '10×15', '10×20', '12×30'],
      },
      vault: {
        units: start.facility.mix.vault,
        dimensions: ['4×4', '5×5', '6×8', '8×10'],
      },
    },
    pricing: createDefaultPricing(),
    delinquency: createDefaultDelinquency(),
    reputation: Math.min(65, 55 + (start.region.demandIndex - start.region.competition) * 30),
    automationLevel: 0.18,
    prestige: 0.08,
  }

  const baseAverageRent = computeFacilityAverageRent(facility)
  const pricingMultiplier = baseAverageRent > 0 ? targetAverageRent / baseAverageRent : 1
  const scaledPricing = buildStartPricing(pricingTemplate, pricingMultiplier)
  facility.pricing = {
    climateControlled: normalizePricingTier(scaledPricing.climateControlled, pricingTemplate.climateControlled),
    driveUp: normalizePricingTier(scaledPricing.driveUp, pricingTemplate.driveUp),
    vault: normalizePricingTier(scaledPricing.vault, pricingTemplate.vault),
    specials: pricingTemplate.specials,
  }
  facility.delinquency = normalizeDelinquencyPolicy(
    {
      ...delinquencyTemplate,
      baseRate: Math.max(0.025, start.region.competition * 0.04 + 0.018),
    },
    delinquencyTemplate
  )
  facility.delinquency.rate = facility.delinquency.baseRate + 0.01
  facility.occupancyRate = facility.totalUnits ? facility.occupiedUnits / facility.totalUnits : 0
  facility.averageRent = computeFacilityAverageRent(facility)

  const clock = { day: 6, month: 2, year: 2043, speed: 1 } as const
  const cashAfterPurchase = Math.max(start.player.cashAfterPurchase, 0)
  const sessionOrigin = options.sessionOrigin ?? 'start_flow'
  const started = options.started ?? true

  const state: GameState = {
    session: { started, origin: sessionOrigin },
    tick: 0,
    clock: { ...clock },
    city: start.facility.city,
    facility,
    financials: {
      cash: cashAfterPurchase,
      debt: Math.max(start.loan.loanAmount, 0),
      interestRate: start.loan.interestRate,
      revenueLastTick: 0,
      expensesLastTick: 0,
      netLastTick: 0,
      revenueMonthly: 0,
      expensesMonthly: 0,
      netMonthly: 0,
      averageDailyRent: 0,
      effectiveOccupancyRate: facility.occupancyRate,
      delinquentShare: 0,
      valuation: 0,
      monthlyDebtService: start.loan.monthlyPayment,
      burnRate: 0,
      deferredMaintenance: Math.round(12_000 + start.facility.issues.length * 6_500 + start.region.operatingCostFactor * 5_000),
    },
    marketing: { level: 1, momentum: 0.28, brandStrength: 0.24 },
    market: {
      demandIndex: start.region.demandIndex,
      referenceRent: facility.averageRent * 0.92,
      competitionPressure: start.region.competition,
      climateRisk: start.region.climateRisk,
      trend: 'stable',
      storyBeat: `Regional brief: ${start.region.description}`,
      lastDemandIndex: start.region.demandIndex,
    },
    automation: { level: 0.18, reliability: 0.82, aiManager: null },
    player: {
      cash: cashAfterPurchase,
      creditScore: start.player.creditScore,
      loanToValue: start.player.loanToValue,
      maxPurchase: start.player.maxPurchase,
      buildUnlocked: start.player.creditScore >= 750,
      monthToDateNet: 0,
      negativeNetMonthStreak: 0,
      lastMonthNetWorth: 0,
      creditHistory: [start.player.creditScore],
      regionsUnlocked: [start.region.id],
      selectedRegionId: start.region.id,
      startYear: clock.year,
      expansionUnlocked: false,
      propertyPaidOff: Math.max(start.loan.loanAmount, 0) <= 0,
    },
    goals: goal,
    goalStage: 0,
    events: [],
    unlockedActions: ['expand_capacity', 'launch_campaign', 'optimize_pricing'],
    cooldowns: {},
    seed: start.seed,
    logSequence: 0,
    paused: true,
    history: {
      cash: [],
      net: [],
      monthlyNet: [],
      occupancy: [],
      demand: [],
    },
  }

  const seededBaseRate = randomBetween(state, 0.026, 0.06)
  state.facility.delinquency.baseRate = seededBaseRate
  const initialRate = seededBaseRate + randomBetween(state, -0.006, 0.012)
  state.facility.delinquency.rate = Math.min(Math.max(initialRate, 0.015), 0.2)

  const initialCashFlow = computeCashFlowSnapshot(state)
  state.financials.revenueLastTick = initialCashFlow.dailyRevenue
  state.financials.expensesLastTick = initialCashFlow.dailyExpenses
  state.financials.netLastTick = initialCashFlow.operatingDailyNet
  state.financials.revenueMonthly = initialCashFlow.dailyRevenue * 30
  state.financials.expensesMonthly = initialCashFlow.dailyExpenses * 30
  state.financials.netMonthly = initialCashFlow.operatingDailyNet * 30
  state.financials.averageDailyRent = initialCashFlow.averageDailyRent
  state.financials.effectiveOccupancyRate = initialCashFlow.effectiveOccupancyRate
  state.financials.delinquentShare = initialCashFlow.delinquentShare
  state.financials.burnRate = state.financials.expensesLastTick - state.financials.revenueLastTick
  state.financials.valuation = Math.max(
    0,
    state.facility.totalUnits * state.facility.averageRent * 8 + state.financials.cash - state.financials.debt
  )

  const netWorth = state.financials.cash + state.facility.totalUnits * state.facility.averageRent * 8 - state.financials.debt
  state.player.lastMonthNetWorth = netWorth

  state.history.cash = [state.financials.cash]
  state.history.net = [state.financials.netLastTick]
  state.history.monthlyNet = [state.financials.netMonthly]
  state.history.occupancy = [state.facility.occupancyRate]
  state.history.demand = [state.market.demandIndex]

  state.goals.progress = goalProgressFor(goal, state)
  state.goals.completed = state.goals.progress >= state.goals.target

  state.events = [
    {
      id: 1,
      tick: 0,
      tone: 'info',
      message: `Acquired ${start.facility.name} in ${start.facility.city}. Down payment ${Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(start.loan.downPayment)} committed.`,
      year: state.clock.year,
      month: state.clock.month,
      day: state.clock.day,
    },
    {
      id: 2,
      tick: 0,
      tone: 'info',
      message: state.market.storyBeat,
      year: state.clock.year,
      month: state.clock.month,
      day: state.clock.day,
    },
  ]
  state.logSequence = state.events.length
  return state
}

const createStore = () => {
  const defaultStart = createDefaultStartConfig()
  const baseState = createInitialState(defaultStart, { sessionOrigin: 'default', started: false })
  const initialState = typeof window !== 'undefined' ? loadGame(baseState) ?? baseState : baseState
  const { subscribe, update, set } = writable<GameState>(initialState)

  let frame: number | null = null
  let running = false
  let lastTime = 0
  let lastPersist = 0
  let skipPersist = true
  let currentState = initialState
  let initialized = initialState.session.started

  const persistIfNeeded = () => {
    if (typeof window === 'undefined') return
    if (!currentState.session.started) return
    if (skipPersist) {
      skipPersist = false
      return
    }
    const now = Date.now()
    if (now - lastPersist < 2000) {
      return
    }
    saveGame(currentState)
    lastPersist = now
  }

  subscribe((value) => {
    currentState = value
    persistIfNeeded()
  })

  const effectiveInterval = () => {
    if (!currentState.session.started) {
      return TICK_INTERVAL_MS
    }
    const speed = Number.isFinite(currentState.clock.speed) && currentState.clock.speed > 0 ? currentState.clock.speed : 1
    const clamped = Math.min(Math.max(speed, 0.25), 8)
    return TICK_INTERVAL_MS / clamped
  }

  const loop = (timestamp: number) => {
    if (!running) return
    if (!currentState.session.started) {
      running = false
      return
    }
    if (!lastTime) lastTime = timestamp
    let elapsed = timestamp - lastTime
    let interval = effectiveInterval()

    if (elapsed >= interval) {
      while (elapsed >= interval) {
        update((state) =>
          produce(state, (draft) => {
            if (draft.session.started) {
              advanceTick(draft)
            }
          })
        )
        lastTime += interval
        elapsed -= interval
        interval = effectiveInterval()
      }
    }

    frame = window.requestAnimationFrame(loop)
  }

  const start = () => {
    if (typeof window === 'undefined' || running || !currentState.session.started) return
    running = true
    lastTime = performance.now()
    update((state) =>
      produce(state, (draft) => {
        draft.paused = false
      })
    )
    frame = window.requestAnimationFrame(loop)
  }

  const pause = () => {
    if (!running) return
    running = false
    if (frame !== null) {
      window.cancelAnimationFrame(frame)
      frame = null
    }
    update((state) =>
      produce(state, (draft) => {
        draft.paused = true
      })
    )
  }

  const toggle = () => {
    if (!currentState.session.started) return
    if (running) {
      pause()
    } else {
      start()
    }
  }

  const step = () => {
    if (!currentState.session.started || running) return
    update((state) =>
      produce(state, (draft) => {
        if (draft.session.started) {
          advanceTick(draft)
        }
      })
    )
  }

  const reset = () => {
    pause()
    const baseline = createDefaultStartConfig()
    const freshState = createInitialState(baseline, { sessionOrigin: 'default', started: false })
    skipPersist = true
    initialized = false
    set(freshState)
    currentState = freshState
    if (typeof window !== 'undefined') {
      clearSavedGame()
    }
  }

  const setSpeed = (value: number) => {
    if (!currentState.session.started) return
    update((state) =>
      produce(state, (draft) => {
        const next = Number.isFinite(value) && value > 0 ? value : 1
        const clamped = Math.min(Math.max(next, 0.25), 8)
        draft.clock.speed = clamped
      })
    )
  }

  const setPricingTier = (key: PricingKey, updates: Partial<PricingTier>) => {
    if (!currentState.session.started) return
    update((state) =>
      produce(state, (draft) => {
        const pricing = draft.facility.pricing as Record<PricingKey, PricingTier>
        const current = pricing[key]
        if (!current) return
        const next = normalizePricingTier({ ...current, ...updates }, current)
        pricing[key] = next
        draft.facility.averageRent = computeFacilityAverageRent(draft.facility)
      })
    )
  }

  const configureSpecials = (options: Partial<FacilityPricing['specials']>) => {
    if (!currentState.session.started) return
    update((state) =>
      produce(state, (draft) => {
        const current = draft.facility.pricing
        const next = normalizeFacilityPricing(
          {
            ...current,
            specials: { ...current.specials, ...options },
          },
          current
        )
        draft.facility.pricing = next
        draft.facility.averageRent = computeFacilityAverageRent(draft.facility)
      })
    )
  }

  const updateDelinquency = (updates: Partial<DelinquencyPolicy>) => {
    if (!currentState.session.started) return
    update((state) =>
      produce(state, (draft) => {
        draft.facility.delinquency = normalizeDelinquencyPolicy(
          { ...draft.facility.delinquency, ...updates },
          draft.facility.delinquency
        )
      })
    )
  }

  const applyAction = (actionId: GameActionId) => {
    if (!currentState.session.started) return
    update((state) =>
      produce(state, (draft) => {
        if (!draft.unlockedActions.includes(actionId)) {
          pushLog(draft, 'Action not yet unlocked.', 'warning')
          return
        }
        const definition = ACTION_LOOKUP[actionId]
        if (!definition) return

        const cooldown = draft.cooldowns[actionId]
        if (cooldown && cooldown > 0) {
          pushLog(draft, `${definition.title} is recalibrating.`, 'warning')
          return
        }

        if (draft.financials.cash < definition.cost) {
          pushLog(draft, `Insufficient liquidity for ${definition.title}.`, 'warning')
          return
        }

        draft.financials.cash -= definition.cost
        applyActionEffects(draft, actionId, definition)

        if (definition.cooldown > 0) {
          draft.cooldowns[actionId] = definition.cooldown
        }
      })
    )
  }

  const saveSnapshot = () => {
    if (typeof window === 'undefined' || !currentState.session.started) return
    saveGame(currentState)
    lastPersist = Date.now()
    update((state) =>
      produce(state, (draft) => {
        pushLog(draft, 'Manual snapshot saved to local storage.', 'info')
      })
    )
  }

  const initialize = (config: StartGameResult) => {
    const seededConfig = {
      ...config,
      seed:
        config.seed ??
        loanSeedFrom([
          config.region.id,
          config.facility.id,
          String(config.loan.loanAmount.toFixed(2)),
          config.loan.termMonths.toString(),
          config.loan.rateType,
        ]),
    }
    const nextState = createInitialState(seededConfig, { sessionOrigin: 'start_flow', started: true })
    skipPersist = true
    initialized = true
    set(nextState)
    currentState = nextState
  }

  return {
    subscribe,
    start,
    pause,
    toggle,
    step,
    reset,
    applyAction,
    saveSnapshot,
    initialize,
    setSpeed,
    setPricingTier,
    configureSpecials,
    updateDelinquency,
  }
}

export const game = createStore()
