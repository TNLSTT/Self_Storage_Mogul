import type { DelinquencyPolicy, FacilityPricing } from '../types/game'

export const createDefaultPricing = (): FacilityPricing => ({
  climateControlled: { standard: 142, prime: 175, primeShare: 0.25 },
  driveUp: { standard: 105, prime: 125, primeShare: 0.2 },
  vault: { standard: 200, prime: 240, primeShare: 0.35 },
  specials: { offer: 'none', adoptionRate: 0 },
})

export const createDefaultDelinquency = (): DelinquencyPolicy => ({
  rate: 0.045,
  allowPaymentPlans: true,
  evictionDays: 45,
})
