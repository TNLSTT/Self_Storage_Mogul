import type { Draft } from 'immer'
import { ACTION_LOOKUP } from '../data/actions'
import type { GameState, GoalMetric, GoalState } from '../types/game'
import { clamp, pushLog, tickCooldowns } from './helpers'
import { nextRandom } from '../utils/random'
import {
  computeFacilityAverageRent,
  evictionUrgencyFactor,
  paymentPlanCollectionRate,
  specialsDiscountFactor,
} from '../utils/facility'

export const TICK_INTERVAL_MS = 1000
const DAYS_PER_TICK = 1
const MONTH_LENGTH = 30
const MONTHS_PER_YEAR = 12
const HISTORY_CAP = 72

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const computeGoalMetric = (metric: GoalMetric, state: GameState) => {
  switch (metric) {
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

export const goalForStage = (stage: number): GoalState => {
  switch (stage) {
    case 0:
      return {
        id: 'stabilize',
        label: 'Stabilize Harbor One',
        description: 'Hold occupancy above 85% to prove the market.',
        metric: 'occupancy',
        target: 0.85,
        progress: 0,
        completed: false,
      }
    case 1:
      return {
        id: 'automate',
        label: 'Automate the Depot',
        description: 'Lift automation to 60% so the facility runs itself overnight.',
        metric: 'automation',
        target: 0.6,
        progress: 0,
        completed: false,
      }
    default:
      return {
        id: 'scale',
        label: 'Scale Toward Megaplex',
        description: 'Reach a $2.5M valuation and tee up multi-city expansion.',
        metric: 'valuation',
        target: 2_500_000,
        progress: 0,
        completed: false,
      }
  }
}

const MARKET_BEATS = [
  'Rival REIT testing drone-access lockers across town.',
  'Floodplain maps updated; insurers revisit premium schedules.',
  'Local esports league requests after-hours storage for arenas.',
  'Construction labor shortage easing—permits clearing faster.',
]

const pushHistoryPoint = (series: number[], value: number) => {
  series.push(value)
  if (series.length > HISTORY_CAP) {
    series.shift()
  }
}

export const formatClock = (state: GameState) => {
  const month = MONTH_NAMES[state.clock.month - 1] ?? 'Jan'
  return `${month} ${state.clock.day}, ${state.clock.year}`
}

export const advanceTick = (state: Draft<GameState>) => {
  tickCooldowns(state)
  state.tick += 1
  state.clock.day += DAYS_PER_TICK

  while (state.clock.day > MONTH_LENGTH) {
    state.clock.day -= MONTH_LENGTH
    state.clock.month += 1
    if (state.clock.month > MONTHS_PER_YEAR) {
      state.clock.month = 1
      state.clock.year += 1
    }
  }

  state.marketing.momentum = Math.max(0, state.marketing.momentum - 0.02)
  state.marketing.brandStrength = clamp(
    state.marketing.brandStrength + (state.facility.reputation - 55) / 600,
    0,
    1
  )
  state.facility.averageRent = computeFacilityAverageRent(state.facility)

  const specialAdoption =
    state.facility.pricing.specials.offer === 'one_month_free'
      ? clamp(state.facility.pricing.specials.adoptionRate, 0, 1)
      : 0
  const specialsBoost = specialAdoption * 0.05
  const specialDiscount = specialsDiscountFactor(state.facility.pricing)

  const delinquencyPolicy = state.facility.delinquency
  const delinquencyRate = clamp(delinquencyPolicy.rate, 0, 0.3)
  const evictionUrgency = evictionUrgencyFactor(delinquencyPolicy)
  const collectionRate = paymentPlanCollectionRate(delinquencyPolicy)
  const delinquencyDrag =
    delinquencyRate * (delinquencyPolicy.allowPaymentPlans ? 0.05 : 0.12) + evictionUrgency * 0.05

  const demandNoise = nextRandom(state) * 0.06 - 0.03
  const macroWave = nextRandom(state) * 0.03 - 0.015
  const marketingLift =
    state.marketing.level * 0.025 + state.marketing.momentum * 0.2 + state.marketing.brandStrength * 0.12
  const automationLift = state.automation.level * 0.04
  const reputationLift = (state.facility.reputation - 60) / 140
  const pricePressure = Math.max(
    0,
    (state.facility.averageRent - state.market.referenceRent) / state.market.referenceRent
  )
  const competitionDrag = state.market.competitionPressure * 0.05

  state.market.demandIndex = clamp(
    state.market.demandIndex +
      demandNoise +
      macroWave +
      marketingLift +
      automationLift +
      reputationLift +
      specialsBoost * 0.4 -
      pricePressure * 0.5 -
      competitionDrag,
    0.2,
    1.4
  )

  const demandDelta = state.market.demandIndex - state.market.lastDemandIndex
  state.market.trend = demandDelta > 0.02 ? 'surging' : demandDelta < -0.02 ? 'softening' : 'stable'
  state.market.lastDemandIndex = state.market.demandIndex

  state.market.competitionPressure = clamp(
    state.market.competitionPressure + nextRandom(state) * 0.02 - 0.01,
    0.05,
    0.8
  )
  state.market.climateRisk = clamp(state.market.climateRisk + nextRandom(state) * 0.015 - 0.007, 0, 1)

  const targetOccupancyRatio = clamp(
    state.market.demandIndex +
      marketingLift * 0.5 +
      automationLift * 0.35 +
      reputationLift * 0.6 +
      specialsBoost * 0.6 -
      pricePressure * 0.7 -
      state.market.climateRisk * 0.03 -
      delinquencyRate * 0.25,
    0.25,
    0.99 + state.automation.level * 0.04
  )
  const absorptionRate = 0.12 + state.marketing.momentum * 0.12 + state.automation.level * 0.05
  const occupancyGap = targetOccupancyRatio * state.facility.totalUnits - state.facility.occupiedUnits
  state.facility.occupiedUnits = clamp(
    state.facility.occupiedUnits + occupancyGap * absorptionRate,
    0,
    state.facility.totalUnits
  )
  state.facility.occupancyRate = state.facility.totalUnits
    ? state.facility.occupiedUnits / state.facility.totalUnits
    : 0

  const delinquentUnitsRaw = state.facility.occupiedUnits * delinquencyRate
  const evictionMitigation = delinquencyPolicy.allowPaymentPlans ? 0.5 : 1
  const evictedUnits = delinquentUnitsRaw * evictionUrgency * evictionMitigation
  if (evictedUnits > 0) {
    state.facility.occupiedUnits = clamp(
      state.facility.occupiedUnits - evictedUnits,
      0,
      state.facility.totalUnits
    )
    state.facility.occupancyRate = state.facility.totalUnits
      ? state.facility.occupiedUnits / state.facility.totalUnits
      : 0
  }
  const remainingDelinquentUnits = Math.min(
    state.facility.occupiedUnits,
    Math.max(0, delinquentUnitsRaw - evictedUnits)
  )
  const payingUnits = Math.max(0, state.facility.occupiedUnits - remainingDelinquentUnits)

  const satisfaction = clamp(
    state.facility.occupancyRate * 0.65 +
      state.marketing.brandStrength * 0.2 +
      state.automation.reliability * 0.1 +
      specialsBoost * 0.4 +
      (delinquencyPolicy.allowPaymentPlans ? 0.03 : 0) -
      pricePressure * 0.4 -
      delinquencyDrag,
    -1,
    1
  )
  state.facility.reputation = clamp(state.facility.reputation + satisfaction * 1.3, 35, 98)
  state.automation.reliability = clamp(
    state.automation.reliability - 0.005 + state.automation.level * 0.01,
    0.6,
    0.99
  )
  state.facility.automationLevel = state.automation.level

  const managerRevenueBonus = state.automation.aiManager?.bonuses.revenue ?? 0
  const dailyRent = state.facility.averageRent / 30
  const effectiveRevenueUnits = (payingUnits + remainingDelinquentUnits * collectionRate) * (1 + managerRevenueBonus)
  const revenue = effectiveRevenueUnits * dailyRent * (1 - specialDiscount)
  const operations = (420 + state.facility.totalUnits * 2.6) * (1 - state.automation.level * 0.18)
  const marketingSpend = 240 * state.marketing.level + state.marketing.momentum * 160
  const automationSpend = 160 * (1 + state.automation.level * 2)
  const interest = (state.financials.debt * state.financials.interestRate) / 360
  const insurance = state.market.climateRisk * 120
  const expenses = operations + marketingSpend + automationSpend + interest + insurance
  let net = revenue - expenses

  state.financials.cash += net

  if (net > 0) {
    const principalPayment = Math.min(net * 0.08, state.financials.debt, state.financials.cash)
    state.financials.debt -= principalPayment
    state.financials.cash -= principalPayment
    net -= principalPayment
  }

  state.financials.revenueLastTick = revenue
  state.financials.expensesLastTick = expenses
  state.financials.netLastTick = net
  state.financials.burnRate = expenses - revenue
  state.financials.monthlyDebtService = (state.financials.debt * state.financials.interestRate) / 12
  state.financials.valuation = Math.max(
    0,
    state.facility.totalUnits * state.facility.averageRent * 8 + state.financials.cash - state.financials.debt
  )

  pushHistoryPoint(state.history.cash, state.financials.cash)
  pushHistoryPoint(state.history.net, state.financials.netLastTick)
  pushHistoryPoint(state.history.occupancy, state.facility.occupancyRate)
  pushHistoryPoint(state.history.demand, state.market.demandIndex)

  if (state.financials.cash < 35000 && state.tick % 6 === 0) {
    pushLog(state, 'Cash reserves drifting low—consider pausing construction.', 'warning')
  }

  if (state.market.climateRisk > 0.65 && state.tick % 7 === 0) {
    pushLog(state, 'Climate risk desk recommends revisiting insurance coverage.', 'warning')
  }

  if (state.tick % 8 === 0) {
    const beat = MARKET_BEATS[Math.floor(nextRandom(state) * MARKET_BEATS.length)]
    state.market.storyBeat = beat
  }

  if (state.facility.occupancyRate > 0.78 && !state.unlockedActions.includes('train_ai_manager')) {
    state.unlockedActions.push('train_ai_manager')
    const definition = ACTION_LOOKUP['train_ai_manager']
    pushLog(state, `${definition.title} unlocked—board approves AI staffing budget.`, 'positive')
  }

  const progressValue = computeGoalMetric(state.goals.metric, state)
  state.goals.progress = progressValue
  if (!state.goals.completed && progressValue >= state.goals.target) {
    state.goals.completed = true
    pushLog(state, `Goal achieved: ${state.goals.label}`, 'positive')
  }

  if (state.goals.completed) {
    const nextStage = Math.min(state.goalStage + 1, 2)
    if (nextStage !== state.goalStage && nextStage <= 2) {
      state.goalStage = nextStage
      const nextGoal = goalForStage(nextStage)
      nextGoal.progress = computeGoalMetric(nextGoal.metric, state)
      nextGoal.completed = nextGoal.progress >= nextGoal.target
      state.goals = nextGoal
      pushLog(state, `New directive: ${nextGoal.label}`, 'info')
    }
  }
}
