import { clamp } from '../simulation/helpers'
import { pmt } from '../utils/loan'
import type {
  FinancingSelection,
  LoanProfile,
  StartFacilityDefinition,
  StartFinancialProjection,
  StartFinancialSnapshot,
  StartPlayerProfile,
  TradeAreaDefinition,
} from '../types/start'

interface StartProjectionInput {
  facility: StartFacilityDefinition
  financing: FinancingSelection
  loan: LoanProfile
  player: StartPlayerProfile
  region: TradeAreaDefinition
}

const toPercentString = (value: number) => `${value.toFixed(2)}%`

const computeRevenue = (facility: StartFacilityDefinition, region: TradeAreaDefinition) => {
  const base = (facility.occupancy * facility.sizeSqft * facility.avgRentPerSqft) / 12
  const demandLift = 0.9 + region.demandIndex * 0.2
  const competitionDrag = 1 - region.competition * 0.05
  return base * demandLift * competitionDrag
}

const computeExpenses = (facility: StartFacilityDefinition, region: TradeAreaDefinition) => {
  const baseline = facility.expensesAnnual / 12
  return baseline * region.operatingCostFactor
}

const clampCredit = (value: number) => clamp(value, 300, 850)

const buildSnapshot = (params: {
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
}): StartFinancialSnapshot => ({
  month: params.month,
  cash: params.cash,
  creditScore: params.creditScore,
  loanBalance: params.loanBalance,
  revenue: params.revenue,
  expenses: params.expenses,
  debtService: params.debtService,
  netIncome: params.netIncome,
  netWorth: params.netWorth,
  creditDelta: params.creditDelta,
  events: params.events,
})

