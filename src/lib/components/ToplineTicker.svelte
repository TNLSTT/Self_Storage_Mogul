<script lang="ts">
  import type { GameState } from '../types/game'
  import { formatClock } from '../simulation/tick'
  import { formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from '../utils/format'

  export let state: GameState

  const formatSpeed = (value: number) =>
    Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)

  $: goalProgressRatio = state.goals.target > 0 ? Math.min(state.goals.progress / state.goals.target, 1) : 0
  $: goalProgressValue = Math.round(goalProgressRatio * 100)
  $: availableUnits = Math.max(state.facility.totalUnits - state.facility.occupiedUnits, 0)
  $: runwayDays =
    state.financials.burnRate > 0
      ? Math.max(Math.floor(state.financials.cash / state.financials.burnRate), 0)
      : null
  $: debtRatio =
    state.financials.valuation > 0 ? Math.min(state.financials.debt / state.financials.valuation, 4) : null
  $: demandDelta = state.market.demandIndex - state.market.lastDemandIndex
  $: demandHint = `${demandDelta >= 0 ? '+' : ''}${formatPercent(demandDelta)} vs last`
  $: goalHint = (() => {
    switch (state.goals.metric) {
      case 'valuation':
        return `Target ${formatCompactCurrency(state.goals.target)}`
      case 'automation':
      case 'occupancy':
      default:
        return `Target ${formatPercent(state.goals.target)}`
    }
  })()
  $: monthlyNetClass = state.financials.netMonthly >= 0 ? 'text-emerald-300' : 'text-rose-300'
  $: monthlyCashHint = `Rev ${formatCurrency(state.financials.revenueMonthly)} · Exp ${formatCurrency(state.financials.expensesMonthly)}`
  $: occupancyHint = `Vacant ${formatNumber(availableUnits)} units · Effective ${formatPercent(state.financials.effectiveOccupancyRate)}`
</script>

<section class="rounded-2xl border border-slate-800/80 bg-slate-900/70 px-4 py-3 shadow-sm">
  <div class="overflow-x-auto">
    <div class="flex min-w-max flex-nowrap gap-3">
      <div class="metric metric--highlight">
        <p class="metric-label">Current Date</p>
        <p class="metric-value">{formatClock(state)}</p>
        <p class="metric-hint">Speed ×{formatSpeed(state.clock.speed)}</p>
      </div>
      <div class="metric">
        <p class="metric-label">Cash on hand</p>
        <p class="metric-value">{formatCurrency(state.financials.cash)}</p>
        <p class="metric-hint">Debt {formatCurrency(state.financials.debt)}</p>
      </div>
      <div class="metric">
        <p class="metric-label">Daily net</p>
        <p class={`metric-value ${state.financials.netLastTick >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {formatCurrency(state.financials.netLastTick)} / day
        </p>
        <p class="metric-hint">
          Rev {formatCurrency(state.financials.revenueLastTick)} · Exp {formatCurrency(state.financials.expensesLastTick)}
        </p>
      </div>
      <div class="metric">
        <p class="metric-label">Monthly cash flow</p>
        <p class={`metric-value ${monthlyNetClass}`}>
          {formatCurrency(state.financials.netMonthly)} / mo
        </p>
        <p class="metric-hint">{monthlyCashHint}</p>
      </div>
      <div class="metric">
        <p class="metric-label">Credit score</p>
        <p class={`metric-value ${state.player.creditScore >= 750 ? 'text-emerald-300' : ''}`}>
          {Math.round(state.player.creditScore)}
        </p>
        <p class="metric-hint">
          LTV {formatPercent(state.player.loanToValue)} · {state.player.buildUnlocked ? 'Build unlocked' : 'Build locks at 750'}
        </p>
      </div>
      <div class="metric">
        <p class="metric-label">Portfolio value</p>
        <p class="metric-value">{formatCompactCurrency(state.financials.valuation)}</p>
        {#if debtRatio !== null}
          <p class="metric-hint">Leverage {formatPercent(debtRatio)}</p>
        {/if}
      </div>
      <div class="metric">
        <p class="metric-label">Occupancy</p>
        <p
          class={`metric-value ${
            state.facility.occupancyRate >= 0.9
              ? 'text-emerald-300'
              : state.facility.occupancyRate <= 0.6
                ? 'text-amber-300'
                : 'text-slate-100'
          }`}
        >
          {formatPercent(state.facility.occupancyRate)}
        </p>
        <p class="metric-hint">{occupancyHint}</p>
      </div>
      <div class="metric">
        <p class="metric-label">Market demand</p>
        <p class="metric-value">{formatPercent(state.market.demandIndex)}</p>
        <p class="metric-hint">{demandHint}</p>
      </div>
      <div class="metric">
        <p class="metric-label">Automation</p>
        <p class="metric-value">{formatPercent(state.automation.level)}</p>
        <p class="metric-hint">Reliability {formatPercent(state.automation.reliability)}</p>
      </div>
      <div class="metric">
        <p class="metric-label">Runway</p>
        {#if runwayDays === null}
          <p class="metric-value text-emerald-300">Profitable</p>
          <p class="metric-hint">Burn {formatCurrency(state.financials.burnRate)} / day</p>
        {:else}
          <p class={`metric-value ${runwayDays <= 45 ? 'text-amber-300' : 'text-slate-100'}`}>
            {runwayDays} days
          </p>
          <p class="metric-hint">Burn {formatCurrency(state.financials.burnRate)} / day</p>
        {/if}
      </div>
      <div class="metric">
        <p class="metric-label">{state.goals.label}</p>
        <p class={`metric-value ${goalProgressRatio >= 1 ? 'text-emerald-300' : 'text-slate-100'}`}>
          {goalProgressValue}%
        </p>
        <p class="metric-hint">{goalHint}</p>
      </div>
    </div>
  </div>
</section>

<style lang="postcss">
  .metric {
    @apply min-w-[160px] rounded-xl border border-slate-800/80 bg-slate-950/80 px-4 py-3;
  }

  .metric--highlight {
    @apply border-sky-500/40 bg-sky-500/5;
  }

  .metric--highlight .metric-label {
    @apply text-sky-300;
  }

  .metric--highlight .metric-value {
    @apply text-sky-100;
  }

  .metric--highlight .metric-hint {
    @apply text-sky-200/80;
  }

  .metric-label {
    @apply text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400;
  }

  .metric-value {
    @apply font-display text-xl leading-tight text-slate-100;
  }

  .metric-hint {
    @apply text-xs text-slate-500;
  }
</style>
