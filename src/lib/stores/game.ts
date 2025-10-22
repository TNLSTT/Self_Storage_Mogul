import { writable } from 'svelte/store'
import { produce } from 'immer'
import { ACTION_LOOKUP } from '../data/actions'
import { applyActionEffects } from '../simulation/actions'
import { advanceTick, goalForStage, TICK_INTERVAL_MS } from '../simulation/tick'
import { pushLog } from '../simulation/helpers'
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
  }

  base.financials.valuation = Math.max(
    0,
    base.facility.totalUnits * base.facility.averageRent * 8 + base.financials.cash - base.financials.debt
  )
  base.financials.monthlyDebtService = (base.financials.debt * base.financials.interestRate) / 12
  base.goals.progress = goalProgressFor(goal, base)
  base.goals.completed = base.goals.progress >= base.goals.target

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
  const { subscribe, update, set } = writable<GameState>(createInitialState())

  let frame: number | null = null
  let running = false
  let lastTime = 0

  const loop = (timestamp: number) => {
    if (!running) return
    if (!lastTime) lastTime = timestamp
    let elapsed = timestamp - lastTime

    if (elapsed >= TICK_INTERVAL_MS) {
      while (elapsed >= TICK_INTERVAL_MS) {
        update((state) => produce(state, (draft) => advanceTick(draft)))
        lastTime += TICK_INTERVAL_MS
        elapsed -= TICK_INTERVAL_MS
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
    set(createInitialState())
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

  return { subscribe, start, pause, toggle, step, reset, applyAction }
}

export const game = createStore()
