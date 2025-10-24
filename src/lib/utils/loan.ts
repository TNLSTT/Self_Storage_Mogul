import { clamp } from '../simulation/helpers'

export const computeInterestRate = (baseRate: number, creditScore: number) => {
  const normalizedScore = clamp(creditScore, 300, 900)
  const spread = ((850 - normalizedScore) / 100) * 0.012
  return baseRate + spread
}

export const pmt = (rate: number, periods: number, principal: number) => {
  if (periods <= 0) return 0
  if (principal <= 0) return 0
  const monthlyRate = rate / 12
  if (monthlyRate === 0) {
    return principal / periods
  }
  const denominator = 1 - Math.pow(1 + monthlyRate, -periods)
  if (denominator === 0) {
    return principal / periods
  }
  return (principal * monthlyRate) / denominator
}

export const loanSeedFrom = (parts: string[]) => {
  const base = parts.join(':')
  let hash = 0
  for (let index = 0; index < base.length; index += 1) {
    hash = (hash * 31 + base.charCodeAt(index)) % 1_000_003
  }
  return hash + 11
}
