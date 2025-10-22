<script lang="ts">
  import type { GameState } from '../types/game'
  import { formatCurrency, formatNumber, formatPercent } from '../utils/format'

  export let state: GameState

  type MixKey = keyof GameState['facility']['mix']

  const mixLabels: Record<MixKey, string> = {
    climateControlled: 'Climate Pods',
    driveUp: 'Drive-Up Bays',
    vault: 'Secure Vaults',
  }

  const mixDescriptions: Record<MixKey, string> = {
    climateControlled: 'Temperature and humidity managed units ideal for premium goods and sensitive equipment.',
    driveUp: 'Ground-level roll-up bays with direct vehicle access for quick loading and unloading.',
    vault: 'High-security vault suites with reinforced access controls for valuables and business archives.',
  }

  const formatSignedPercent = (value: number) => (value > 0 ? `+${formatPercent(value)}` : formatPercent(value))
  const formatSpeed = (value: number) =>
    Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)

  $: totalUnits = Math.max(1, state.facility.totalUnits)
  $: mixEntries = (Object.keys(state.facility.mix) as MixKey[]).map((key) => {
    const category = state.facility.mix[key]
    return {
      key,
      label: mixLabels[key] ?? key,
      description: mixDescriptions[key] ?? '',
      units: category.units,
      share: category.units / totalUnits,
      dimensions: category.dimensions,
    }
  })
  $: pricingEntries = [
    {
      key: 'climateControlled',
      label: mixLabels.climateControlled,
      standard: state.facility.pricing.climateControlled.standard,
      prime: state.facility.pricing.climateControlled.prime,
      primeShare: state.facility.pricing.climateControlled.primeShare,
      premium:
        state.facility.pricing.climateControlled.standard > 0
          ? state.facility.pricing.climateControlled.prime /
              state.facility.pricing.climateControlled.standard -
            1
          : 0,
    },
    {
      key: 'driveUp',
      label: mixLabels.driveUp,
      standard: state.facility.pricing.driveUp.standard,
      prime: state.facility.pricing.driveUp.prime,
      primeShare: state.facility.pricing.driveUp.primeShare,
      premium:
        state.facility.pricing.driveUp.standard > 0
          ? state.facility.pricing.driveUp.prime / state.facility.pricing.driveUp.standard - 1
          : 0,
    },
    {
      key: 'vault',
      label: mixLabels.vault,
      standard: state.facility.pricing.vault.standard,
      prime: state.facility.pricing.vault.prime,
      primeShare: state.facility.pricing.vault.primeShare,
      premium:
        state.facility.pricing.vault.standard > 0
          ? state.facility.pricing.vault.prime / state.facility.pricing.vault.standard - 1
          : 0,
    },
  ]
  $: specialSummary =
    state.facility.pricing.specials.offer === 'one_month_free'
      ? `Promo: One month free · ${formatPercent(state.facility.pricing.specials.adoptionRate)}`
      : 'No rent specials active.'
  $: delinquencyPolicy = state.facility.delinquency

  $: marketingMomentum = Math.min(Math.max(state.marketing.momentum, 0), 2)
  $: brandStrength = Math.min(Math.max(state.marketing.brandStrength, 0), 1)
  $: automationReliability = Math.min(Math.max(state.automation.reliability, 0), 1)
  $: speedDisplay = `×${formatSpeed(state.clock.speed)}`
</script>

