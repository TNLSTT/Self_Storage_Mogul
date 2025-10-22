export type LogTone = 'info' | 'positive' | 'warning'

export type GameActionId =
  | 'expand_capacity'
  | 'launch_campaign'
  | 'optimize_pricing'
  | 'train_ai_manager'

export type GoalMetric = 'occupancy' | 'automation' | 'valuation'

export interface HistoryState {
  cash: number[]
  net: number[]
  monthlyNet: number[]
  occupancy: number[]
  demand: number[]
}

export interface ClockState {
  day: number
  month: number
  year: number
  speed: number
}

export interface FacilityMixCategory {
  units: number
  dimensions: string[]
}

export interface FacilityMix {
  climateControlled: FacilityMixCategory
  driveUp: FacilityMixCategory
  vault: FacilityMixCategory
}

export interface PricingTier {
  standard: number
  prime: number
  primeShare: number
}

export interface PricingSpecials {
  offer: 'none' | 'one_month_free'
  adoptionRate: number
}

export interface FacilityPricing {
  climateControlled: PricingTier
  driveUp: PricingTier
  vault: PricingTier
  specials: PricingSpecials
}

export interface DelinquencyPolicy {
  baseRate: number
  rate: number
  allowPaymentPlans: boolean
  evictionDays: number
}

export interface FacilityState {
  name: string
  location: string
  totalUnits: number
  occupiedUnits: number
  occupancyRate: number
  averageRent: number
  mix: FacilityMix
  pricing: FacilityPricing
  delinquency: DelinquencyPolicy
  reputation: number
  automationLevel: number
  prestige: number
}

export interface FinancialState {
  cash: number
  debt: number
  interestRate: number
  revenueLastTick: number
  expensesLastTick: number
  netLastTick: number
  revenueMonthly: number
  expensesMonthly: number
  netMonthly: number
  averageDailyRent: number
  effectiveOccupancyRate: number
  delinquentShare: number
  valuation: number
  monthlyDebtService: number
  burnRate: number
  deferredMaintenance: number
}

export interface MarketingState {
  level: number
  momentum: number
  brandStrength: number
}

export interface MarketIntel {
  demandIndex: number
  referenceRent: number
  competitionPressure: number
  climateRisk: number
  trend: 'surging' | 'stable' | 'softening'
  storyBeat: string
  lastDemandIndex: number
}

export interface ManagerProfile {
  id: string
  name: string
  archetype: 'atlas' | 'nebula' | 'caretaker'
  description: string
  bonuses: {
    automation: number
    reputation: number
    revenue: number
  }
  active: boolean
}

export interface AutomationState {
  level: number
  reliability: number
  aiManager: ManagerProfile | null
}

export interface GoalState {
  id: 'stabilize' | 'automate' | 'scale'
  label: string
  description: string
  metric: GoalMetric
  target: number
  progress: number
  completed: boolean
}

export interface GameLogEntry {
  id: number
  tick: number
  tone: LogTone
  message: string
  year: number
  month: number
  day: number
}

export interface ActionDefinition {
  id: GameActionId
  title: string
  description: string
  impact: string
  cost: number
  cooldown: number
  icon: string
}

export interface GameState {
  tick: number
  clock: ClockState
  city: string
  facility: FacilityState
  financials: FinancialState
  marketing: MarketingState
  market: MarketIntel
  automation: AutomationState
  goals: GoalState
  goalStage: number
  events: GameLogEntry[]
  unlockedActions: GameActionId[]
  cooldowns: Partial<Record<GameActionId, number>>
  seed: number
  logSequence: number
  paused: boolean
  history: HistoryState
}
