<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { GameActionId, GameState } from '../types/game'
  import { ACTION_LOOKUP } from '../data/actions'
  import { formatCurrency } from '../utils/format'

  export let state: GameState

  const dispatch = createEventDispatcher<{ select: GameActionId }>()

  const handleSelect = (action: GameActionId) => {
    dispatch('select', action)
  }
</script>

<section class="rounded-3xl border border-slate-800/70 bg-slate-900/50 p-6 shadow-xl shadow-sky-900/10">
  <header class="flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-display text-xl text-slate-100">Command Deck</h2>
      <p class="text-sm text-slate-400">Deploy capital, marketing, and AI to bend the market in your favor.</p>
    </div>
  </header>

  <div class="grid gap-4 md:grid-cols-2">
    {#each state.unlockedActions as id (id)}
      {@const action = ACTION_LOOKUP[id]}
      {#if action}
        {@const cooldown = state.cooldowns[id] ?? 0}
        {@const disabled = cooldown > 0 || state.financials.cash < action.cost}
        <button
          class={`group flex flex-col rounded-2xl border px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            disabled
              ? 'cursor-not-allowed border-slate-800/70 bg-slate-900/40 opacity-60'
              : 'border-slate-700/70 bg-slate-900/70 hover:border-sky-400/60 hover:bg-slate-900/90 hover:shadow-neon'
          }`}
          on:click={() => !disabled && handleSelect(id)}
          disabled={disabled}
        >
          <div class="flex items-center justify-between gap-3">
            <span class="text-2xl">{action.icon}</span>
            <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {cooldown > 0 ? `Cooldown ${cooldown}d` : 'Ready'}
            </span>
          </div>
          <h3 class="mt-3 font-display text-lg text-slate-100">{action.title}</h3>
          <p class="mt-2 text-sm text-slate-400">{action.description}</p>
          <p class="mt-3 text-sm text-slate-300">{action.impact}</p>
          <div class="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>Cost {formatCurrency(action.cost)}</span>
            <span class={state.financials.cash >= action.cost ? 'text-emerald-300' : 'text-amber-300'}>
              {state.financials.cash >= action.cost ? 'Funded' : 'Need capital'}
            </span>
          </div>
        </button>
      {/if}
    {/each}
  </div>
</section>
