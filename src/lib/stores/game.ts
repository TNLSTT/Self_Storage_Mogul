import { writable } from 'svelte/store'
import { produce } from 'immer'
import { ACTION_LOOKUP } from '../data/actions'
import { applyActionEffects } from '../simulation/actions'
import { advanceTick, goalForStage, TICK_INTERVAL_MS } from '../simulation/tick'
import { pushLog } from '../simulation/helpers'
import { clearSavedGame, loadGame, saveGame } from '../utils/persistence'
import type { GameActionId, GameState, GoalState } from '../types/game'

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

const createInitialState = (): GameState => {
  const goal = goalForStage(0)
  const base: GameState = {
    tick: 0,
    clock: { day: 18, month: 4, year: 2042, speed: 1 },
    city: 'Sunrise Harbor, FL',
    facility: {
      name: 'Harbor One Storage',
      location: 'Pier Innovation District',
      totalUnits: 160,
      occupiedUnits: 104,
      occupancyRate: 104 / 160,
      averageRent: 145,
      mix: { climateControlled: 60, driveUp: 70, vault: 30 },
      reputation: 62,
      automationLevel: 0.32,
      prestige: 0.12,
    },
    financials: {
      cash: 245000,
      debt: 780000,
      interestRate: 0.085,
      revenueLastTick: 0,
      expensesLastTick: 0,
      netLastTick: 0,
      valuation: 0,
      monthlyDebtService: 0,
      burnRate: 0,
    },
    marketing: { level: 2, momentum: 0.4, brandStrength: 0.35 },
    market: {
      demandIndex: 0.68,
      referenceRent: 138,
      competitionPressure: 0.22,
      climateRisk: 0.32,
      trend: 'stable',
      storyBeat: 'City council fast-tracks mixed-use redevelopment near your flagship lot.',
      lastDemandIndex: 0.68,
    },
    automation: { level: 0.32, reliability: 0.82, aiManager: null },
    goals: goal,
    goalStage: 0,
    events: [],
    unlockedActions: ['expand_capacity', 'launch_campaign', 'optimize_pricing'],
    cooldowns: {},
    seed: 112358,
    logSequence: 0,
    paused: true,
    history: {
      cash: [],
      net: [],
      occupancy: [],
      demand: [],
    },
  }

  base.financials.valuation = Math.max(
    0,
    base.facility.totalUnits * base.facility.averageRent * 8 + base.financials.cash - base.financials.debt
  )
  base.financials.monthlyDebtService = (base.financials.debt * base.financials.interestRate) / 12
  base.goals.progress = goalProgressFor(goal, base)
  base.goals.completed = base.goals.progress >= base.goals.target

  base.history.cash = [base.financials.cash]
  base.history.net = [base.financials.netLastTick]
  base.history.occupancy = [base.facility.occupancyRate]
  base.history.demand = [base.market.demandIndex]

  base.events = [
    {
      id: 1,
      tick: 0,
      tone: 'info',
      message: 'Welcome back, Mogul. Harbor One is prepped for a new growth sprint.',
      year: base.clock.year,
      month: base.clock.month,
      day: base.clock.day,
    },
    {
      id: 2,
      tick: 0,
      tone: 'info',
      message: base.market.storyBeat,
      year: base.clock.year,
      month: base.clock.month,
      day: base.clock.day,
    },
  ]
  base.logSequence = base.events.length
  return base
}

const createStore = () => {
  const baseState = createInitialState()
  const initialState = typeof window !== 'undefined' ? loadGame(baseState) ?? baseState : baseState
  const { subscribe, update, set } = writable<GameState>(initialState)

  let frame: number | null = null
  let running = false
  let lastTime = 0
  let lastPersist = 0
  let skipPersist = true
  let currentState = initialState

  const persistIfNeeded = () => {
    if (typeof window === 'undefined') return
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
    const speed = Number.isFinite(currentState.clock.speed) && currentState.clock.speed > 0 ? currentState.clock.speed : 1
    const clamped = Math.min(Math.max(speed, 0.25), 8)
    return TICK_INTERVAL_MS / clamped
  }

  const loop = (timestamp: number) => {
    if (!running) return
    if (!lastTime) lastTime = timestamp
    let elapsed = timestamp - lastTime
    let interval = effectiveInterval()

    if (elapsed >= interval) {
      while (elapsed >= interval) {
        update((state) => produce(state, (draft) => advanceTick(draft)))
        lastTime += interval
        elapsed -= interval
        interval = effectiveInterval()
      }
    }

    frame = window.requestAnimationFrame(loop)
  }

  const start = () => {
    if (typeof window === 'undefined' || running) return
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
    if (running) {
      pause()
    } else {
      start()
    }
  }

  const step = () => {
    update((state) => produce(state, (draft) => advanceTick(draft)))
  }

  const reset = () => {
    pause()
    skipPersist = true
    set(createInitialState())
    if (typeof window !== 'undefined') {
      clearSavedGame()
    }
  }

  const setSpeed = (value: number) => {
    update((state) =>
      produce(state, (draft) => {
        const next = Number.isFinite(value) && value > 0 ? value : 1
        const clamped = Math.min(Math.max(next, 0.25), 8)
        if (draft.clock.speed === clamped) {
          return
        }
        draft.clock.speed = clamped
      })
    )
  }

  const applyAction = (actionId: GameActionId) => {
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
    if (typeof window === 'undefined') return
    saveGame(currentState)
    lastPersist = Date.now()
    update((state) =>
      produce(state, (draft) => {
        pushLog(draft, 'Manual snapshot saved to local storage.', 'info')
      })
    )
  }

  return { subscribe, start, pause, toggle, step, reset, applyAction, saveSnapshot, setSpeed }
}

export const game = createStore()
