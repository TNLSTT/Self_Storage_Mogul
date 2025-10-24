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
import { computeCashFlowSnapshot } from './finance'

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
        label: 'Stabilize the Mogul Flagship',
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
  const previousNetWorth = state.player.lastMonthNetWorth ?? 0
  let monthAdvanced = false
  tickCooldowns(state)
  state.tick += 1
  state.clock.day += DAYS_PER_TICK

  while (state.clock.day > MONTH_LENGTH) {
    state.clock.day -= MONTH_LENGTH
    state.clock.month += 1
    monthAdvanced = true
    if (state.clock.month > MONTHS_PER_YEAR) {
      state.clock.month = 1
      state.clock.year += 1
      // year advanced
    }
  }

  if (!Number.isFinite(state.player.monthToDateNet)) {
    state.player.monthToDateNet = 0
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
  const maintenancePressure = clamp(state.financials.deferredMaintenance / 150000, 0, 0.35)
  const reputationPenalty = clamp((58 - state.facility.reputation) / 90, 0, 0.4)
  const delinquencyNoise = nextRandom(state) * 0.02 - 0.01
  const baseDelinquency = clamp(delinquencyPolicy.baseRate, 0.01, 0.2)
  const targetDelinquencyRate = clamp(
    baseDelinquency + pricePressure * 0.16 + reputationPenalty * 0.1 + maintenancePressure * 0.6 + delinquencyNoise,
    0.015,
    0.25
  )
  const delinquencyRate = clamp(
    delinquencyPolicy.rate + (targetDelinquencyRate - delinquencyPolicy.rate) * 0.35,
    0.01,
    0.25
  )
  delinquencyPolicy.rate = delinquencyRate
  const evictionUrgency = evictionUrgencyFactor(delinquencyPolicy)
  const collectionRate = paymentPlanCollectionRate(delinquencyPolicy)
  const delinquencyDrag =
    delinquencyRate * (delinquencyPolicy.allowPaymentPlans ? 0.05 : 0.12) + evictionUrgency * 0.05

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
  const occupancyAfterEviction = clamp(
    state.facility.occupiedUnits - evictedUnits,
    0,
    state.facility.totalUnits
  )
  const remainingDelinquentUnits = Math.min(
    occupancyAfterEviction,
    Math.max(0, delinquentUnitsRaw - evictedUnits)
  )
  const payingUnits = Math.max(0, occupancyAfterEviction - remainingDelinquentUnits)
  state.facility.occupiedUnits = occupancyAfterEviction
  state.facility.occupancyRate = state.facility.totalUnits
    ? state.facility.occupiedUnits / state.facility.totalUnits
    : 0

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
  const cashFlow = computeCashFlowSnapshot(state, {
    payingUnits,
    remainingDelinquentUnits,
    collectionRate,
    dailyRent,
    specialsDiscount: specialDiscount,
    managerRevenueBonus,
  })
  let net = cashFlow.operatingDailyNet

  state.financials.cash += net

  if (net > 0) {
    const principalPayment = Math.min(net * 0.08, state.financials.debt, state.financials.cash)
    state.financials.debt -= principalPayment
    state.financials.cash -= principalPayment
    net -= principalPayment
  }

  state.player.monthToDateNet += net

  state.financials.revenueLastTick = cashFlow.dailyRevenue
  state.financials.expensesLastTick = cashFlow.dailyExpenses
  state.financials.netLastTick = net
  state.financials.revenueMonthly = cashFlow.dailyRevenue * 30
  state.financials.expensesMonthly = cashFlow.dailyExpenses * 30
  state.financials.netMonthly = net * 30
  state.financials.averageDailyRent = cashFlow.averageDailyRent
  state.financials.effectiveOccupancyRate = cashFlow.effectiveOccupancyRate
  state.financials.delinquentShare = cashFlow.delinquentShare
  const occupancyStress = Math.max(0, state.facility.occupancyRate - 0.82)
  const backlogGrowth =
    Math.max(0, net < 0 ? Math.min(350, Math.abs(net) * 0.02) : 0) +
    Math.max(0, occupancyStress * 40 + pricePressure * 110)
  const backlogReduction = net > 0 ? Math.min(state.financials.deferredMaintenance, net * 0.015) : 0
  state.financials.deferredMaintenance = clamp(
    state.financials.deferredMaintenance + backlogGrowth - backlogReduction,
    0,
    250000
  )
  state.financials.burnRate = cashFlow.dailyExpenses - cashFlow.dailyRevenue
  state.financials.monthlyDebtService = (state.financials.debt * state.financials.interestRate) / 12
  const facilityValue = state.facility.totalUnits * state.facility.averageRent * 8
  state.financials.valuation = Math.max(0, facilityValue + state.financials.cash - state.financials.debt)

  let creditScore = state.player.creditScore
  const netWorth = state.financials.cash + facilityValue - state.financials.debt
  state.player.cash = state.financials.cash

  if (!state.player.propertyPaidOff && state.financials.debt <= 0.01) {
    state.player.propertyPaidOff = true
    creditScore += 10
    pushLog(state, 'Debt retired—credit bureaus reward your spotless payment record.', 'positive')
  }

  if (netWorth < 0 && previousNetWorth >= 0) {
    creditScore -= 20
    pushLog(state, 'Net worth slipped negative—credit agencies slash your rating.', 'warning')
  }

  if (state.financials.cash < 0) {
    state.financials.cash = 0
    state.player.cash = 0
    state.paused = true
    pushLog(state, 'Cash exhausted. Receivership halts further actions.', 'warning')
    return
  }

  if (monthAdvanced) {
    const netWorthChange = netWorth - previousNetWorth
    const percentChange =
      previousNetWorth > 0
        ? (netWorthChange / previousNetWorth) * 100
        : netWorth !== 0
          ? Math.sign(netWorth) * 5
          : 0

    if (percentChange > 0) {
      creditScore += percentChange * 0.25
    } else if (percentChange < 0) {
      creditScore += percentChange * 0.5
    }

    if (state.player.monthToDateNet < 0) {
      state.player.negativeNetMonthStreak += 1
    } else {
      state.player.negativeNetMonthStreak = 0
    }

    if (state.player.negativeNetMonthStreak >= 3) {
      creditScore -= 5
      state.player.negativeNetMonthStreak = 0
      pushLog(state, 'Credit warning: three consecutive months of negative net income.', 'warning')
    }

    const headroom = 850 - creditScore
    if (headroom > 0) {
      creditScore += headroom * 0.01
    }

    state.player.lastMonthNetWorth = netWorth
    state.player.monthToDateNet = 0
  }

  creditScore = clamp(creditScore, 300, 850)
  state.player.creditScore = creditScore

  if (monthAdvanced) {
    state.player.creditHistory.push(creditScore)
    if (state.player.creditHistory.length > HISTORY_CAP) {
      state.player.creditHistory.shift()
    }
  }

  if (!state.player.buildUnlocked && creditScore >= 750) {
    state.player.buildUnlocked = true
    pushLog(state, 'Credit milestone achieved—development projects unlocked.', 'positive')
  }

  if (!state.player.expansionUnlocked && state.clock.year - state.player.startYear >= 5) {
    state.player.expansionUnlocked = true
    state.player.regionsUnlocked = Array.from(
      new Set([...state.player.regionsUnlocked, 'georgia', 'texas'])
    )
    pushLog(state, 'Five-year review opens Georgia and Texas acquisition pipelines.', 'positive')
  }

  pushHistoryPoint(state.history.cash, state.financials.cash)
  pushHistoryPoint(state.history.net, state.financials.netLastTick)
  pushHistoryPoint(state.history.monthlyNet, state.financials.netMonthly)
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
