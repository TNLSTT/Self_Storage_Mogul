<script lang="ts">
  import type { GameState } from '../types/game'
  import { formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from '../utils/format'
  import MetricCard from './MetricCard.svelte'

  export let state: GameState

  let netTone: 'default' | 'positive' | 'warning' = 'default'
  let monthlyTone: 'default' | 'positive' | 'warning' = 'default'
  let demandTone: 'default' | 'positive' | 'warning' = 'default'
  let reputationTone: 'default' | 'positive' | 'warning' = 'default'
  let showDailyNetModal = false

  $: netTone = state.financials.netLastTick >= 0 ? 'positive' : 'warning'
  $: monthlyTone = state.financials.netMonthly >= 0 ? 'positive' : 'warning'
  $: demandTone =
    state.market.demandIndex >= 0.9 ? 'positive' : state.market.demandIndex <= 0.5 ? 'warning' : 'default'
  $: reputationTone = state.facility.reputation >= 70 ? 'positive' : state.facility.reputation <= 45 ? 'warning' : 'default'
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

      <dl class="mt-6 space-y-4">
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-sm font-medium text-slate-300">Revenue collected</dt>
          <dd class="font-display text-lg text-emerald-300">{formatCurrency(state.financials.revenueLastTick)}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-sm font-medium text-slate-300">Operating expenses</dt>
          <dd class="font-display text-lg text-amber-300">{formatCurrency(state.financials.expensesLastTick)}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-4 border-t border-slate-800/70 pt-4">
          <dt class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Daily net</dt>
          <dd class="font-display text-xl text-slate-100">{formatCurrency(state.financials.netLastTick)}</dd>
        </div>
      </dl>

      <p class="mt-6 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 text-sm text-slate-400">
        <span class="font-semibold text-slate-200">Formula:</span>
        <span class="ml-2 text-slate-300">{formatCurrency(state.financials.revenueLastTick)} - {formatCurrency(state.financials.expensesLastTick)} = {formatCurrency(state.financials.netLastTick)}</span>
      </p>
    </div>
  </div>
{/if}
