import { get, writable } from 'svelte/store'
import { START_FACILITIES, TRADE_AREAS, findFacility, findTradeArea } from '../data/startFacilities'
import type { FinancingSelection, LoanProfile, StartGameResult, StartPlayerProfile } from '../types/start'
import { computeInterestRate, loanSeedFrom, pmt } from '../utils/loan'

interface FacilityStartState {
  step: 'region' | 'facility' | 'financing' | 'summary'
  player: StartPlayerProfile
  selectedRegionId: string | null
  selectedFacilityId: string | null
  financing: FinancingSelection
  error: string | null
}

interface LoanPreview extends LoanProfile {
  maxLoanAllowed: number
  valid: boolean
}

const BASE_PLAYER: StartPlayerProfile = {
  cash: 100_000,
  creditScore: 620,
  loanToValue: 0.9,
  maxPurchase: 1_000_000,
}

const defaultFinancing: FinancingSelection = {
  downPaymentPercent: 0.2,
  termYears: 20,
  rateType: 'fixed',
}

const createInitialState = (): FacilityStartState => ({
  step: 'region',
  player: { ...BASE_PLAYER },
  selectedRegionId: null,
  selectedFacilityId: null,
  financing: { ...defaultFinancing },
  error: null,
})

const computeLoanPreview = (state: FacilityStartState): LoanPreview | null => {
  if (!state.selectedRegionId || !state.selectedFacilityId) {
    return null
  }
  const region = findTradeArea(state.selectedRegionId)
  const facility = findFacility(state.selectedFacilityId)
  if (!region || !facility) {
    return null
  }
  let downPaymentPercent = Math.max(Math.min(state.financing.downPaymentPercent, 1), 0.1)
  const targetDownPayment = facility.price * downPaymentPercent
  const maxLoan = facility.price * state.player.loanToValue
  let loanAmount = facility.price - targetDownPayment
  if (loanAmount > maxLoan) {
    loanAmount = maxLoan
    downPaymentPercent = 1 - loanAmount / facility.price
  }
  const downPayment = facility.price - loanAmount
  const interestRate = computeInterestRate(region.baseRate, state.player.creditScore)
  const rateType = state.financing.rateType
  const termMonths = state.financing.termYears * 12
  const monthlyPayment = pmt(interestRate, termMonths, loanAmount)
  const valid = downPayment <= state.player.cash && facility.price <= state.player.maxPurchase
  return {
    baseRate: region.baseRate,
    downPayment,
    interestRate: rateType === 'variable' ? interestRate + 0.004 : interestRate,
    loanAmount,
    monthlyPayment,
    rateType,
    termMonths,
    maxLoanAllowed: maxLoan,
    valid,
  }
}

const toResult = (state: FacilityStartState, preview: LoanPreview): StartGameResult => {
  const region = findTradeArea(state.selectedRegionId!)!
  const facility = findFacility(state.selectedFacilityId!)!
  const player = {
    ...state.player,
    cashAfterPurchase: state.player.cash - preview.downPayment,
  }
  const rateType = state.financing.rateType
  const rate = rateType === 'variable' ? preview.interestRate : preview.interestRate
  return {
    region,
    facility,
    financing: { ...state.financing, downPaymentPercent: Math.max(state.financing.downPaymentPercent, 0.1) },
    loan: {
      baseRate: preview.baseRate,
      downPayment: preview.downPayment,
      interestRate: rate,
      loanAmount: preview.loanAmount,
      monthlyPayment: preview.monthlyPayment,
      rateType,
      termMonths: preview.termMonths,
    },
    player,
    seed: loanSeedFrom([
      region.id,
      facility.id,
      String(preview.loanAmount.toFixed(2)),
      state.financing.termYears.toString(),
      rateType,
    ]),
  }
}

const facilityStartStore = () => {
  const { subscribe, update, set } = writable<FacilityStartState>(createInitialState())

  return {
    subscribe,
    selectRegion: (regionId: string) => {
      update((current) => {
        if (current.selectedRegionId === regionId) {
          return { ...current, step: 'facility', error: null }
        }
        return {
          ...current,
          selectedRegionId: regionId,
          selectedFacilityId: null,
          step: 'facility',
          error: null,
        }
      })
    },
    selectFacility: (facilityId: string) => {
      update((current) => {
        if (!current.selectedRegionId) {
          return current
        }
        const facility = findFacility(facilityId)
        if (!facility || facility.regionId !== current.selectedRegionId) {
          return {
            ...current,
            error: 'Select a facility in the chosen trade area.',
          }
        }
        return {
          ...current,
          selectedFacilityId: facilityId,
          step: 'financing',
          error: null,
        }
      })
    },
    updateFinancing: (changes: Partial<FinancingSelection>) => {
      update((current) => ({
        ...current,
        financing: {
          ...current.financing,
          ...changes,
        },
        error: null,
      }))
    },
    preview: (): LoanPreview | null => {
      const state = get({ subscribe })
      return computeLoanPreview(state)
    },
    finalize: (): StartGameResult | null => {
      const state = get({ subscribe })
      const preview = computeLoanPreview(state)
      if (!preview) {
        set({ ...state, error: 'Choose a region and facility to continue.' })
        return null
      }
      if (!preview.valid) {
        set({ ...state, error: 'Down payment exceeds available cash or purchase price is above credit capacity.' })
        return null
      }
      if (state.player.cash - preview.downPayment < 0) {
        set({ ...state, error: 'Insufficient cash for the desired down payment.' })
        return null
      }
      set({ ...state, step: 'summary', error: null })
      return toResult(state, preview)
    },
    reset: () => set(createInitialState()),
    raw: () => get({ subscribe }),
    computePreview: (state?: FacilityStartState) => computeLoanPreview(state ?? get({ subscribe })),
    tradeAreas: () => TRADE_AREAS,
    facilitiesForRegion: (regionId: string) => START_FACILITIES.filter((facility) => facility.regionId === regionId),
  }
}

export const facilityStart = facilityStartStore()
