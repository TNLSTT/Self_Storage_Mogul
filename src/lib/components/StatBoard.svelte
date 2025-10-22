<script lang="ts">
  import type { GameState } from '../types/game'
  import { formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from '../utils/format'
  import MetricCard from './MetricCard.svelte'

  export let state: GameState

  let netTone: 'default' | 'positive' | 'warning' = 'default'
  let demandTone: 'default' | 'positive' | 'warning' = 'default'
  let reputationTone: 'default' | 'positive' | 'warning' = 'default'

  $: netTone = state.financials.netLastTick >= 0 ? 'positive' : 'warning'
  $: demandTone =
    state.market.demandIndex >= 0.9 ? 'positive' : state.market.demandIndex <= 0.5 ? 'warning' : 'default'
  $: reputationTone = state.facility.reputation >= 70 ? 'positive' : state.facility.reputation <= 45 ? 'warning' : 'default'
  $: cashTrend = state.history.cash.slice(-24)
  $: netTrend = state.history.net.slice(-24)
  $: occupancyTrend = state.history.occupancy.slice(-24)
  $: demandTrend = state.history.demand.slice(-24)
</script>

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
  />
  <MetricCard
    label="Occupancy"
    value={formatPercent(state.facility.occupancyRate)}
    hint={`${formatNumber(state.facility.occupiedUnits)} of ${formatNumber(state.facility.totalUnits)} units`}
    tone={state.facility.occupancyRate >= 0.86 ? 'positive' : state.facility.occupancyRate <= 0.6 ? 'warning' : 'default'}
    trend={occupancyTrend}
    trendRange={[0, 1]}
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
