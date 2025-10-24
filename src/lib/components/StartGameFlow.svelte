<script lang="ts">
  import { onDestroy } from 'svelte'
  import { facilityStart } from '../stores/facilityStart'
  import type {
    StartFinancialProjection,
    StartFinancialSnapshot,
    StartGameResult,
    TradeAreaDefinition,
    StartFacilityDefinition,
  } from '../types/start'
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
  interface YearSummary {
    year: number
    avgNetIncome: number
    endingCash: number
    endingCredit: number
    endingNetWorth: number
  }
  let timelinePreview: StartFinancialSnapshot[] = []
  let yearlySummary: YearSummary[] = []

  $: projection = loanPreview ? startStore.computeProjection(state, loanPreview) : null
  $: timelinePreview = projection ? projection.timeline.slice(0, 12) : []
  $: yearlySummary = projection
    ? (Array.from({ length: Math.ceil(projection.timeline.length / 12) }, (_, index) => {
        const start = index * 12
        const slice = projection.timeline.slice(start, start + 12)
        if (!slice.length) return null
        const last = slice[slice.length - 1]
        const avgNetIncome = slice.reduce((sum, entry) => sum + entry.netIncome, 0) / slice.length
        return {
          year: index + 1,
          avgNetIncome,
          endingCash: last.cash,
          endingCredit: last.creditScore,
          endingNetWorth: last.netWorth,
        } satisfies YearSummary
      }).filter((value): value is YearSummary => Boolean(value)))
    : []
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

  const formatCreditDelta = (value: number, options: { monthly?: boolean } = {}) => {
    const { monthly = true } = options
    if (!Number.isFinite(value)) return 'N/A'
    const rounded = Math.round(value * 100) / 100
    const prefix = rounded > 0 ? '+' : ''
    return monthly ? `${prefix}${rounded.toFixed(2)} pts / mo` : `${prefix}${rounded.toFixed(2)} pts`
  }

  const formatRunway = (snapshot: StartFinancialProjection | null) => {
    if (!snapshot) return '—'
    if (snapshot.netIncomeMonthly >= 0 && !Number.isFinite(snapshot.runwayMonths)) {
      return 'Cash-flow positive'
    }
    if (!Number.isFinite(snapshot.runwayMonths) || snapshot.runwayMonths <= 0) {
      return 'Less than 1 month'
    }
    return `${snapshot.runwayMonths.toFixed(1)} months`
  }

  const formatHorizon = (month: number | null) => {
    if (month === null) return 'Beyond 5 yrs'
    if (month <= 0) return 'Immediate'
    return `${(month / 12).toFixed(1)} yrs`
  }

  const describeMonth = (month: number) => {
    if (month <= 0) return 'Month 0'
    const year = Math.ceil(month / 12)
    return `Month ${month} (Year ${year})`
  }

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
              <dl class="mt-3 grid grid-cols-2 gap-2 text-[11px] uppercase text-slate-400">
                <div>
                  <dt>Demand</dt>
                  <dd class="text-sm text-slate-100">{formatPercent(region.demandIndex)}</dd>
                </div>
                <div>
                  <dt>Cap Rate</dt>
                  <dd class="text-sm text-slate-100">{formatPercent(region.avgCapRate)}</dd>
                </div>
                <div>
                  <dt>Competition</dt>
                  <dd class="text-sm text-slate-100">{formatPercent(region.competition)}</dd>
                </div>
                <div>
                  <dt>Loan Rate</dt>
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
                <dl class="mt-3 grid gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400 md:grid-cols-5">
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
                  <div>
                    <dt>Debt Service</dt>
                    <dd class="text-sm text-slate-100">{formatCurrency(facility.debtService)} / mo</dd>
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

            {#if projection}
              <div class="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 text-sm text-slate-200">
                <h3 class="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
                  Operating Cash Flow Forecast
                </h3>
                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Revenue</p>
                    <p class="text-lg font-semibold text-slate-100">{formatCurrency(projection.revenueMonthly)} / mo</p>
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Expenses</p>
                    <p class="text-lg font-semibold text-slate-100">{formatCurrency(projection.expensesMonthly)} / mo</p>
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Debt Service</p>
                    <p class="text-lg font-semibold text-slate-100">{formatCurrency(projection.debtServiceMonthly)} / mo</p>
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Net Income</p>
                    <p class={`text-lg font-semibold ${projection.netIncomeMonthly >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                      {formatCurrency(projection.netIncomeMonthly)} / mo
                    </p>
                  </div>
                </div>
                <dl class="mt-4 space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <div class="flex items-center justify-between text-slate-200">
                    <dt>Cash After Closing</dt>
                    <dd>{formatCurrency(projection.cashAfterPurchase)}</dd>
                  </div>
                  <div class="flex items-center justify-between text-slate-200">
                    <dt>Net Worth Trajectory</dt>
                    <dd>{formatPercent(projection.netWorthChangePercent / 100)}</dd>
                  </div>
                  <div class="flex items-center justify-between text-slate-200">
                    <dt>Runway</dt>
                    <dd>{formatRunway(projection)}</dd>
                  </div>
                  <div class="flex items-center justify-between text-slate-200">
                    <dt>Credit Impact Estimate</dt>
                    <dd>{formatCreditDelta(projection.creditDeltaEstimate)}</dd>
                  </div>
                  <div class="flex items-center justify-between text-slate-200">
                    <dt>Total Credit Movement</dt>
                    <dd>{formatCreditDelta(projection.totalCreditDelta, { monthly: false })}</dd>
                  </div>
                  <div class="flex items-center justify-between text-slate-200">
                    <dt>Final Credit Score</dt>
                    <dd>{projection.finalCreditScore}</dd>
                  </div>
                  <div class="flex items-center justify-between text-slate-200">
                    <dt>Loan Payoff Horizon</dt>
                    <dd>{formatHorizon(projection.payoffMonth)}</dd>
                  </div>
                  <div class="flex items-center justify-between text-slate-200">
                    <dt>Default Risk</dt>
                    <dd>{projection.defaulted ? 'Elevated' : 'Contained'}</dd>
                  </div>
                </dl>
                {#if projection.forcedSaleMonth}
                  <p class="mt-3 rounded-lg border border-rose-400/60 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                    Projection indicates cash turns negative by {describeMonth(projection.forcedSaleMonth)}. Increase down payment or
                    improve operating income to avoid a forced sale.
                  </p>
                {/if}
                {#if timelinePreview.length}
                  <div class="mt-4 space-y-2">
                    <h4 class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                      First-Year Cash &amp; Credit Path
                    </h4>
                    <div class="overflow-x-auto">
                      <table class="min-w-full divide-y divide-slate-800/70 text-xs text-slate-300">
                        <thead class="bg-slate-900/60 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          <tr>
                            <th class="px-3 py-2 text-left">Month</th>
                            <th class="px-3 py-2 text-right">Cash</th>
                            <th class="px-3 py-2 text-right">Net Income</th>
                            <th class="px-3 py-2 text-right">Credit</th>
                            <th class="px-3 py-2 text-right">Net Worth</th>
                            <th class="px-3 py-2 text-left">Events</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/50">
                          {#each timelinePreview as entry (entry.month)}
                            <tr class="hover:bg-slate-900/40">
                              <th class="px-3 py-2 text-left font-semibold text-slate-200">{entry.month}</th>
                              <td class="px-3 py-2 text-right">{formatCurrency(entry.cash)}</td>
                              <td class={`px-3 py-2 text-right ${entry.netIncome >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                                {formatCurrency(entry.netIncome)}
                              </td>
                              <td class="px-3 py-2 text-right">{entry.creditScore.toFixed(0)}</td>
                              <td class="px-3 py-2 text-right">{formatCurrency(entry.netWorth)}</td>
                              <td class="px-3 py-2 text-left text-[11px] text-slate-400">
                                {entry.events.length ? entry.events.join(' • ') : '—'}
                              </td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                {/if}
                {#if yearlySummary.length}
                  <div class="mt-4 space-y-2">
                    <h4 class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">Five-Year Outlook</h4>
                    <div class="grid gap-2 sm:grid-cols-2">
                      {#each yearlySummary as year}
                        <div class="rounded-lg border border-slate-800/70 bg-slate-900/50 p-3">
                          <p class="text-[11px] uppercase tracking-[0.2em] text-slate-500">Year {year.year}</p>
                          <dl class="mt-2 space-y-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            <div class="flex items-center justify-between text-slate-200">
                              <dt>Avg Net Income</dt>
                              <dd>{formatCurrency(year.avgNetIncome)} / mo</dd>
                            </div>
                            <div class="flex items-center justify-between text-slate-200">
                              <dt>Ending Cash</dt>
                              <dd>{formatCurrency(year.endingCash)}</dd>
                            </div>
                            <div class="flex items-center justify-between text-slate-200">
                              <dt>Ending Credit</dt>
                              <dd>{year.endingCredit.toFixed(0)}</dd>
                            </div>
                            <div class="flex items-center justify-between text-slate-200">
                              <dt>Ending Net Worth</dt>
                              <dd>{formatCurrency(year.endingNetWorth)}</dd>
                            </div>
                          </dl>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
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
