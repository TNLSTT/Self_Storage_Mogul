import type {
  DelinquencyPolicy,
  FacilityPricing,
  FacilityState,
  PricingSpecials,
  PricingTier,
} from '../types/game'

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const sanitizeTier = (tier: PricingTier): PricingTier => {
  const standard = clampNumber(Number.isFinite(tier.standard) ? tier.standard : 0, 40, 600)
  const primeBase = clampNumber(Number.isFinite(tier.prime) ? tier.prime : standard + 10, 50, 800)
  const prime = Math.max(primeBase, standard + 5)
  const share = clampNumber(Number.isFinite(tier.primeShare) ? tier.primeShare : 0.2, 0, 0.6)
  return {
    standard,
    prime,
    primeShare: share,
  }
}

const sanitizeSpecials = (specials: PricingSpecials): PricingSpecials => {
  const offer = specials.offer === 'one_month_free' ? 'one_month_free' : 'none'
  const adoption = offer === 'none' ? 0 : clampNumber(specials.adoptionRate ?? 0, 0, 1)
  return {
    offer,
    adoptionRate: adoption,
  }
}

export const normalizePricingTier = (tier: Partial<PricingTier> | undefined, fallback: PricingTier): PricingTier =>
  sanitizeTier({
    standard: tier?.standard ?? fallback.standard,
    prime: tier?.prime ?? fallback.prime,
    primeShare: tier?.primeShare ?? fallback.primeShare,
  })

export const normalizeFacilityPricing = (
  pricing: Partial<FacilityPricing> | undefined,
  fallback: FacilityPricing
): FacilityPricing => ({
  climateControlled: normalizePricingTier(pricing?.climateControlled, fallback.climateControlled),
  driveUp: normalizePricingTier(pricing?.driveUp, fallback.driveUp),
  vault: normalizePricingTier(pricing?.vault, fallback.vault),
  specials: sanitizeSpecials(pricing?.specials ?? fallback.specials),
})

export const normalizeDelinquencyPolicy = (
  incoming: Partial<DelinquencyPolicy> | undefined,
  fallback: DelinquencyPolicy
): DelinquencyPolicy => ({
  rate: clampNumber(
    Number.isFinite(incoming?.rate) ? (incoming?.rate as number) : fallback.rate,
    0,
    0.3
  ),
  allowPaymentPlans: Boolean(incoming?.allowPaymentPlans ?? fallback.allowPaymentPlans),
  evictionDays: clampNumber(
    Number.isFinite(incoming?.evictionDays) ? (incoming?.evictionDays as number) : fallback.evictionDays,
    15,
    180
  ),
})

export const computeTierAverageRate = (tier: PricingTier): number => {
  const sanitized = sanitizeTier(tier)
  return sanitized.standard * (1 - sanitized.primeShare) + sanitized.prime * sanitized.primeShare
}

export const computeFacilityAverageRent = (facility: FacilityState): number => {
  const totalUnits = facility.mix.climateControlled + facility.mix.driveUp + facility.mix.vault
  if (totalUnits <= 0) return 0
  const pricing = facility.pricing
  const weighted =
    facility.mix.climateControlled * computeTierAverageRate(pricing.climateControlled) +
    facility.mix.driveUp * computeTierAverageRate(pricing.driveUp) +
    facility.mix.vault * computeTierAverageRate(pricing.vault)
  return weighted / totalUnits
}

export const specialsDiscountFactor = (pricing: FacilityPricing): number => {
  const specials = sanitizeSpecials(pricing.specials)
  if (specials.offer !== 'one_month_free') return 0
  return specials.adoptionRate / 12
}

export const paymentPlanCollectionRate = (policy: DelinquencyPolicy): number => (policy.allowPaymentPlans ? 0.55 : 0)

export const evictionUrgencyFactor = (policy: DelinquencyPolicy): number => {
  const days = clampNumber(policy.evictionDays, 15, 180)
  const normalized = 1 - days / 150
  return clampNumber(normalized, 0, 0.85)
}
