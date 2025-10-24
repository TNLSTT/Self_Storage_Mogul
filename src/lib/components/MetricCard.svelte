<script lang="ts">
  export let label: string
  export let value: string
  export let hint: string = ''
  export let tone: 'default' | 'positive' | 'warning' = 'default'
  export let trend: number[] | null = null
  export let trendRange: [number, number] | null = null
  export let onClick: (() => void) | null = null

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

  $: clickable = Boolean(onClick)

  $: trendPoints = (() => {
    if (!trend || trend.length < 2) return ''
    const [minBound, maxBound] = trendRange ?? [Math.min(...trend), Math.max(...trend)]
    const span = maxBound - minBound || 1
    return trend
      .map((value, index) => {
        const x = trend.length <= 1 ? 0 : (index / (trend.length - 1)) * 100
        const normalized = clamp((value - minBound) / span, 0, 1)
        const y = 100 - normalized * 100
        return `${x},${y}`
      })
      .join(' ')
  })()

  $: toneClasses =
    tone === 'positive'
      ? 'border-emerald-400/40 bg-emerald-500/10'
      : tone === 'warning'
        ? 'border-amber-400/40 bg-amber-500/10'
        : 'border-slate-700/60 bg-slate-900/40'

  $: baseClasses = `rounded-2xl border px-5 py-4 text-left shadow-sm transition ${toneClasses}`

  $: interactiveClasses = clickable
    ? 'cursor-pointer hover:border-sky-400/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400'
    : ''
</script>

{#if clickable}
  <button
    type="button"
    class={`${baseClasses} ${interactiveClasses}`}
    on:click={onClick}
  >
    <p class="text-xs uppercase tracking-wider text-slate-400">{label}</p>
    <p class="mt-1 font-display text-2xl text-slate-100">{value}</p>
    {#if trendPoints}
      <svg
        class="mt-3 h-12 w-full text-sky-400/70"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline points={trendPoints} fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    {/if}
    {#if hint}
      <p class="mt-1 text-sm text-slate-400">{hint}</p>
    {/if}
  </button>
{:else}
  <div class={baseClasses}>
    <p class="text-xs uppercase tracking-wider text-slate-400">{label}</p>
    <p class="mt-1 font-display text-2xl text-slate-100">{value}</p>
    {#if trendPoints}
      <svg
        class="mt-3 h-12 w-full text-sky-400/70"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline points={trendPoints} fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    {/if}
    {#if hint}
      <p class="mt-1 text-sm text-slate-400">{hint}</p>
    {/if}
  </div>
{/if}
