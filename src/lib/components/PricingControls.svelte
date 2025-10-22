<script lang="ts">
  import type { GameState } from '../types/game'
  import { formatCurrency, formatPercent } from '../utils/format'
  import { DELINQUENCY_IMPACT_TOOLTIP } from '../constants/tooltips'
  import { game } from '../stores/game'

  type PricingKey = 'climateControlled' | 'driveUp' | 'vault'

  export let state: GameState

  const pricingLabels: Record<PricingKey, string> = {
    climateControlled: 'Climate Pods',
    driveUp: 'Drive-Up Bays',
    vault: 'Vault Storage',
  }

  const handleRateChange = (key: PricingKey, field: 'standard' | 'prime', event: Event) => {
    const target = event.currentTarget as HTMLInputElement
    const value = Number(target.value)
    if (!Number.isFinite(value)) return
    game.setPricingTier(key, { [field]: value })
  }

  const toggleSpecial = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement
    const offer = target.checked ? 'one_month_free' : 'none'
    game.configureSpecials({ offer })
    if (!target.checked) {
      game.configureSpecials({ adoptionRate: 0 })
    }
  }

  const adjustSpecialAdoption = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement
    const value = Number(target.value)
    if (!Number.isFinite(value)) return
    game.configureSpecials({ adoptionRate: value / 100 })
  }

  const adjustDelinquencyRate = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement
    const value = Number(target.value)
    if (!Number.isFinite(value)) return
    game.updateDelinquency({ rate: value / 100 })
  }

  const togglePaymentPlan = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement
    game.updateDelinquency({ allowPaymentPlans: target.checked })
  }

  const adjustEvictionDays = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement
    const value = Number(target.value)
    if (!Number.isFinite(value)) return
    game.updateDelinquency({ evictionDays: value })
  }

  $: delinquencyOccupancyDrag = state.facility.delinquency.rate * 0.25
</script>

<section class="rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-xl shadow-slate-900/40">
  <header class="flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-display text-xl text-slate-100">Revenue Controls</h2>
      <p class="text-sm text-slate-400">
        Tune price tiers, specials, and delinquency policy to shape absorption and cash flow.
      </p>
    </div>
    <div class="text-sm text-slate-400">Average rent {formatCurrency(state.facility.averageRent)}</div>
  </header>

  <div class="grid gap-6 lg:grid-cols-2">
    <div class="space-y-4">
      {#each Object.keys(pricingLabels) as key (key)}
        {@const tierKey = key as PricingKey}
        {@const pricing = state.facility.pricing[tierKey]}
        {@const premium = pricing.standard > 0 ? pricing.prime / pricing.standard - 1 : 0}
        <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
          <div class="flex items-center justify-between text-sm text-slate-200">
            <span class="font-semibold">{pricingLabels[tierKey]}</span>
            <span class="text-xs text-slate-400">Prime premium {formatPercent(premium)}</span>
          </div>
          <label class="mt-3 block text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Standard Rate
            <div class="mt-1 flex items-center gap-3">
              <input
                class="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-200 focus:border-sky-400 focus:outline-none"
                type="number"
                min="40"
                max="600"
                step="1"
                value={pricing.standard}
                on:change={(event) => handleRateChange(tierKey, 'standard', event)}
              />
              <span class="text-sm text-slate-300">{formatCurrency(pricing.standard)}</span>
            </div>
          </label>
          <label class="mt-3 block text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Prime Rate
            <div class="mt-1 flex items-center gap-3">
              <input
                class="w-full rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-200 focus:border-sky-400 focus:outline-none"
                type="number"
                min={pricing.standard + 5}
                max="800"
                step="1"
                value={pricing.prime}
                on:change={(event) => handleRateChange(tierKey, 'prime', event)}
              />
              <span class="text-sm text-slate-300">{formatCurrency(pricing.prime)}</span>
            </div>
          </label>
        </div>
      {/each}

      <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
        <div class="flex items-center justify-between text-sm text-slate-200">
          <span class="font-semibold">Promotions</span>
          <label class="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-500"
              checked={state.facility.pricing.specials.offer === 'one_month_free'}
              on:change={toggleSpecial}
            />
            One Month Free
          </label>
        </div>
        <div class="mt-3 text-xs text-slate-400">
          Incentive adoption {formatPercent(state.facility.pricing.specials.adoptionRate)}
        </div>
        <input
          class="mt-2 w-full accent-sky-400"
          type="range"
          min="0"
          max="100"
          step="5"
          value={state.facility.pricing.specials.adoptionRate * 100}
          on:input={adjustSpecialAdoption}
          disabled={state.facility.pricing.specials.offer !== 'one_month_free'}
        />
        <p class="mt-2 text-xs text-slate-500">
          Apply one month free to the selected share of incoming renters to spike short-term demand.
        </p>
      </div>
    </div>

    <div class="space-y-4">
      <div class="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
        <h3 class="text-sm font-semibold uppercase tracking-widest text-slate-400">Delinquency Policy</h3>
        <div class="mt-3 flex items-center justify-between text-sm text-slate-200">
          <span class="flex items-center gap-2">
            Expected Rate
            <button
              type="button"
              class="cursor-help text-xs text-slate-500 transition-colors hover:text-sky-300 focus:outline-none"
              title={DELINQUENCY_IMPACT_TOOLTIP}
              aria-label={DELINQUENCY_IMPACT_TOOLTIP}
            >
              ⓘ
            </button>
          </span>
          <span>{formatPercent(state.facility.delinquency.rate)}</span>
        </div>
        <input
          class="mt-2 w-full accent-emerald-400"
          type="range"
          min="0"
          max="20"
          step="0.5"
          value={state.facility.delinquency.rate * 100}
          on:input={adjustDelinquencyRate}
        />
        <div class="mt-3 flex items-center justify-between text-sm text-slate-200">
          <span>Grace Period</span>
          <span>{state.facility.delinquency.evictionDays} days</span>
        </div>
        <input
          class="mt-2 w-full accent-amber-400"
          type="range"
          min="15"
          max="120"
          step="5"
          value={state.facility.delinquency.evictionDays}
          on:input={adjustEvictionDays}
        />
        <label class="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-400 focus:ring-emerald-500"
            checked={state.facility.delinquency.allowPaymentPlans}
            on:change={togglePaymentPlan}
          />
          Offer Payment Plans
        </label>
        <p class="mt-2 text-xs text-slate-500">
          Higher delinquency lowers target occupancy by roughly {formatPercent(delinquencyOccupancyDrag)}, forces more evictions
          once the {state.facility.delinquency.evictionDays}-day grace period expires, and keeps revenue delinquent until
          collected. Payment plans cushion churn but delay cash, while shorter grace periods recycle inventory at the expense of
          satisfaction and reputation.
        </p>
      </div>
    </div>
  </div>
</section>
