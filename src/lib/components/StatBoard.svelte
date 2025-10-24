<script lang="ts">
  import type { GameState } from '../types/game'
  import { formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from '../utils/format'
  import { computeCashFlowSnapshot } from '../simulation/finance'
  import MetricCard from './MetricCard.svelte'

  export let state: GameState

  let netTone: 'default' | 'positive' | 'warning' = 'default'
  let monthlyTone: 'default' | 'positive' | 'warning' = 'default'
  let demandTone: 'default' | 'positive' | 'warning' = 'default'
  let reputationTone: 'default' | 'positive' | 'warning' = 'default'
  let showDailyNetModal = false
  let cashFlowSnapshot = computeCashFlowSnapshot(state)

  const formatSignedCurrency = (value: number) => {
    if (value > 0) {
      return `+${formatCurrency(value)}`
    }

    if (value < 0) {
      return `-${formatCurrency(Math.abs(value))}`
    }

    return formatCurrency(0)
  }

  $: netTone = state.financials.netLastTick >= 0 ? 'positive' : 'warning'
  $: monthlyTone = state.financials.netMonthly >= 0 ? 'positive' : 'warning'
  $: demandTone =
    state.market.demandIndex >= 0.9 ? 'positive' : state.market.demandIndex <= 0.5 ? 'warning' : 'default'
  $: reputationTone = state.facility.reputation >= 70 ? 'positive' : state.facility.reputation <= 45 ? 'warning' : 'default'
  $: cashFlowSnapshot = computeCashFlowSnapshot(state)
  $: revenueBreakdown = cashFlowSnapshot.breakdown.revenue
  $: expenseBreakdown = cashFlowSnapshot.breakdown.expenses
  $: cashTrend = state.history.cash.slice(-24)
  $: netTrend = state.history.net.slice(-24)
  $: monthlyTrend = state.history.monthlyNet.slice(-24)
  $: occupancyTrend = state.history.occupancy.slice(-24)
  $: demandTrend = state.history.demand.slice(-24)
  $: effectiveUnits = Math.round(state.financials.effectiveOccupancyRate * state.facility.totalUnits)
  $: delinquentUnits = Math.round(state.financials.delinquentShare * state.facility.totalUnits)
  $: occupancyHint = `Effective ${formatPercent(state.financials.effectiveOccupancyRate)} (${formatNumber(effectiveUnits)} units) · Delinq ${formatPercent(state.financials.delinquentShare)} (${formatNumber(delinquentUnits)} units)`

  const openDailyNetModal = () => {
    showDailyNetModal = true
  }

  const closeDailyNetModal = () => {
    showDailyNetModal = false
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && showDailyNetModal) {
      closeDailyNetModal()
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
  />
  <MetricCard
    label="Daily Net"
    value={`${formatCurrency(state.financials.netLastTick)} / day`}
    hint={`Rev ${formatCurrency(state.financials.revenueLastTick)} · Exp ${formatCurrency(state.financials.expensesLastTick)}`}
    tone={netTone}
    trend={netTrend}
    onClick={openDailyNetModal}
  />
  <MetricCard
    label="Monthly Cash Flow"
    value={`${formatCurrency(state.financials.netMonthly)} / mo`}
    hint={`Rev ${formatCurrency(state.financials.revenueMonthly)} · Exp ${formatCurrency(state.financials.expensesMonthly)}`}
    tone={monthlyTone}
    trend={monthlyTrend}
  />
  <MetricCard
    label="Occupancy"
    value={formatPercent(state.facility.occupancyRate)}
    hint={occupancyHint}
    tone={state.facility.occupancyRate >= 0.86 ? 'positive' : state.facility.occupancyRate <= 0.6 ? 'warning' : 'default'}
    trend={occupancyTrend}
    trendRange={[0, 1]}
  />
  <MetricCard
    label="Average Rent"
    value={`${formatCurrency(state.facility.averageRent)} / mo`}
    hint={`Daily ${formatCurrency(state.financials.averageDailyRent)} · Mix adjusted`}
  />
  <MetricCard
    label="Market Demand"
    value={formatPercent(state.market.demandIndex)}
    hint={`Trend ${state.market.trend}`}
    tone={demandTone}
    trend={demandTrend}
    trendRange={[0.2, 1.4]}
  />
  <MetricCard
    label="Reputation"
    value={`${Math.round(state.facility.reputation)} / 100`}
    hint={`Brand strength ${formatPercent(state.marketing.brandStrength)}`}
    tone={reputationTone}
  />
  <MetricCard
    label="Portfolio Valuation"
    value={formatCompactCurrency(state.financials.valuation)}
    hint={`Monthly debt ${formatCurrency(state.financials.monthlyDebtService)}`}
  />
</div>

{#if showDailyNetModal}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm"
    on:pointerdown|self={closeDailyNetModal}
  >
    <div
      class="w-full max-w-xl rounded-3xl border border-slate-800/80 bg-slate-950/95 p-6 shadow-2xl shadow-slate-900/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-net-dialog-title"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-[0.32em] text-sky-300">Daily Net</p>
          <h2 id="daily-net-dialog-title" class="mt-1 font-display text-2xl text-slate-100">How today's net is computed</h2>
          <p class="mt-2 text-sm text-slate-400">
            Your daily net cash flow is the revenue collected today minus operating expenses for the same period.
          </p>
        </div>
        <button
          type="button"
          class="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
          on:click={closeDailyNetModal}
        >
          Close
        </button>
      </div>

      <div class="mt-6 grid gap-6 md:grid-cols-2">
        <section class="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
          <h3 class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">Revenue detail</h3>
          <dl class="mt-4 space-y-3">
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-sm font-medium text-slate-300">Paying tenants</dt>
              <dd class="font-display text-base text-emerald-300">{formatSignedCurrency(revenueBreakdown.payingTenants)}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-sm font-medium text-slate-300">Payment plans collected</dt>
              <dd class="font-display text-base text-emerald-200">{formatSignedCurrency(revenueBreakdown.delinquentCollections)}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-sm font-medium text-slate-300">Manager bonus lift</dt>
              <dd class="font-display text-base text-emerald-200">{formatSignedCurrency(revenueBreakdown.managerLift)}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-sm font-medium text-slate-300">Specials discount drag</dt>
              <dd class="font-display text-base text-amber-300">{formatSignedCurrency(revenueBreakdown.specialsDiscountImpact)}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-t border-slate-800/60 pt-3">
              <dt class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Total collected</dt>
              <dd class="font-display text-lg text-slate-100">{formatCurrency(cashFlowSnapshot.dailyRevenue)}</dd>
            </div>
          </dl>
        </section>

        <section class="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
          <h3 class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">Expense detail</h3>
          <dl class="mt-4 space-y-3">
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-sm font-medium text-slate-300">Operations & staffing</dt>
              <dd class="font-display text-base text-amber-300">{formatSignedCurrency(-expenseBreakdown.operations)}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-sm font-medium text-slate-300">Marketing momentum</dt>
              <dd class="font-display text-base text-amber-300">{formatSignedCurrency(-expenseBreakdown.marketing)}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-sm font-medium text-slate-300">Automation upkeep</dt>
              <dd class="font-display text-base text-amber-300">{formatSignedCurrency(-expenseBreakdown.automation)}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-sm font-medium text-slate-300">Interest on debt</dt>
              <dd class="font-display text-base text-amber-300">{formatSignedCurrency(-expenseBreakdown.interest)}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-sm font-medium text-slate-300">Climate insurance</dt>
              <dd class="font-display text-base text-amber-300">{formatSignedCurrency(-expenseBreakdown.insurance)}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4 border-t border-slate-800/60 pt-3">
              <dt class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Total expenses</dt>
              <dd class="font-display text-lg text-slate-100">{formatCurrency(cashFlowSnapshot.dailyExpenses)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <p class="mt-6 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 text-sm text-slate-300">
        <span class="font-semibold text-slate-100">Net today:</span>
        <span class="ml-2 text-slate-200">{formatCurrency(cashFlowSnapshot.dailyRevenue)} - {formatCurrency(cashFlowSnapshot.dailyExpenses)} = {formatCurrency(cashFlowSnapshot.operatingDailyNet)}</span>
      </p>
    </div>
  </div>
{/if}
