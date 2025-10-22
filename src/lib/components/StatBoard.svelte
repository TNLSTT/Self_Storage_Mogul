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
</script>

<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  <MetricCard
    label="Liquidity"
    value={formatCurrency(state.financials.cash)}
    hint={`Debt ${formatCurrency(state.financials.debt)}`}
  />
  <MetricCard
    label="Daily Net"
    value={`${formatCurrency(state.financials.netLastTick)} / day`}
    hint={`Rev ${formatCurrency(state.financials.revenueLastTick)} · Exp ${formatCurrency(state.financials.expensesLastTick)}`}
    tone={netTone}
  />
  <MetricCard
    label="Occupancy"
    value={formatPercent(state.facility.occupancyRate)}
    hint={`${formatNumber(state.facility.occupiedUnits)} of ${formatNumber(state.facility.totalUnits)} units`}
    tone={state.facility.occupancyRate >= 0.86 ? 'positive' : state.facility.occupancyRate <= 0.6 ? 'warning' : 'default'}
  />
  <MetricCard
    label="Market Demand"
    value={formatPercent(state.market.demandIndex)}
    hint={`Trend ${state.market.trend}`}
    tone={demandTone}
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
