<script lang="ts">
  import { onDestroy } from 'svelte'
  import ActionDeck from './lib/components/ActionDeck.svelte'
  import EventLog from './lib/components/EventLog.svelte'
  import FacilityOverview from './lib/components/FacilityOverview.svelte'
  import MarketPulse from './lib/components/MarketPulse.svelte'
  import PricingControls from './lib/components/PricingControls.svelte'
  import StatBoard from './lib/components/StatBoard.svelte'
  import StartGameFlow from './lib/components/StartGameFlow.svelte'
  import ToplineTicker from './lib/components/ToplineTicker.svelte'
  import { game } from './lib/stores/game'
  import { facilityStart } from './lib/stores/facilityStart'
  import type { GameActionId, GameState } from './lib/types/game'
  import type { StartGameResult } from './lib/types/start'

  let state: GameState
  const speedOptions = [
    { label: '1×', value: 1 },
    { label: '2×', value: 2 },
    { label: '4×', value: 4 },
  ]
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

  const handleSpeedChange = (value: number) => {
    game.setSpeed(value)
  }

  const handleReset = () => {
    game.reset()
    facilityStart.reset()
  }

  const handleSave = () => {
    game.saveSnapshot()
  }

  const handleStartComplete = (event: CustomEvent<StartGameResult>) => {
    game.initialize(event.detail)
    game.start()
  }

  onDestroy(() => {
    unsubscribe()
    game.pause()
  })
</script>

<main class="min-h-screen bg-slate-950 text-slate-100">
  <div class="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
    {#if state}
      {#if state.session.started}
        <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-2">
            <p class="text-[11px] font-semibold uppercase tracking-[0.38em] text-sky-300">Self Storage Mogul</p>
            <h1 class="font-display text-3xl leading-tight text-slate-100 md:text-[2.75rem]">
              The Self Storage Mogul Command Console
            </h1>
            <p class="max-w-2xl text-sm text-slate-300">
              Keep the cash compounding, automate the grind, and surface new angles before competitors smell the arbitrage.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-900/70 px-2 py-1">
              <span class="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">Time Flow</span>
              <div class="flex overflow-hidden rounded-full border border-slate-800/70">
                {#each speedOptions as option}
                  <button
                    type="button"
                    class={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                      state.clock.speed === option.value
                        ? 'bg-sky-500/30 text-sky-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    aria-pressed={state.clock.speed === option.value}
                    on:click={() => handleSpeedChange(option.value)}
                  >
                    {option.label}
                  </button>
                {/each}
              </div>
            </div>
            <button
              class="rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200 transition hover:bg-sky-500/20"
              on:click={handleToggle}
            >
              {state.paused ? 'Resume Simulation' : 'Pause Simulation'}
            </button>
            <button
              class="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              on:click={handleStep}
              disabled={!state.paused}
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

        <ToplineTicker {state} />
        <StatBoard {state} />
        <div class="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div class="space-y-6">
            <MarketPulse {state} />
            <FacilityOverview {state} />
            <PricingControls {state} />
            <ActionDeck {state} on:select={handleAction} />
          </div>
          <EventLog events={state.events} />
        </div>
      {:else}
        <StartGameFlow on:complete={handleStartComplete} />
      {/if}
    {:else}
      <p class="text-slate-400">Loading console…</p>
    {/if}
  </div>
</main>
