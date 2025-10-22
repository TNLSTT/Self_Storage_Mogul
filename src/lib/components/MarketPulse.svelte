<script lang="ts">
  import type { GameState } from '../types/game'
  import { formatCurrency, formatPercent } from '../utils/format'
  import { formatClock } from '../simulation/tick'

  export let state: GameState

  $: goalPercent = state.goals.target > 0 ? Math.min(state.goals.progress / state.goals.target, 1) : 0
  $: goalProgressDisplay =
    state.goals.metric === 'valuation' ? formatCurrency(state.goals.progress) : formatPercent(state.goals.progress)
  $: goalTargetDisplay =
    state.goals.metric === 'valuation' ? formatCurrency(state.goals.target) : formatPercent(state.goals.target)
</script>

<section class="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
  <header class="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-display text-xl text-slate-100">Market Pulse</h2>
      <p class="text-sm text-slate-400">{formatClock(state)} · {state.city}</p>
    </div>
    <div class="flex items-center gap-3 text-sm text-slate-400">
      <span class="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1">
        <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true"></span>
        {state.paused ? 'Paused' : 'Running'}
      </span>
      <span class="hidden sm:inline">Trend · {state.market.trend}</span>
    </div>
  </header>

  <div class="grid gap-6 lg:grid-cols-2">
    <div class="space-y-3">
      <p class="text-sm text-slate-300">
        {state.market.storyBeat}
      </p>
      <div>
        <div class="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
          <span>{state.goals.label}</span>
          <span>
            {goalProgressDisplay}
            <span class="text-slate-500"> / {goalTargetDisplay}</span>
          </span>
        </div>
        <div class="mt-1 h-2 w-full rounded-full bg-slate-800/80">
          <div
            class="h-full rounded-full bg-sky-400 transition-all"
            style={`width: ${Math.min(goalPercent * 100, 100)}%`}
          ></div>
        </div>
        <p class="mt-2 text-sm text-slate-400">{state.goals.description}</p>
      </div>
    </div>

    <dl class="grid grid-cols-2 gap-3 text-sm text-slate-300">
      <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
        <dt class="text-xs uppercase tracking-wider text-slate-400">Reference Rent</dt>
        <dd class="mt-1 font-medium text-slate-100">{formatCurrency(state.market.referenceRent)}/mo</dd>
      </div>
      <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
        <dt class="text-xs uppercase tracking-wider text-slate-400">Competition Pressure</dt>
        <dd class="mt-1 font-medium text-slate-100">{formatPercent(state.market.competitionPressure)}</dd>
      </div>
      <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
        <dt class="text-xs uppercase tracking-wider text-slate-400">Climate Risk</dt>
        <dd class="mt-1 font-medium text-slate-100">{formatPercent(state.market.climateRisk)}</dd>
      </div>
      <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
        <dt class="text-xs uppercase tracking-wider text-slate-400">Automation Level</dt>
        <dd class="mt-1 font-medium text-slate-100">{formatPercent(state.automation.level)}</dd>
        {#if state.automation.aiManager}
          <p class="mt-1 text-xs text-slate-400">{state.automation.aiManager.name} online</p>
        {:else}
          <p class="mt-1 text-xs text-slate-500">Manual crews handling ops</p>
        {/if}
      </div>
    </dl>
  </div>
</section>
