<script lang="ts">
  export type MetricModalTone = 'positive' | 'negative' | 'neutral'
  export type MetricModalAccent = 'emerald' | 'amber' | 'sky' | 'slate'

  export interface MetricModalItem {
    label: string
    value: string
    tone?: MetricModalTone
    description?: string
  }

  export interface MetricModalSection {
    title: string
    accent: MetricModalAccent
    items: MetricModalItem[]
    footer?: MetricModalItem
  }

  export interface MetricModalSummary {
    label: string
    value: string
    description?: string
  }

  export interface MetricModalData {
    id: string
    label: string
    title: string
    description: string
    sections: MetricModalSection[]
    summary?: MetricModalSummary
  }

  export let metric: MetricModalData | null = null
  export let onClose: () => void

  const accentClasses: Record<MetricModalAccent, string> = {
    emerald: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-400/40 bg-amber-500/5 text-amber-200',
    sky: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
    slate: 'border-slate-700/70 bg-slate-900/70 text-slate-200',
  }

  const toneClasses: Record<MetricModalTone, string> = {
    positive: 'text-emerald-300',
    negative: 'text-amber-300',
    neutral: 'text-slate-200',
  }

  $: headingId = metric ? `${metric.id}-modal-title` : undefined
</script>

{#if metric}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm"
    on:pointerdown|self={onClose}
  >
    <div
      class="w-full max-w-3xl rounded-3xl border border-slate-800/80 bg-slate-950/95 p-6 shadow-2xl shadow-slate-900/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-[0.32em] text-sky-300">{metric.label}</p>
          <h2 id={headingId} class="mt-1 font-display text-2xl text-slate-100">{metric.title}</h2>
          <p class="mt-2 text-sm text-slate-400">{metric.description}</p>
        </div>
        <button
          type="button"
          class="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
          on:click={onClose}
        >
          Close
        </button>
      </div>

      <div class="mt-6 grid gap-6 md:grid-cols-2">
        {#each metric.sections as section}
          <section class={`rounded-2xl border p-4 ${accentClasses[section.accent]}`}>
            <h3 class="text-xs font-semibold uppercase tracking-[0.24em]">{section.title}</h3>
            <dl class="mt-4 space-y-3">
              {#each section.items as item}
                <div class="flex flex-col gap-1">
                  <div class="flex items-baseline justify-between gap-4">
                    <dt class="text-sm font-medium text-slate-300">{item.label}</dt>
                    <dd class={`font-display text-base ${toneClasses[item.tone ?? 'neutral']}`}>{item.value}</dd>
                  </div>
                  {#if item.description}
                    <p class="text-xs text-slate-400">{item.description}</p>
                  {/if}
                </div>
              {/each}
              {#if section.footer}
                <div class="flex flex-col gap-1 border-t border-slate-800/60 pt-3">
                  <div class="flex items-baseline justify-between gap-4">
                    <dt class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{section.footer.label}</dt>
                    <dd class={`font-display text-lg ${toneClasses[section.footer.tone ?? 'neutral']}`}>{section.footer.value}</dd>
                  </div>
                  {#if section.footer.description}
                    <p class="text-xs text-slate-500">{section.footer.description}</p>
                  {/if}
                </div>
              {/if}
            </dl>
          </section>
        {/each}
      </div>

      {#if metric.summary}
        <div class="mt-6 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 text-sm text-slate-300">
          <div class="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
            <span class="font-semibold text-slate-100">{metric.summary.label}</span>
            <span class="font-display text-base text-slate-200">{metric.summary.value}</span>
          </div>
          {#if metric.summary.description}
            <p class="mt-2 text-xs text-slate-400">{metric.summary.description}</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
