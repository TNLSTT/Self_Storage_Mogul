<script lang="ts">
  import { onDestroy } from 'svelte'
  import { facilityStart } from '../stores/facilityStart'
  import type { StartGameResult, TradeAreaDefinition, StartFacilityDefinition } from '../types/start'
  import { formatCurrency, formatNumber, formatPercent } from '../utils/format'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher<{ complete: StartGameResult }>()

  const startStore = facilityStart

  let state = startStore.raw()
  const unsubscribe = startStore.subscribe((value) => {
    state = value
  })

  const tradeAreas: TradeAreaDefinition[] = startStore.tradeAreas()
  let facilities: StartFacilityDefinition[] = []

  $: selectedRegion = state.selectedRegionId
  $: facilities = selectedRegion
    ? startStore.facilitiesForRegion(selectedRegion)
    : []
  $: loanPreview = startStore.computePreview(state)
  $: downPaymentPercent = Math.round(state.financing.downPaymentPercent * 100)
  $: canConfirm = Boolean(loanPreview?.valid)

  const handleRegionSelect = (regionId: string) => {
    startStore.selectRegion(regionId)
  }

  const handleFacilitySelect = (facilityId: string) => {
    startStore.selectFacility(facilityId)
  }

  const handleDownPaymentChange = (value: number) => {
    const percent = Math.max(10, Math.min(100, value)) / 100
    startStore.updateFinancing({ downPaymentPercent: percent })
  }

  const handleTermChange = (termYears: 10 | 20 | 25) => {
    startStore.updateFinancing({ termYears })
  }

  const handleRateTypeChange = (rateType: 'fixed' | 'variable') => {
    startStore.updateFinancing({ rateType })
  }

  const handleConfirm = () => {
    const result = startStore.finalize()
    if (result) {
      dispatch('complete', result)
    }
  }

  const formatIssues = (issues: string[]) => (issues.length ? issues.join(', ') : 'No flagged issues')

  onDestroy(() => {
    unsubscribe()
  })
</script>

