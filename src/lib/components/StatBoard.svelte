<script lang="ts">
  import type { GameState } from '../types/game'
  import { formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from '../utils/format'
  import { computeCashFlowSnapshot } from '../simulation/finance'
  import { clamp } from '../simulation/helpers'
  import { computeTierAverageRate, evictionUrgencyFactor } from '../utils/facility'
  import MetricCard from './MetricCard.svelte'
  import MetricInsightsModal, { type MetricModalData } from './MetricInsightsModal.svelte'

  type MetricTone = 'default' | 'positive' | 'warning'
  type MetricId =
    | 'liquidity'
    | 'daily-net'
    | 'monthly-cash-flow'
    | 'occupancy'
    | 'average-rent'
    | 'market-demand'
    | 'reputation'
    | 'valuation'

  export let state: GameState

  let netTone: MetricTone = 'default'
  let monthlyTone: MetricTone = 'default'
  let demandTone: MetricTone = 'default'
  let reputationTone: MetricTone = 'default'
  let cashFlowSnapshot = computeCashFlowSnapshot(state)
  let activeMetricId: MetricId | null = null

  const formatSignedCurrency = (value: number) => {
    if (value > 0) {
      return `+${formatCurrency(value)}`
    }

    if (value < 0) {
      return `-${formatCurrency(Math.abs(value))}`
    }

    return formatCurrency(0)
  }

  const formatSignedPercent = (value: number) => {
    if (value > 0) {
      return `+${formatPercent(value)}`
    }

    if (value < 0) {
      return `-${formatPercent(Math.abs(value))}`
    }

    return formatPercent(0)
  }

  const formatUnitCount = (value: number) => formatNumber(Math.round(value))

  const multipleFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  })
  const formatMultiple = (value: number) => `${multipleFormatter.format(value)}×`

  const specialsAdoption = () =>
    state.facility.pricing.specials.offer === 'one_month_free'
      ? clamp(state.facility.pricing.specials.adoptionRate, 0, 1)
      : 0

  const specialsBoost = () => specialsAdoption() * 0.05

  const openMetricModal = (metricId: MetricId) => {
    activeMetricId = metricId
  }

  const closeMetricModal = () => {
    activeMetricId = null
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && activeMetricId) {
      closeMetricModal()
    }
  }

  $: cashFlowSnapshot = computeCashFlowSnapshot(state)
  $: revenueBreakdown = cashFlowSnapshot.breakdown.revenue
  $: expenseBreakdown = cashFlowSnapshot.breakdown.expenses
  $: netTone = state.financials.netLastTick >= 0 ? 'positive' : 'warning'
  $: monthlyTone = state.financials.netMonthly >= 0 ? 'positive' : 'warning'
  $: demandTone =
    state.market.demandIndex >= 0.9 ? 'positive' : state.market.demandIndex <= 0.5 ? 'warning' : 'default'
  $: reputationTone =
    state.facility.reputation >= 70 ? 'positive' : state.facility.reputation <= 45 ? 'warning' : 'default'
  $: cashTrend = state.history.cash.slice(-24)
  $: netTrend = state.history.net.slice(-24)
  $: monthlyTrend = state.history.monthlyNet.slice(-24)
  $: occupancyTrend = state.history.occupancy.slice(-24)
  $: demandTrend = state.history.demand.slice(-24)
  $: creditTrend = (state.player.creditHistory ?? []).slice(-24)
  $: creditTone =
    state.player.creditScore >= 750 ? 'positive' : state.player.creditScore <= 640 ? 'warning' : 'default'
  $: effectiveUnits = Math.round(cashFlowSnapshot.effectiveOccupancyRate * state.facility.totalUnits)
  $: delinquentUnits = Math.round(cashFlowSnapshot.units.delinquent)
  $: occupancyHint = `Effective ${formatPercent(cashFlowSnapshot.effectiveOccupancyRate)} (${formatUnitCount(effectiveUnits)} units) · Delinq ${formatPercent(cashFlowSnapshot.delinquentShare)} (${formatUnitCount(delinquentUnits)} units)`
  $: activeMetric = activeMetricId ? buildMetricDetail(activeMetricId) : null

  const buildMetricDetail = (metricId: MetricId): MetricModalData => {
    switch (metricId) {
      case 'liquidity': {
        const dailyBurn = state.financials.burnRate
        const burningCash = dailyBurn > 0
        const runwayDays = burningCash && dailyBurn > 1 ? Math.floor(state.financials.cash / dailyBurn) : null
        const monthlyBurn = dailyBurn * 30
        const debtServiceCoverage =
          state.financials.monthlyDebtService > 0
            ? (state.financials.netMonthly + state.financials.monthlyDebtService) /
              state.financials.monthlyDebtService
            : null
        const cashToDebtRatio = state.financials.debt > 0 ? state.financials.cash / state.financials.debt : null
        const runwayCopy = burningCash
          ? runwayDays !== null
            ? `Covers roughly ${runwayDays} days at a burn of ${formatCurrency(dailyBurn)} per day.`
            : 'Burn is minimal right now; monitor expenses as conditions change.'
          : `Operations add ${formatCurrency(Math.abs(dailyBurn))} per day before principal payments.`
        return {
          id: 'liquidity',
          label: 'Liquidity',
          title: 'Where your cash position comes from',
          description:
            'Liquidity captures the cash you have ready to deploy after covering debt, burn, and maintenance obligations.',
          sections: [
            {
              title: 'Reserves and inflows',
              accent: 'emerald',
              items: [
                {
                  label: 'Cash on hand',
                  value: formatCurrency(state.financials.cash),
                  tone: 'positive',
                },
                {
                  label: 'Daily net flow',
                  value: `${formatSignedCurrency(state.financials.netLastTick)} / day`,
                  tone: state.financials.netLastTick >= 0 ? 'positive' : 'negative',
                  description: 'After staffing, automation, marketing, and interest costs.',
                },
                {
                  label: 'Monthly net cash flow',
                  value: `${formatSignedCurrency(state.financials.netMonthly)} / mo`,
                  tone: state.financials.netMonthly >= 0 ? 'positive' : 'negative',
                },
              ],
            },
            {
              title: 'Obligations and drag',
              accent: 'amber',
              items: [
                {
                  label: 'Debt outstanding',
                  value: formatCurrency(state.financials.debt),
                  tone: 'negative',
                },
                {
                  label: 'Monthly debt service',
                  value: formatCurrency(state.financials.monthlyDebtService),
                  tone: 'negative',
                },
                {
                  label: 'Deferred maintenance backlog',
                  value: formatCurrency(state.financials.deferredMaintenance),
                  tone: 'negative',
                  description: 'Capital projects waiting for funding pressure available cash.',
                },
                {
                  label: 'Operating burn (monthly)',
                  value: formatCurrency(Math.abs(monthlyBurn)),
                  tone: burningCash ? 'negative' : 'positive',
                  description: burningCash
                    ? 'Current expenses exceed operating revenue before principal paydown.'
                    : 'Operations are generating cash before principal paydown.',
                },
              ],
            },
            {
              title: 'Coverage & runway',
              accent: 'sky',
              items: [
                {
                  label: 'Daily burn rate',
                  value: `${formatSignedCurrency(-dailyBurn)} / day`,
                  tone: burningCash ? 'negative' : 'positive',
                  description: burningCash
                    ? 'Net cash outflow before principal payments.'
                    : 'Positive daily net after operating expenses.',
                },
                {
                  label: 'Debt service coverage',
                  value:
                    debtServiceCoverage !== null
                      ? formatMultiple(debtServiceCoverage)
                      : 'No debt service',
                  tone:
                    debtServiceCoverage !== null && debtServiceCoverage < 1.1 ? 'negative' : 'positive',
                  description:
                    debtServiceCoverage !== null
                      ? 'Covers monthly debt service after operating expenses.'
                      : 'No scheduled debt service this month.',
                },
                {
                  label: 'Cash-to-debt ratio',
                  value: cashToDebtRatio !== null ? formatMultiple(cashToDebtRatio) : 'Debt free',
                  tone: cashToDebtRatio !== null && cashToDebtRatio < 0.5 ? 'negative' : 'positive',
                  description: cashToDebtRatio !== null
                    ? 'Higher ratios mean more liquidity relative to leverage.'
                    : 'No leverage on the balance sheet.',
                },
                {
                  label: 'Runway',
                  value:
                    burningCash && runwayDays !== null
                      ? `${runwayDays} days`
                      : burningCash
                        ? 'Short runway'
                        : 'Growing cash',
                  tone: burningCash
                    ? runwayDays !== null && runwayDays < 45
                      ? 'negative'
                      : 'neutral'
                    : 'positive',
                  description: burningCash
                    ? runwayDays !== null
                      ? 'Time until cash is exhausted at current burn.'
                      : 'Burn too small to measure precisely—stay alert.'
                    : 'Positive daily net extends operating runway.',
                },
              ],
            },
          ],
          summary: {
            label: 'Liquidity outlook',
            value: formatCurrency(state.financials.cash),
            description: runwayCopy,
          },
        }
      }
      case 'daily-net': {
        const totalUnits = Math.max(state.facility.totalUnits, 1)
        const revenuePerUnit = cashFlowSnapshot.dailyRevenue / totalUnits
        const expensePerUnit = cashFlowSnapshot.dailyExpenses / totalUnits
        const netPerUnit = cashFlowSnapshot.operatingDailyNet / totalUnits
        const netMargin =
          cashFlowSnapshot.dailyRevenue !== 0
            ? cashFlowSnapshot.operatingDailyNet / cashFlowSnapshot.dailyRevenue
            : 0
        return {
          id: 'daily-net',
          label: 'Daily Net',
          title: "How today's net is computed",
          description:
            'Your daily net cash flow is the revenue collected today minus operating expenses for the same period.',
          sections: [
            {
              title: 'Revenue detail',
              accent: 'emerald',
              items: [
                {
                  label: 'Paying tenants',
                  value: formatSignedCurrency(revenueBreakdown.payingTenants),
                  tone: 'positive',
                },
                {
                  label: 'Payment plans collected',
                  value: formatSignedCurrency(revenueBreakdown.delinquentCollections),
                  tone: 'positive',
                },
                {
                  label: 'Manager bonus lift',
                  value: formatSignedCurrency(revenueBreakdown.managerLift),
                  tone: 'positive',
                },
                {
                  label: 'Specials discount drag',
                  value: formatSignedCurrency(revenueBreakdown.specialsDiscountImpact),
                  tone: 'negative',
                },
              ],
              footer: {
                label: 'Total collected',
                value: formatCurrency(cashFlowSnapshot.dailyRevenue),
              },
            },
            {
              title: 'Expense detail',
              accent: 'amber',
              items: [
                {
                  label: 'Operations & staffing',
                  value: formatSignedCurrency(-expenseBreakdown.operations),
                  tone: 'negative',
                },
                {
                  label: 'Marketing momentum',
                  value: formatSignedCurrency(-expenseBreakdown.marketing),
                  tone: 'negative',
                },
                {
                  label: 'Automation upkeep',
                  value: formatSignedCurrency(-expenseBreakdown.automation),
                  tone: 'negative',
                },
                {
                  label: 'Interest on debt',
                  value: formatSignedCurrency(-expenseBreakdown.interest),
                  tone: 'negative',
                },
                {
                  label: 'Climate insurance',
                  value: formatSignedCurrency(-expenseBreakdown.insurance),
                  tone: 'negative',
                },
              ],
              footer: {
                label: 'Total expenses',
                value: formatCurrency(cashFlowSnapshot.dailyExpenses),
              },
            },
            {
              title: 'Per-unit performance',
              accent: 'sky',
              items: [
                {
                  label: 'Revenue per occupied unit',
                  value: `${formatCurrency(revenuePerUnit)} / day`,
                  description: 'Average collected rent including delinquent recoveries.',
                },
                {
                  label: 'Expenses per unit',
                  value: `${formatCurrency(expensePerUnit)} / day`,
                  tone: 'negative',
                },
                {
                  label: 'Net per unit',
                  value: `${formatSignedCurrency(netPerUnit)} / day`,
                  tone: netPerUnit >= 0 ? 'positive' : 'negative',
                },
                {
                  label: 'Net margin',
                  value: formatSignedPercent(netMargin),
                  tone: netMargin >= 0 ? 'positive' : 'negative',
                  description: 'Portion of revenue left after daily expenses.',
                },
              ],
            },
          ],
          summary: {
            label: 'Net today',
            value: `${formatCurrency(cashFlowSnapshot.dailyRevenue)} - ${formatCurrency(cashFlowSnapshot.dailyExpenses)} = ${formatCurrency(cashFlowSnapshot.operatingDailyNet)}`,
            description: `Margin ${formatSignedPercent(netMargin)} across ${formatUnitCount(state.facility.totalUnits)} units.`,
          },
        }
      }
      case 'monthly-cash-flow': {
        const factor = 30
        const monthlyRevenue = cashFlowSnapshot.dailyRevenue * factor
        const monthlyExpenses = cashFlowSnapshot.dailyExpenses * factor
        const monthlyNet = cashFlowSnapshot.operatingDailyNet * factor
        const monthlyMargin = monthlyRevenue !== 0 ? monthlyNet / monthlyRevenue : 0
        const debtCoverage =
          state.financials.monthlyDebtService > 0
            ? (monthlyNet + state.financials.monthlyDebtService) / state.financials.monthlyDebtService
            : null
        const netAfterDebt = state.financials.monthlyDebtService > 0
          ? monthlyNet - state.financials.monthlyDebtService
          : monthlyNet
        return {
          id: 'monthly-cash-flow',
          label: 'Monthly Cash Flow',
          title: 'Monthly net drivers',
          description: 'Monthly cash flow annualizes the same revenue and expense mix you see in the daily snapshot.',
          sections: [
            {
              title: 'Revenue detail (30-day run rate)',
              accent: 'emerald',
              items: [
                {
                  label: 'Paying tenants',
                  value: formatSignedCurrency(revenueBreakdown.payingTenants * factor),
                  tone: 'positive',
                },
                {
                  label: 'Payment plans collected',
                  value: formatSignedCurrency(revenueBreakdown.delinquentCollections * factor),
                  tone: 'positive',
                },
                {
                  label: 'Manager bonus lift',
                  value: formatSignedCurrency(revenueBreakdown.managerLift * factor),
                  tone: 'positive',
                },
                {
                  label: 'Specials discount drag',
                  value: formatSignedCurrency(revenueBreakdown.specialsDiscountImpact * factor),
                  tone: 'negative',
                },
              ],
              footer: {
                label: 'Monthly revenue',
                value: formatCurrency(monthlyRevenue),
              },
            },
            {
              title: 'Expense detail (30-day run rate)',
              accent: 'amber',
              items: [
                {
                  label: 'Operations & staffing',
                  value: formatSignedCurrency(-expenseBreakdown.operations * factor),
                  tone: 'negative',
                },
                {
                  label: 'Marketing momentum',
                  value: formatSignedCurrency(-expenseBreakdown.marketing * factor),
                  tone: 'negative',
                },
                {
                  label: 'Automation upkeep',
                  value: formatSignedCurrency(-expenseBreakdown.automation * factor),
                  tone: 'negative',
                },
                {
                  label: 'Interest on debt',
                  value: formatSignedCurrency(-expenseBreakdown.interest * factor),
                  tone: 'negative',
                },
                {
                  label: 'Climate insurance',
                  value: formatSignedCurrency(-expenseBreakdown.insurance * factor),
                  tone: 'negative',
                },
              ],
              footer: {
                label: 'Monthly expenses',
                value: formatCurrency(monthlyExpenses),
              },
            },
            {
              title: 'Margins & coverage',
              accent: 'sky',
              items: [
                {
                  label: 'Net margin',
                  value: formatSignedPercent(monthlyMargin),
                  tone: monthlyMargin >= 0 ? 'positive' : 'negative',
                  description: 'Share of monthly revenue that remains after expenses.',
                },
                {
                  label: 'Debt service coverage',
                  value: debtCoverage !== null ? formatMultiple(debtCoverage) : 'No debt service',
                  tone: debtCoverage !== null && debtCoverage < 1.1 ? 'negative' : 'positive',
                  description:
                    debtCoverage !== null
                      ? 'Cushion before debt payments using operating cash flow.'
                      : 'No scheduled debt service this month.',
                },
                {
                  label: 'Net after debt service',
                  value: `${formatSignedCurrency(netAfterDebt)} / mo`,
                  tone: netAfterDebt >= 0 ? 'positive' : 'negative',
                  description: 'Surplus (or deficit) once debt service is covered.',
                },
              ],
            },
          ],
          summary: {
            label: 'Monthly net',
            value: `${formatCurrency(monthlyRevenue)} - ${formatCurrency(monthlyExpenses)} = ${formatCurrency(monthlyNet)}`,
            description:
              debtCoverage !== null
                ? `Coverage ${formatMultiple(debtCoverage)} · Margin ${formatSignedPercent(monthlyMargin)}`
                : `Margin ${formatSignedPercent(monthlyMargin)} with no debt service owed.`,
          },
        }
      }
      case 'occupancy': {
        const totalUnits = state.facility.totalUnits
        const occupiedUnits = state.facility.occupiedUnits
        const vacantUnits = Math.max(0, totalUnits - occupiedUnits)
        const payingUnits = cashFlowSnapshot.units.paying
        const delinquentUnitsRaw = cashFlowSnapshot.units.delinquent
        const collectionRate = cashFlowSnapshot.modifiers.collectionRate
        const effectiveBilledUnits = payingUnits + delinquentUnitsRaw * collectionRate
        const occupancyChange =
          occupancyTrend.length >= 2
            ? occupancyTrend[occupancyTrend.length - 1] - occupancyTrend[0]
            : 0
        const effectiveGap = cashFlowSnapshot.effectiveOccupancyRate - state.facility.occupancyRate
        const billingEfficiency = state.facility.occupancyRate > 0
          ? cashFlowSnapshot.effectiveOccupancyRate / state.facility.occupancyRate
          : 0
        return {
          id: 'occupancy',
          label: 'Occupancy',
          title: 'What fills your facility',
          description:
            'Physical occupancy shows who is in units, while effective occupancy reflects how many of those tenants are paying.',
          sections: [
            {
              title: 'Physical capacity',
              accent: 'sky',
              items: [
                {
                  label: 'Total units',
                  value: formatUnitCount(totalUnits),
                },
                {
                  label: 'Occupied units',
                  value: `${formatUnitCount(occupiedUnits)} (${formatPercent(state.facility.occupancyRate)})`,
                  tone: 'positive',
                },
                {
                  label: 'Vacant units',
                  value: `${formatUnitCount(vacantUnits)}`,
                  tone: 'negative',
                },
              ],
              footer: {
                label: 'Physical occupancy',
                value: formatPercent(state.facility.occupancyRate),
              },
            },
            {
              title: 'Billing mix',
              accent: 'emerald',
              items: [
                {
                  label: 'Paying tenants',
                  value: formatUnitCount(payingUnits),
                  description: 'Fully current accounts in good standing.',
                },
                {
                  label: 'Delinquent accounts',
                  value: formatUnitCount(delinquentUnitsRaw),
                  tone: 'negative',
                  description: `Collection rate ${formatPercent(collectionRate)} on payment plans.`,
                },
                {
                  label: 'Effective billed units',
                  value: `${formatUnitCount(effectiveBilledUnits)} (${formatPercent(cashFlowSnapshot.effectiveOccupancyRate)})`,
                  tone: 'positive',
                  description: 'Paying units plus collected portions of delinquent accounts.',
                },
              ],
              footer: {
                label: 'Delinquent share',
                value: formatPercent(cashFlowSnapshot.delinquentShare),
                description: 'Portion of total units currently past due.',
              },
            },
            {
              title: 'Trend & efficiency',
              accent: 'slate',
              items: [
                {
                  label: 'Occupancy change (recent)',
                  value: formatSignedPercent(occupancyChange),
                  tone: occupancyChange >= 0 ? 'positive' : 'negative',
                  description: 'Change across the latest 24 ticks.',
                },
                {
                  label: 'Effective vs physical',
                  value: formatSignedPercent(effectiveGap),
                  tone: effectiveGap >= 0 ? 'positive' : 'negative',
                  description: 'Positive values mean collections exceed physical occupancy.',
                },
                {
                  label: 'Billing efficiency',
                  value: formatPercent(clamp(billingEfficiency, 0, 1)),
                  tone: billingEfficiency >= 0.95 ? 'positive' : billingEfficiency <= 0.85 ? 'negative' : 'neutral',
                  description: 'Effective occupancy as a share of physical occupancy.',
                },
              ],
            },
          ],
          summary: {
            label: 'Effective occupancy',
            value: `${formatPercent(cashFlowSnapshot.effectiveOccupancyRate)} billed vs ${formatPercent(state.facility.occupancyRate)} physical`,
            description: `Delinquent accounts represent ${formatPercent(cashFlowSnapshot.delinquentShare)} of the footprint · Recent change ${formatSignedPercent(occupancyChange)}.`,
          },
        }
      }
      case 'average-rent': {
        const categories = [
          {
            label: 'Climate-controlled',
            units: state.facility.mix.climateControlled.units,
            rate: computeTierAverageRate(state.facility.pricing.climateControlled),
            primeShare: state.facility.pricing.climateControlled.primeShare,
            primePremium:
              state.facility.pricing.climateControlled.prime - state.facility.pricing.climateControlled.standard,
          },
          {
            label: 'Drive-up',
            units: state.facility.mix.driveUp.units,
            rate: computeTierAverageRate(state.facility.pricing.driveUp),
            primeShare: state.facility.pricing.driveUp.primeShare,
            primePremium: state.facility.pricing.driveUp.prime - state.facility.pricing.driveUp.standard,
          },
          {
            label: 'Vault',
            units: state.facility.mix.vault.units,
            rate: computeTierAverageRate(state.facility.pricing.vault),
            primeShare: state.facility.pricing.vault.primeShare,
            primePremium: state.facility.pricing.vault.prime - state.facility.pricing.vault.standard,
          },
        ]
        const totalUnits = categories.reduce((sum, category) => sum + category.units, 0)
        const specialsDiscount = cashFlowSnapshot.modifiers.specialsDiscount
        const managerBonus = cashFlowSnapshot.modifiers.managerBonus
        const specialsRate = specialsAdoption()
        const priceToMarket = state.market.referenceRent
          ? (state.facility.averageRent - state.market.referenceRent) / state.market.referenceRent
          : 0
        const overallPrimeShare =
          totalUnits > 0
            ? categories.reduce((sum, category) => sum + category.units * category.primeShare, 0) / totalUnits
            : 0
        const weightedPrimePremium =
          totalUnits > 0
            ? categories.reduce(
                (sum, category) => sum + category.units * category.primePremium * category.primeShare,
                0
              ) /
              totalUnits
            : 0
        return {
          id: 'average-rent',
          label: 'Average Rent',
          title: 'How the blended rate is built',
          description: 'Average rent is a mix-weighted blend of each product type adjusted by specials and manager performance.',
          sections: [
            {
              title: 'Product mix',
              accent: 'emerald',
              items: categories.map((category) => ({
                label: category.label,
                value: `${formatCurrency(category.rate)} / mo`,
                description:
                  totalUnits > 0
                    ? `${formatPercent(category.units / totalUnits)} of units · ${formatPercent(category.primeShare)} prime mix`
                    : 'No inventory in this segment.',
              })),
            },
            {
              title: 'Modifiers',
              accent: 'sky',
              items: [
                {
                  label: 'Specials discount',
                  value: specialsDiscount > 0 ? formatSignedPercent(-specialsDiscount) : 'None',
                  tone: specialsDiscount > 0 ? 'negative' : 'neutral',
                  description: specialsDiscount > 0 ? 'Effective rent drag from active move-in specials.' : 'No active specials applied.',
                },
                {
                  label: 'Manager revenue lift',
                  value: formatSignedPercent(managerBonus),
                  tone: managerBonus >= 0 ? 'positive' : 'negative',
                  description: state.automation.aiManager
                    ? `${state.automation.aiManager.name} bonus applied to collections.`
                    : 'Hire an AI manager to unlock revenue bonuses.',
                },
                {
                  label: 'Delinquent collection factor',
                  value: formatPercent(cashFlowSnapshot.modifiers.collectionRate),
                  tone:
                    cashFlowSnapshot.modifiers.collectionRate >= 0.75
                      ? 'positive'
                      : cashFlowSnapshot.modifiers.collectionRate <= 0.5
                        ? 'negative'
                        : 'neutral',
                  description: 'Portion of delinquent balances recovered through payment plans.',
                },
              ],
            },
            {
              title: 'Rate positioning',
              accent: 'amber',
              items: [
                {
                  label: 'Reference rent baseline',
                  value:
                    state.market.referenceRent > 0
                      ? `${formatCurrency(state.market.referenceRent)} / mo`
                      : 'No comps',
                  description: 'Local comps guiding tenant expectations.',
                },
                {
                  label: 'Price vs market comps',
                  value:
                    state.market.referenceRent > 0 ? formatSignedPercent(priceToMarket) : formatSignedPercent(0),
                  tone:
                    priceToMarket > 0.05 ? 'negative' : priceToMarket < -0.05 ? 'positive' : 'neutral',
                  description: 'Premium (or discount) relative to prevailing market rents.',
                },
                {
                  label: 'Prime unit share',
                  value: formatPercent(overallPrimeShare),
                  tone: overallPrimeShare >= 0.5 ? 'positive' : 'neutral',
                  description: `Weighted prime mix adds roughly ${formatCurrency(weightedPrimePremium)} to rents where active.`,
                },
                {
                  label: 'Specials adoption',
                  value: specialsRate > 0 ? formatPercent(specialsRate) : formatPercent(0),
                  tone: specialsRate > 0.4 ? 'negative' : 'neutral',
                  description: specialsRate > 0
                    ? 'Share of tenants currently taking move-in specials.'
                    : 'No tenants on move-in specials right now.',
                },
              ],
            },
          ],
          summary: {
            label: 'Blended average rent',
            value: `${formatCurrency(state.facility.averageRent)} / mo`,
            description: `Daily equivalent ${formatCurrency(state.financials.averageDailyRent)} with current mix and modifiers.`,
          },
        }
      }
      case 'market-demand': {
        const marketingLift =
          state.marketing.level * 0.025 + state.marketing.momentum * 0.2 + state.marketing.brandStrength * 0.12
        const automationLift = state.automation.level * 0.04
        const reputationLift = (state.facility.reputation - 60) / 140
        const specials = specialsBoost()
        const pricePressure = Math.max(
          0,
          state.market.referenceRent
            ? (state.facility.averageRent - state.market.referenceRent) / state.market.referenceRent
            : 0
        )
        const competitionDrag = state.market.competitionPressure * 0.05
        const tailwindTotal = marketingLift + automationLift + reputationLift + specials
        const dragTotal = pricePressure * 0.5 + competitionDrag
        const demandDelta = state.market.demandIndex - state.market.lastDemandIndex
        const trendLabel = `${state.market.trend.charAt(0).toUpperCase()}${state.market.trend.slice(1)}`
        return {
          id: 'market-demand',
          label: 'Market Demand',
          title: 'Signals moving the demand index',
          description:
            'The demand index blends marketing, automation reach, reputation, and pricing pressure into a single leasing outlook.',
          sections: [
            {
              title: 'Tailwinds',
              accent: 'emerald',
              items: [
                {
                  label: 'Marketing engine',
                  value: formatSignedPercent(marketingLift),
                  tone: 'positive',
                  description: 'Level, momentum, and brand strength pulling customers in.',
                },
                {
                  label: 'Automation reach',
                  value: formatSignedPercent(automationLift),
                  tone: 'positive',
                },
                {
                  label: 'Reputation halo',
                  value: formatSignedPercent(reputationLift),
                  tone: 'positive',
                },
                {
                  label: 'Move-in specials boost',
                  value: specials > 0 ? formatSignedPercent(specials) : formatSignedPercent(0),
                  tone: specials > 0 ? 'positive' : 'neutral',
                  description: specials > 0 ? 'Short-term lift from active promotions.' : 'No active special-driven lift.',
                },
              ],
              footer: {
                label: 'Combined lift',
                value: formatSignedPercent(tailwindTotal),
              },
            },
            {
              title: 'Headwinds',
              accent: 'amber',
              items: [
                {
                  label: 'Price pressure',
                  value: formatSignedPercent(-pricePressure * 0.5),
                  tone: 'negative',
                  description: 'Premium vs market comps reduces conversion.',
                },
                {
                  label: 'Competition drag',
                  value: formatSignedPercent(-competitionDrag),
                  tone: 'negative',
                  description: 'Nearby facilities nibbling at market share.',
                },
              ],
              footer: {
                label: 'Combined drag',
                value: formatSignedPercent(-dragTotal),
              },
            },
            {
              title: 'Market context',
              accent: 'slate',
              items: [
                {
                  label: 'Current demand index',
                  value: formatPercent(state.market.demandIndex),
                },
                {
                  label: 'Trend narrative',
                  value: trendLabel,
                  description: state.market.storyBeat,
                },
                {
                  label: 'Competition pressure',
                  value: formatPercent(state.market.competitionPressure),
                  tone:
                    state.market.competitionPressure >= 0.6
                      ? 'negative'
                      : state.market.competitionPressure <= 0.3
                        ? 'positive'
                        : 'neutral',
                },
                {
                  label: 'Reference rent anchor',
                  value:
                    state.market.referenceRent > 0
                      ? `${formatCurrency(state.market.referenceRent)} / mo`
                      : 'No comps',
                },
              ],
            },
          ],
          summary: {
            label: 'Current demand index',
            value: `${formatPercent(state.market.demandIndex)} (${state.market.trend})`,
            description: `Change vs last tick ${formatSignedPercent(demandDelta)} · Net impact ${formatSignedPercent(tailwindTotal - dragTotal)}.`,
          },
        }
      }
      case 'reputation': {
        const specials = specialsBoost()
        const paymentPlanBoost = state.facility.delinquency.allowPaymentPlans ? 0.03 : 0
        const pricePressure = Math.max(
          0,
          state.market.referenceRent
            ? (state.facility.averageRent - state.market.referenceRent) / state.market.referenceRent
            : 0
        )
        const delinquencyPolicy = state.facility.delinquency
        const delinquencyRate = clamp(delinquencyPolicy.rate, 0, 0.3)
        const evictionUrgency = evictionUrgencyFactor(delinquencyPolicy)
        const delinquencyDrag =
          delinquencyRate * (delinquencyPolicy.allowPaymentPlans ? 0.05 : 0.12) + evictionUrgency * 0.05
        const occupancyContribution = state.facility.occupancyRate * 0.65
        const brandContribution = state.marketing.brandStrength * 0.2
        const reliabilityContribution = state.automation.reliability * 0.1
        const specialsContribution = specials * 0.4
        const priceDrag = pricePressure * 0.4
        const delightTotal =
          occupancyContribution + brandContribution + reliabilityContribution + specialsContribution + paymentPlanBoost
        const frictionTotal = priceDrag + delinquencyDrag
        const rawSatisfaction = delightTotal - frictionTotal
        const satisfaction = clamp(rawSatisfaction, -1, 1)
        return {
          id: 'reputation',
          label: 'Reputation',
          title: 'Inputs that move reputation',
          description:
            'Reputation responds to the experience tenants have—from occupancy and brand to delinquency friction and pricing.',
          sections: [
            {
              title: 'Delight drivers',
              accent: 'emerald',
              items: [
                {
                  label: 'Strong occupancy',
                  value: formatSignedPercent(occupancyContribution),
                  tone: 'positive',
                },
                {
                  label: 'Brand strength',
                  value: formatSignedPercent(brandContribution),
                  tone: 'positive',
                },
                {
                  label: 'Automation reliability',
                  value: formatSignedPercent(reliabilityContribution),
                  tone: 'positive',
                },
                {
                  label: 'Move-in specials delight',
                  value: specialsContribution > 0 ? formatSignedPercent(specialsContribution) : formatSignedPercent(0),
                  tone: specialsContribution > 0 ? 'positive' : 'neutral',
                },
                {
                  label: 'Payment plan goodwill',
                  value: paymentPlanBoost > 0 ? formatSignedPercent(paymentPlanBoost) : formatSignedPercent(0),
                  tone: paymentPlanBoost > 0 ? 'positive' : 'neutral',
                },
              ],
              footer: {
                label: 'Total delight',
                value: formatSignedPercent(delightTotal),
              },
            },
            {
              title: 'Friction points',
              accent: 'amber',
              items: [
                {
                  label: 'Price pressure drag',
                  value: formatSignedPercent(-priceDrag),
                  tone: 'negative',
                },
                {
                  label: 'Delinquency friction',
                  value: formatSignedPercent(-delinquencyDrag),
                  tone: 'negative',
                },
              ],
              footer: {
                label: 'Total drag',
                value: formatSignedPercent(-frictionTotal),
              },
            },
            {
              title: 'Policy levers',
              accent: 'slate',
              items: [
                {
                  label: 'Delinquency rate',
                  value: formatPercent(delinquencyRate),
                  tone: delinquencyRate <= 0.08 ? 'positive' : delinquencyRate >= 0.18 ? 'negative' : 'neutral',
                  description: 'Share of occupied tenants currently past due.',
                },
                {
                  label: 'Payment plans',
                  value: delinquencyPolicy.allowPaymentPlans ? 'Enabled' : 'Disabled',
                  tone: delinquencyPolicy.allowPaymentPlans ? 'positive' : 'negative',
                  description: delinquencyPolicy.allowPaymentPlans
                    ? 'Softer collections reduce churn but can extend delinquency.'
                    : 'Strict policy keeps balances cleaner at the cost of goodwill.',
                },
                {
                  label: 'Eviction urgency',
                  value: formatPercent(evictionUrgency),
                  tone: evictionUrgency >= 0.5 ? 'negative' : 'neutral',
                  description: `Policy clears accounts after ${Math.round(delinquencyPolicy.evictionDays)} days past due.`,
                },
              ],
            },
          ],
          summary: {
            label: 'Reputation standing',
            value: `${Math.round(state.facility.reputation)} / 100`,
            description: `Net satisfaction signal ${formatSignedPercent(satisfaction)} (raw ${formatSignedPercent(rawSatisfaction)} before safeguards).`,
          },
        }
      }
      case 'valuation': {
        const baseAssetValue = state.facility.totalUnits * state.facility.averageRent * 8
        const valuation = Math.max(0, state.financials.valuation)
        const equity = valuation - state.financials.debt
        const loanToValue = baseAssetValue > 0 ? state.financials.debt / baseAssetValue : 0
        const cashYield = baseAssetValue > 0 ? (state.financials.netMonthly * 12) / baseAssetValue : 0
        return {
          id: 'valuation',
          label: 'Portfolio Valuation',
          title: 'How valuation is composed',
          description:
            'Valuation blends the income potential of your units with cash reserves, then subtracts outstanding debt.',
          sections: [
            {
              title: 'Operating asset',
              accent: 'emerald',
              items: [
                {
                  label: 'Rentable units',
                  value: formatUnitCount(state.facility.totalUnits),
                },
                {
                  label: 'Blended monthly rent',
                  value: formatCurrency(state.facility.averageRent),
                },
                {
                  label: 'Income multiplier',
                  value: '×8',
                  description: 'Stabilized NOI multiple applied to the facility.',
                },
              ],
              footer: {
                label: 'Facility value (pre cash/debt)',
                value: formatCurrency(baseAssetValue),
              },
            },
            {
              title: 'Capital stack adjustments',
              accent: 'sky',
              items: [
                {
                  label: 'Cash reserves',
                  value: formatCurrency(state.financials.cash),
                  tone: 'positive',
                },
                {
                  label: 'Debt outstanding',
                  value: formatCurrency(state.financials.debt),
                  tone: 'negative',
                },
                {
                  label: 'Deferred maintenance (off-book)',
                  value: formatCurrency(state.financials.deferredMaintenance),
                  tone: 'negative',
                  description: 'Backlog not yet deducted from valuation but signals future capital needs.',
                },
              ],
            },
            {
              title: 'Equity snapshot',
              accent: 'slate',
              items: [
                {
                  label: 'Owner equity',
                  value: formatCurrency(equity),
                  tone: equity >= 0 ? 'positive' : 'negative',
                  description: 'Valuation less outstanding debt.',
                },
                {
                  label: 'Loan-to-value',
                  value: formatPercent(loanToValue),
                  tone: loanToValue <= 0.6 ? 'positive' : loanToValue >= 0.8 ? 'negative' : 'neutral',
                  description: 'Lower ratios signal more equity cushion.',
                },
                {
                  label: 'Implied cash yield',
                  value: formatSignedPercent(cashYield),
                  tone: cashYield >= 0.08 ? 'positive' : cashYield <= 0 ? 'negative' : 'neutral',
                  description: 'Annualized net cash flow relative to base asset value.',
                },
              ],
            },
          ],
          summary: {
            label: 'Valuation roll-up',
            value: `${formatCurrency(baseAssetValue)} + ${formatCurrency(state.financials.cash)} - ${formatCurrency(state.financials.debt)} = ${formatCompactCurrency(valuation)}`,
            description: `Backlog and market swings can shift the multiplier over time—watch debt paydown to unlock equity (LTV ${formatPercent(loanToValue)}).`,
          },
        }
      }
      default:
        return {
          id: 'daily-net',
          label: 'Daily Net',
          title: '',
          description: '',
          sections: [],
        }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  <MetricCard
    label="Liquidity"
    value={formatCurrency(state.financials.cash)}
    hint={`Debt ${formatCurrency(state.financials.debt)}`}
    trend={cashTrend}
    onClick={() => openMetricModal('liquidity')}
  />
  <MetricCard
    label="Credit Score"
    value={`${Math.round(state.player.creditScore)}`}
    hint={`LTV cap ${formatPercent(state.player.loanToValue)}`}
    tone={creditTone}
    trend={creditTrend}
    trendRange={[300, 850]}
  />
  <MetricCard
    label="Daily Net"
    value={`${formatCurrency(state.financials.netLastTick)} / day`}
    hint={`Rev ${formatCurrency(state.financials.revenueLastTick)} · Exp ${formatCurrency(state.financials.expensesLastTick)}`}
    tone={netTone}
    trend={netTrend}
    onClick={() => openMetricModal('daily-net')}
  />
  <MetricCard
    label="Monthly Cash Flow"
    value={`${formatCurrency(state.financials.netMonthly)} / mo`}
    hint={`Rev ${formatCurrency(state.financials.revenueMonthly)} · Exp ${formatCurrency(state.financials.expensesMonthly)}`}
    tone={monthlyTone}
    trend={monthlyTrend}
    onClick={() => openMetricModal('monthly-cash-flow')}
  />
  <MetricCard
    label="Occupancy"
    value={formatPercent(state.facility.occupancyRate)}
    hint={occupancyHint}
    tone={state.facility.occupancyRate >= 0.86 ? 'positive' : state.facility.occupancyRate <= 0.6 ? 'warning' : 'default'}
    trend={occupancyTrend}
    trendRange={[0, 1]}
    onClick={() => openMetricModal('occupancy')}
  />
  <MetricCard
    label="Average Rent"
    value={`${formatCurrency(state.facility.averageRent)} / mo`}
    hint={`Daily ${formatCurrency(state.financials.averageDailyRent)} · Mix adjusted`}
    onClick={() => openMetricModal('average-rent')}
  />
  <MetricCard
    label="Market Demand"
    value={formatPercent(state.market.demandIndex)}
    hint={`Trend ${state.market.trend}`}
    tone={demandTone}
    trend={demandTrend}
    trendRange={[0.2, 1.4]}
    onClick={() => openMetricModal('market-demand')}
  />
  <MetricCard
    label="Reputation"
    value={`${Math.round(state.facility.reputation)} / 100`}
    hint={`Brand strength ${formatPercent(state.marketing.brandStrength)}`}
    tone={reputationTone}
    onClick={() => openMetricModal('reputation')}
  />
  <MetricCard
    label="Portfolio Valuation"
    value={formatCompactCurrency(state.financials.valuation)}
    hint={`Monthly debt ${formatCurrency(state.financials.monthlyDebtService)}`}
    onClick={() => openMetricModal('valuation')}
  />
</div>

<MetricInsightsModal metric={activeMetric} onClose={closeMetricModal} />
