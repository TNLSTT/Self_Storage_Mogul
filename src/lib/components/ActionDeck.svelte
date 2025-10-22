<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { GameActionId, GameState } from '../types/game'
  import { ACTION_DEFINITIONS } from '../data/actions'
  import { formatCurrency } from '../utils/format'

  export let state: GameState

  const dispatch = createEventDispatcher<{ select: GameActionId }>()

  const handleSelect = (action: GameActionId) => {
    dispatch('select', action)
  }

  $: availableActions = ACTION_DEFINITIONS.filter((definition) =>
    state.unlockedActions.includes(definition.id)
  )
</script>

<section class="rounded-3xl border border-slate-800/70 bg-slate-900/50 p-6 shadow-xl shadow-sky-900/10">
  <header class="flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-display text-xl text-slate-100">Command Deck</h2>
      <p class="text-sm text-slate-400">Deploy capital, marketing, and AI to bend the market in your favor.</p>
    </div>
  </header>

  {#if availableActions.length > 0}
    <div class="grid gap-4 md:grid-cols-2">
      {#each availableActions as action (action.id)}
        {@const cooldown = state.cooldowns[action.id] ?? 0}
        {@const canAfford = state.financials.cash >= action.cost}
        {@const disabled = cooldown > 0 || !canAfford}
        {@const statusLabel = cooldown > 0 ? `Cooling down (${cooldown}d)` : canAfford ? 'Ready' : 'Need capital'}
        <button
          type="button"
          class={`group flex flex-col rounded-2xl border px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            disabled
              ? 'cursor-not-allowed border-slate-800/70 bg-slate-900/40 opacity-60'
              : 'border-slate-700/70 bg-slate-900/70 hover:border-sky-400/60 hover:bg-slate-900/90 hover:shadow-neon'
          }`}
          on:click={() => handleSelect(action.id)}
          disabled={disabled}
          aria-disabled={disabled}
          title={`${action.title} · ${statusLabel}`}
        >
          <div class="flex items-center justify-between gap-3">
            <span class="text-2xl">{action.icon}</span>
            <span class={`text-xs font-semibold uppercase tracking-widest ${disabled ? 'text-slate-500' : 'text-slate-300'}`}>
              {statusLabel}
            </span>
          </div>
          <h3 class="mt-3 font-display text-lg text-slate-100">{action.title}</h3>
          <p class="mt-2 text-sm text-slate-400">{action.description}</p>
          <p class="mt-3 text-sm text-slate-300">{action.impact}</p>
          <div class="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>Cost {formatCurrency(action.cost)}</span>
            <span class={canAfford ? 'text-emerald-300' : 'text-amber-300'}>{statusLabel}</span>
          </div>
        </button>
      {/each}
    </div>
  {:else}
    <p class="mt-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 px-5 py-4 text-sm text-slate-400">
      Strategic directives will unlock as you stabilize cash flow and hit key occupancy or automation targets.
    </p>
  {/if}
</section>
