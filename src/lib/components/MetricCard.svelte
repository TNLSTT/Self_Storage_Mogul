<script lang="ts">
  export let label: string
  export let value: string
  export let hint: string = ''
  export let tone: 'default' | 'positive' | 'warning' = 'default'
</script>

<div
  class={`rounded-2xl border px-5 py-4 shadow-sm transition ${
    tone === 'positive'
      ? 'border-emerald-400/40 bg-emerald-500/10'
      : tone === 'warning'
        ? 'border-amber-400/40 bg-amber-500/10'
        : 'border-slate-700/60 bg-slate-900/40'
  }`}
>
  <p class="text-xs uppercase tracking-wider text-slate-400">{label}</p>
  <p class="mt-1 font-display text-2xl text-slate-100">{value}</p>
  {#if hint}
    <p class="mt-1 text-sm text-slate-400">{hint}</p>
  {/if}
</div>
