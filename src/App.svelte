<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import ActionDeck from './lib/components/ActionDeck.svelte'
  import EventLog from './lib/components/EventLog.svelte'
  import FacilityOverview from './lib/components/FacilityOverview.svelte'
  import MarketPulse from './lib/components/MarketPulse.svelte'
  import StatBoard from './lib/components/StatBoard.svelte'
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
  <div class="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
    <header class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-[0.4em] text-sky-300">Self Storage Mogul</p>
        <h1 class="font-display text-4xl leading-tight text-slate-100 md:text-5xl">
          Harbor One Command Console
        </h1>
        <p class="max-w-2xl text-sm text-slate-300 md:text-base">
          Stabilize the flagship facility, lean on automation, and spin up financial engineering worthy of a galactic storage
          empire.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="rounded-full border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20"
          on:click={handleToggle}
        >
          {state?.paused ? 'Resume Simulation' : 'Pause Simulation'}
        </button>
        <button
          class="rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
          on:click={handleStep}
          disabled={!state?.paused}
        >
          Advance One Day
        </button>
        <button
          class="rounded-full border border-slate-800/80 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-rose-400 hover:text-rose-200"
          on:click={handleReset}
        >
          Reset Scenario
        </button>
        <button
          class="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
          on:click={handleSave}
        >
          Save Snapshot
        </button>
      </div>
    </header>

    {#if state}
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