<section class="start-flow">
  <header class="space-y-2 text-center">
    <p class="text-[11px] font-semibold uppercase tracking-[0.38em] text-sky-300">Self Storage Mogul</p>
    <h1 class="font-display text-3xl text-slate-100 md:text-[2.5rem]">Launch Your First Acquisition</h1>
    <p class="text-sm text-slate-400">
      Start with $100,000 in cash and a 620 credit score. Pick your trade area, evaluate facilities, and structure a loan that
      respects your 90% LTV cap.
    </p>
  </header>

  <div class="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
    <div class="space-y-6">
      <section class="panel">
        <h2 class="panel-title">1. Choose a Trade Area</h2>
        <div class="grid gap-3 md:grid-cols-3">
          {#each tradeAreas as region}
            <button
              type="button"
              class={`region-card ${state.selectedRegionId === region.id ? 'region-card--active' : ''}`}
              on:click={() => handleRegionSelect(region.id)}
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-slate-100">{region.name}</span>
                {#if state.selectedRegionId === region.id}
                  <span class="rounded-full bg-sky-500/20 px-2 text-xs uppercase tracking-wide text-sky-200">Selected</span>
                {/if}
              </div>
              <p class="text-xs text-slate-400">{region.description}</p>
              <dl class="mt-3 grid grid-cols-2 gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <div>
                  <dt>Demand</dt>
                  <dd class="text-sm text-slate-100">{formatPercent(region.demandIndex)}</dd>
                </div>
                <div>
                  <dt>Competition</dt>
                  <dd class="text-sm text-slate-100">{formatPercent(region.competition)}</dd>
                </div>
                <div>
                  <dt>Costs</dt>
                  <dd class="text-sm text-slate-100">{formatPercent(region.operatingCostFactor)}</dd>
                </div>
                <div>
                  <dt>Base Rate</dt>
                  <dd class="text-sm text-slate-100">{formatPercent(region.baseRate)}</dd>
                </div>
              </dl>
            </button>
          {/each}
        </div>
      </section>

      {#if state.selectedRegionId}
        <section class="panel">
          <h2 class="panel-title">2. Select a Facility</h2>
          <div class="grid gap-3">
            {#each facilities as facility}
              <button
                type="button"
                class={`facility-card ${state.selectedFacilityId === facility.id ? 'facility-card--active' : ''}`}
                on:click={() => handleFacilitySelect(facility.id)}
              >
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 class="text-base font-semibold text-slate-100">{facility.name}</h3>
                    <p class="text-xs text-slate-400">{facility.city}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-slate-100">{formatCurrency(facility.price)}</p>
                    <p class="text-xs text-slate-400">Occupancy {formatPercent(facility.occupancy)}</p>
                  </div>
                </div>
                <dl class="mt-3 grid gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400 md:grid-cols-4">
                  <div>
                    <dt>Size</dt>
                    <dd class="text-sm text-slate-100">{formatNumber(facility.sizeSqft)} sqft</dd>
                  </div>
                  <div>
                    <dt>Avg Rent</dt>
                    <dd class="text-sm text-slate-100">{formatCurrency(facility.avgRentPerSqft * 100)} / mo</dd>
                  </div>
                  <div>
                    <dt>Expenses</dt>
                    <dd class="text-sm text-slate-100">{formatCurrency(facility.expensesAnnual)} / yr</dd>
                  </div>
                  <div>
                    <dt>Expansion</dt>
                    <dd class="text-sm text-slate-100">{formatPercent(facility.expansionPotential)}</dd>
                  </div>
                </dl>
                <p class="mt-3 text-xs text-slate-400">Issues: {formatIssues(facility.issues)}</p>
              </button>
            {/each}
          </div>
        </section>
      {/if}

      {#if state.selectedFacilityId}
        <section class="panel">
          <h2 class="panel-title">3. Finance the Purchase</h2>
          <div class="space-y-4">
            <div>
              <label class="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Down Payment
                <span class="text-slate-200">{downPaymentPercent}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={downPaymentPercent}
                on:input={(event) => handleDownPaymentChange(Number(event.currentTarget.value))}
                class="w-full"
              />
            </div>

            <div class="flex flex-wrap gap-3">
              <fieldset class="flex flex-wrap gap-2">
                <legend class="sr-only">Loan Term</legend>
                {#each [10, 20, 25] as term}
                  <button
                    type="button"
                    class={`chip ${state.financing.termYears === term ? 'chip--active' : ''}`}
                    on:click={() => handleTermChange(term as 10 | 20 | 25)}
                  >
                    {term} years
                  </button>
                {/each}
              </fieldset>
              <fieldset class="flex gap-2">
                <legend class="sr-only">Rate Type</legend>
                {#each ['fixed', 'variable'] as rate}
                  <button
                    type="button"
                    class={`chip ${state.financing.rateType === rate ? 'chip--active' : ''}`}
                    on:click={() => handleRateTypeChange(rate as 'fixed' | 'variable')}
                  >
                    {rate}
                  </button>
                {/each}
              </fieldset>
            </div>

            {#if loanPreview}
              <div class="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 text-sm text-slate-200">
                <div class="grid gap-3 md:grid-cols-2">
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Loan Amount</p>
                    <p class="text-lg font-semibold text-slate-100">{formatCurrency(loanPreview.loanAmount)}</p>
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Down Payment</p>
                    <p class="text-lg font-semibold text-slate-100">{formatCurrency(loanPreview.downPayment)}</p>
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Interest Rate</p>
                    <p class="text-lg font-semibold text-slate-100">{formatPercent(loanPreview.interestRate)}</p>
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Monthly Payment</p>
                    <p class="text-lg font-semibold text-slate-100">{formatCurrency(loanPreview.monthlyPayment)}</p>
                  </div>
                </div>
                <p class="mt-3 text-xs text-slate-400">
                  LTV cap: {formatPercent(state.player.loanToValue)} · Max loan {formatCurrency(loanPreview.maxLoanAllowed)}
                </p>
              </div>
            {/if}

            {#if state.error}
              <p class="rounded-lg border border-rose-400/60 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{state.error}</p>
            {/if}

            <button
              class="w-full rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              on:click={handleConfirm}
              disabled={!canConfirm}
            >
              Lock Facility &amp; Launch Simulation
            </button>
          </div>
        </section>
      {/if}
    </div>

    <aside class="panel">
      <h2 class="panel-title">Capital Snapshot</h2>
      <dl class="space-y-3 text-sm text-slate-200">
        <div class="flex items-center justify-between">
          <dt class="text-xs uppercase tracking-[0.2em] text-slate-400">Starting Cash</dt>
          <dd>{formatCurrency(state.player.cash)}</dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-xs uppercase tracking-[0.2em] text-slate-400">Credit Score</dt>
          <dd>{state.player.creditScore}</dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-xs uppercase tracking-[0.2em] text-slate-400">Loan-to-Value Cap</dt>
          <dd>{formatPercent(state.player.loanToValue)}</dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-xs uppercase tracking-[0.2em] text-slate-400">Max Purchase Power</dt>
          <dd>{formatCurrency(state.player.maxPurchase)}</dd>
        </div>
      </dl>
      <p class="mt-4 text-xs text-slate-500">
        Building new facilities unlocks at a 750 credit score. Maintain positive cash flow to improve your rating faster.
      </p>
    </aside>
  </div>
</section>

<style lang="postcss">
  .start-flow {
    @apply mx-auto max-w-5xl space-y-6 rounded-2xl border border-slate-800/70 bg-slate-950/90 p-6 shadow-lg;
  }

  .panel {
    @apply space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5;
  }

  .panel-title {
    @apply text-sm font-semibold uppercase tracking-[0.32em] text-slate-300;
  }

  .region-card,
  .facility-card {
    @apply w-full rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 text-left transition hover:border-slate-600;
  }

  .region-card--active,
  .facility-card--active {
    @apply border-sky-500/60 bg-sky-500/10;
  }

  .chip {
    @apply rounded-full border border-slate-700/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500;
  }

  .chip--active {
    @apply border-sky-500/70 bg-sky-500/10 text-sky-100;
  }
</style>
