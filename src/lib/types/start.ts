export type RateType = 'fixed' | 'variable'

export interface TradeAreaDefinition {
  id: string
  name: string
  demandIndex: number
  competition: number
  operatingCostFactor: number
  baseRate: number
  climateRisk: number
  avgCapRate: number
  description: string
}

export interface StartFacilityDefinition {
  id: string
  regionId: string
  name: string
  city: string
  price: number
  sizeSqft: number
  occupancy: number
  avgRentPerSqft: number
  expensesAnnual: number
  issues: string[]
  expansionPotential: number
  totalUnits: number
  debtService: number
  mix: {
    climateControlled: number
    driveUp: number
    vault: number
  }
}

export interface FinancingSelection {
  downPaymentPercent: number
  termYears: 10 | 20 | 25
  rateType: RateType
}

export interface LoanProfile {
  loanAmount: number
  downPayment: number
  termMonths: number
  interestRate: number
  rateType: RateType
  monthlyPayment: number
  baseRate: number
}

export interface StartPlayerProfile {
  cash: number
  creditScore: number
  loanToValue: number
  maxPurchase: number
}

export interface StartFinancialSnapshot {
  month: number
  cash: number
  creditScore: number
  loanBalance: number
  revenue: number
  expenses: number
  debtService: number
  netIncome: number
  netWorth: number
  creditDelta: number
  events: string[]
}

export interface StartGameResult {
  region: TradeAreaDefinition
  facility: StartFacilityDefinition
  financing: FinancingSelection
  loan: LoanProfile
  player: StartPlayerProfile & { cashAfterPurchase: number }
  projection: StartFinancialProjection
  seed: number
}

export interface StartFinancialProjection {
  revenueMonthly: number
  expensesMonthly: number
  debtServiceMonthly: number
  netIncomeMonthly: number
  cashAfterPurchase: number
  netWorthAfterPurchase: number
  netWorthChangePercent: number
  creditDeltaEstimate: number
  runwayMonths: number
  totalCreditDelta: number
  finalCreditScore: number
  payoffMonth: number | null
  forcedSaleMonth: number | null
  defaulted: boolean
  timeline: StartFinancialSnapshot[]
}