<section class="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 shadow-lg shadow-slate-900/40">
  <header class="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-display text-xl text-slate-100">Facility Operations</h2>
      <p class="text-sm text-slate-400">Crew readiness, unit mix, and automation health at a glance.</p>
    </div>
    <div class="text-sm text-slate-400">Tick {state.tick} · {speedDisplay} speed</div>
  </header>

  <div class="grid gap-5 lg:grid-cols-2">
    <div class="space-y-4">
      <div>
        <h3
          class="text-sm font-semibold uppercase tracking-widest text-slate-400"
          title="Breakdown of available units by product type, including the most common square footage options."
        >
          Unit Mix
        </h3>
        <ul class="mt-3 space-y-2">
          {#each mixEntries as entry (entry.key)}
            <li class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
              <div class="flex items-center justify-between text-sm text-slate-300">
                <span class="flex items-center gap-2">
                  {entry.label}
                  {#if entry.description}
                    <button
                      type="button"
                      class="cursor-help text-xs text-slate-500 transition-colors hover:text-sky-300 focus:outline-none"
                      title={entry.description}
                      aria-label={entry.description}
                    >
                      ⓘ
                    </button>
                  {/if}
                </span>
                <span
                  class="text-xs text-slate-400"
                  title={`${formatNumber(entry.units)} of ${formatNumber(totalUnits)} units`}
                >
                  {formatPercent(entry.share)}
                </span>
              </div>
              <div class="mt-2 h-1.5 w-full rounded-full bg-slate-800/70">
                <div
                  class="h-full rounded-full bg-sky-400/80"
                  style={`width: ${Math.min(entry.share * 100, 100)}%`}
                ></div>
              </div>
              <ul class="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                {#each entry.dimensions as dimension (dimension)}
                  <li
                    class="rounded-full border border-slate-800/60 bg-slate-950/60 px-2 py-0.5 text-slate-300"
                    title={`Popular dimension: ${dimension}`}
                  >
                    {dimension}
                  </li>
                {/each}
              </ul>
              <p
                class="mt-1 text-xs text-slate-500"
                title={`Currently ${formatNumber(entry.units)} units in rotation for ${entry.label}.`}
              >
                {formatNumber(entry.units)} units live
              </p>
            </li>
          {/each}
        </ul>
      </div>
      <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
        <h3 class="text-sm font-semibold uppercase tracking-widest text-slate-400">Pricing Matrix</h3>
        <ul class="mt-3 space-y-2">
          {#each pricingEntries as tier (tier.key)}
            <li class="rounded-lg border border-slate-800/60 bg-slate-900/60 px-3 py-2">
              <div class="flex items-center justify-between text-sm text-slate-200">
                <span>{tier.label}</span>
                <span>{formatCurrency(tier.standard)}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>Prime {formatCurrency(tier.prime)}</span>
                <span>Premium {formatPercent(tier.premium)}</span>
                <span>{formatPercent(tier.primeShare)} prime mix</span>
              </div>
            </li>
          {/each}
        </ul>
        <p class="mt-3 text-xs text-slate-500">{specialSummary}</p>
      </div>
      <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
        <h3 class="text-sm font-semibold uppercase tracking-widest text-slate-400">Capital Position</h3>
        <p class="mt-2 text-sm text-slate-300">Monthly debt service {formatCurrency(state.financials.monthlyDebtService)}</p>
        <p class="text-xs text-slate-500">Burn rate {formatCurrency(state.financials.burnRate)}</p>
      </div>
    </div>

    <div class="space-y-4">
      <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
        <h3 class="text-sm font-semibold uppercase tracking-widest text-slate-400">Marketing Ops</h3>
        <p class="mt-2 text-sm text-slate-300">Level {state.marketing.level}</p>
        <div class="mt-2 space-y-2 text-xs text-slate-400">
          <div>
            <div class="flex justify-between"><span>Momentum</span><span>{formatPercent(marketingMomentum / 2)}</span></div>
            <div class="mt-1 h-1.5 w-full rounded-full bg-slate-800/70">
              <div class="h-full rounded-full bg-emerald-400/70" style={`width: ${Math.min((marketingMomentum / 2) * 100, 100)}%`}></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between"><span>Brand Strength</span><span>{formatPercent(brandStrength)}</span></div>
            <div class="mt-1 h-1.5 w-full rounded-full bg-slate-800/70">
              <div class="h-full rounded-full bg-indigo-400/70" style={`width: ${Math.min(brandStrength * 100, 100)}%`}></div>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
        <h3 class="text-sm font-semibold uppercase tracking-widest text-slate-400">Automation & Staffing</h3>
        <div class="mt-2 flex items-center justify-between text-sm text-slate-300">
          <span>Reliability</span>
          <span>{formatPercent(automationReliability)}</span>
        </div>
        <div class="mt-1 h-1.5 w-full rounded-full bg-slate-800/70">
          <div class="h-full rounded-full bg-sky-400/80" style={`width: ${Math.min(automationReliability * 100, 100)}%`}></div>
        </div>
        {#if state.automation.aiManager}
          <div class="mt-3 rounded-lg border border-slate-800/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
            <p class="font-semibold">{state.automation.aiManager.name}</p>
            <p class="text-xs text-slate-500">{state.automation.aiManager.description}</p>
            <ul class="mt-2 grid grid-cols-3 gap-2 text-xs">
              <li class="rounded-md bg-slate-900/70 px-2 py-1 text-emerald-300">Automation {formatSignedPercent(state.automation.aiManager.bonuses.automation)}</li>
              <li class="rounded-md bg-slate-900/70 px-2 py-1 text-sky-300">Reputation {formatSignedPercent(state.automation.aiManager.bonuses.reputation)}</li>
              <li class="rounded-md bg-slate-900/70 px-2 py-1 text-slate-200">Revenue {formatSignedPercent(state.automation.aiManager.bonuses.revenue)}</li>
            </ul>
          </div>
        {:else}
          <p class="mt-3 text-xs text-slate-500">Manual crews rotating shifts. Train an AI manager to unlock bonuses.</p>
        {/if}
      </div>
      <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
        <h3 class="text-sm font-semibold uppercase tracking-widest text-slate-400">Delinquency Outlook</h3>
        <div class="mt-2 flex items-center justify-between text-sm text-slate-300">
          <span>Delinquent Rate</span>
          <span>{formatPercent(delinquencyPolicy.rate)}</span>
        </div>
        <p class="mt-2 text-xs text-slate-400">{delinquencyPolicy.allowPaymentPlans ? 'Payment plans offered before legal escalation.' : 'Strict eviction once grace lapses.'}</p>
        <p class="mt-1 text-xs text-slate-500">Eviction trigger {delinquencyPolicy.evictionDays} days late</p>
      </div>
    </div>
  </div>
</section>
