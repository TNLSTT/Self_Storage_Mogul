<script lang="ts">
  import type { GameLogEntry } from '../types/game'

  export let events: GameLogEntry[] = []
</script>

<section class="rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-inner shadow-slate-900/60">
  <header class="pb-4">
    <h2 class="font-display text-xl text-slate-100">Operations Feed</h2>
    <p class="text-sm text-slate-400">AI scribes summarize notable swings, risks, and wins.</p>
  </header>
  <ul class="space-y-3">
    {#if events.length === 0}
      <li class="rounded-2xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
        No dispatches yet—kick off the simulation to generate activity.
      </li>
    {:else}
      {#each events as event (event.id)}
        {@const toneClass =
          event.tone === 'positive'
            ? 'border-emerald-400/40 bg-emerald-500/10'
            : event.tone === 'warning'
              ? 'border-amber-400/40 bg-amber-500/10'
              : 'border-slate-800/60 bg-slate-900/60'}
        <li class={`rounded-2xl border px-4 py-3 ${toneClass}`}>
          <p class="text-xs uppercase tracking-widest text-slate-400">
            {event.year} · {event.month.toString().padStart(2, '0')} · {event.day.toString().padStart(2, '0')} · Tick {event.tick}
          </p>
          <p class="mt-1 text-sm text-slate-100">{event.message}</p>
        </li>
      {/each}
    {/if}
  </ul>
</section>