export const computeStartProjection = ({
  facility,
  financing,
  loan,
  player,
  region,
}: StartProjectionInput): StartFinancialProjection => {
  const revenueMonthly = computeRevenue(facility, region)
  const expensesMonthly = computeExpenses(facility, region)

  const cashAfterPurchase = player.cash - loan.downPayment
  const initialEquity = facility.price - loan.loanAmount
  const netWorthAfterPurchase = cashAfterPurchase + initialEquity

  const snapshots: StartFinancialSnapshot[] = []
  const months = 60
  let creditScore = player.creditScore
  let loanBalance = loan.loanAmount
  let currentRate = loan.interestRate
  let monthlyPayment = loan.monthlyPayment
  let totalCreditDelta = 0
  let payoffMonth: number | null = null
  let forcedSaleMonth: number | null = null
  let defaultTriggered = false
  let runwayEstimate = Number.POSITIVE_INFINITY
  let consecutiveNegative = 0
  let previousNetWorth = netWorthAfterPurchase

  for (let month = 1; month <= months; month += 1) {
    if (loanBalance > 0 && financing.rateType === 'variable' && month > 1 && (month - 1) % 12 === 0) {
      const annualStep = Math.min((month - 1) / 12, 5)
      const variableBump = region.climateRisk * 0.004 * annualStep
      currentRate = loan.baseRate + (loan.interestRate - loan.baseRate) + variableBump
      const remainingTerm = Math.max(loan.termMonths - (month - 1), 1)
      monthlyPayment = pmt(currentRate, remainingTerm, loanBalance)
    }

    const monthlyRate = loanBalance > 0 ? currentRate / 12 : 0
    const interestPortion = loanBalance > 0 ? loanBalance * monthlyRate : 0
    const scheduledPayment = loanBalance > 0 ? Math.min(monthlyPayment, loanBalance + interestPortion) : 0
    const principalPortion = loanBalance > 0 ? Math.max(scheduledPayment - interestPortion, 0) : 0
    loanBalance = Math.max(loanBalance - principalPortion, 0)
    const debtService = scheduledPayment

    if (loanBalance <= 0 && payoffMonth === null && debtService > 0) {
      payoffMonth = month
    }

    const netIncome = revenueMonthly - expensesMonthly - debtService

    const cashBefore = month === 1 ? cashAfterPurchase : snapshots[snapshots.length - 1]?.cash ?? cashAfterPurchase
    const cash = cashBefore + netIncome

    const equity = facility.price - loanBalance
    const netWorth = cash + equity

    const netWorthDeltaPercent = previousNetWorth !== 0 ? ((netWorth - previousNetWorth) / Math.max(Math.abs(previousNetWorth), 1)) * 100 : 0

    let creditDelta = 0
    const events: string[] = []

    if (loanBalance > 0) {
      const paymentBump = Math.max(850 - creditScore, 0) * 0.01
      if (paymentBump !== 0) {
        creditDelta += paymentBump
        events.push(`On-time payment +${paymentBump.toFixed(2)} pts`)
      }
    }

    if (netWorthDeltaPercent > 0.001) {
      const gain = netWorthDeltaPercent * 0.25
      creditDelta += gain
      events.push(`Net worth gain ${toPercentString(netWorthDeltaPercent)}`)
    } else if (netWorthDeltaPercent < -0.001) {
      const loss = netWorthDeltaPercent * 0.5
      creditDelta += loss
      events.push(`Net worth loss ${toPercentString(Math.abs(netWorthDeltaPercent))}`)
    }

    if (netIncome < 0) {
      consecutiveNegative += 1
    } else {
      consecutiveNegative = 0
    }

    if (consecutiveNegative >= 3) {
      creditDelta -= 5
      events.push('Three months negative cash flow −5 pts')
      consecutiveNegative = 0
    }

    if (netWorth < 0 && !defaultTriggered) {
      creditDelta -= 20
      events.push('Negative net worth −20 pts')
      defaultTriggered = true
    }

    if (loanBalance <= 0 && payoffMonth === month) {
      creditDelta += 10
      events.push('Property paid off +10 pts')
    }

    creditScore = clampCredit(creditScore + creditDelta)
    totalCreditDelta += creditDelta

    if (cash < 0 && forcedSaleMonth === null) {
      const safeNetIncome = netIncome !== 0 ? Math.abs(netIncome) : 1
      const priorCash = cashBefore
      const partialMonths = priorCash / safeNetIncome
      runwayEstimate = Math.max(month - 1 + partialMonths, 0)
      forcedSaleMonth = month
      events.push('Cash dropped below zero — forced sale risk')
    }

    snapshots.push(
      buildSnapshot({
        month,
        cash,
        creditScore,
        loanBalance,
        revenue: revenueMonthly,
        expenses: expensesMonthly,
        debtService,
        netIncome,
        netWorth,
        creditDelta,
        events,
      })
    )

    previousNetWorth = netWorth

    if (forcedSaleMonth !== null) {
      break
    }
  }

  const firstNetIncome = snapshots[0]?.netIncome ?? revenueMonthly - expensesMonthly - loan.monthlyPayment
  const avgNetIncome = snapshots.length
    ? snapshots.reduce((total, snapshot) => total + snapshot.netIncome, 0) / snapshots.length
    : firstNetIncome

  const endingNetWorth = snapshots[snapshots.length - 1]?.netWorth ?? netWorthAfterPurchase
  const netWorthChangePercent = netWorthAfterPurchase !== 0
    ? ((endingNetWorth - netWorthAfterPurchase) / Math.max(Math.abs(netWorthAfterPurchase), 1)) * 100
    : 0

  if (runwayEstimate === Number.POSITIVE_INFINITY && snapshots.length) {
    const negativeSnapshot = snapshots.find((snapshot) => snapshot.cash < 0)
    if (negativeSnapshot) {
      runwayEstimate = negativeSnapshot.month
    }
  }

  const projection: StartFinancialProjection = {
    revenueMonthly,
    expensesMonthly,
    debtServiceMonthly: loan.monthlyPayment,
    netIncomeMonthly: avgNetIncome,
    cashAfterPurchase,
    netWorthAfterPurchase,
    netWorthChangePercent,
    creditDeltaEstimate: snapshots.length ? totalCreditDelta / snapshots.length : 0,
    runwayMonths: runwayEstimate,
    totalCreditDelta,
    finalCreditScore: snapshots[snapshots.length - 1]?.creditScore ?? player.creditScore,
    payoffMonth,
    forcedSaleMonth,
    defaulted: defaultTriggered || forcedSaleMonth !== null,
    timeline: snapshots,
  }

  return projection
}
