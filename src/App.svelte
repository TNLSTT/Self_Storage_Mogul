<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import ActionDeck from './lib/components/ActionDeck.svelte'
  import EventLog from './lib/components/EventLog.svelte'
  import FacilityOverview from './lib/components/FacilityOverview.svelte'
  import MarketPulse from './lib/components/MarketPulse.svelte'
  import StatBoard from './lib/components/StatBoard.svelte'
  import ToplineTicker from './lib/components/ToplineTicker.svelte'
  import { game } from './lib/stores/game'
  import type { GameActionId, GameState } from './lib/types/game'

  let state: GameState
  const unsubscribe = game.subscribe((value) => {
    state = value
  })

  const handleAction = (event: CustomEvent<GameActionId>) => {
    game.applyAction(event.detail)
  }

  const handleToggle = () => {
    game.toggle()
  }

  const handleStep = () => {
    game.step()
  }

  const handleReset = () => {
    game.reset()
  }

  const handleSave = () => {
    game.saveSnapshot()
  }

  onMount(() => {
    game.start()
  })

  onDestroy(() => {
    unsubscribe()
    game.pause()
  })
</script>

<main class="min-h-screen bg-slate-950 text-slate-100">
  <div class="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-[0.38em] text-sky-300">Self Storage Mogul</p>
        <h1 class="font-display text-3xl leading-tight text-slate-100 md:text-[2.75rem]">
          Harbor One Command Console
        </h1>
        <p class="max-w-2xl text-sm text-slate-300">
          Keep the cash compounding, automate the grind, and surface new angles before competitors smell the arbitrage.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200 transition hover:bg-sky-500/20"
          on:click={handleToggle}
        >
          {state?.paused ? 'Resume Simulation' : 'Pause Simulation'}
        </button>
        <button
          class="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
          on:click={handleStep}
          disabled={!state?.paused}
        >
          Advance One Day
        </button>
        <button
          class="rounded-full border border-slate-800/80 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-rose-400 hover:text-rose-200"
          on:click={handleReset}
        >
          Reset Scenario
        </button>
        <button
          class="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-500/20"
          on:click={handleSave}
        >
          Save Snapshot
        </button>
      </div>
    </header>

    {#if state}
      <ToplineTicker {state} />
      <StatBoard {state} />
      <div class="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div class="space-y-6">
          <MarketPulse {state} />
          <FacilityOverview {state} />
          <ActionDeck {state} on:select={handleAction} />
        </div>
        <EventLog events={state.events} />
      </div>
    {:else}
      <p class="text-slate-400">Loading console…</p>
    {/if}
  </div>
</main>
