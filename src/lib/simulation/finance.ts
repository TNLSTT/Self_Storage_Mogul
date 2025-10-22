import type { GameState } from '../types/game'
import { clamp } from './helpers'
import {
  evictionUrgencyFactor,
  paymentPlanCollectionRate,
  specialsDiscountFactor,
} from '../utils/facility'

export interface CashFlowSnapshot {
  dailyRevenue: number
  dailyExpenses: number
  operatingDailyNet: number
  averageDailyRent: number
  effectiveOccupancyRate: number
  delinquentShare: number
}

export interface CashFlowOverrides {
  payingUnits?: number
  remainingDelinquentUnits?: number
  collectionRate?: number
  dailyRent?: number
  specialsDiscount?: number
  managerRevenueBonus?: number
}

export const computeCashFlowSnapshot = (
  state: Pick<GameState, 'facility' | 'financials' | 'automation' | 'marketing' | 'market'>,
  overrides: CashFlowOverrides = {}
): CashFlowSnapshot => {
  const pricing = state.facility.pricing
  const specialsDiscount =
    overrides.specialsDiscount !== undefined
      ? overrides.specialsDiscount
      : specialsDiscountFactor(pricing)
  const delinquencyPolicy = state.facility.delinquency
  const delinquencyRate = clamp(delinquencyPolicy.rate, 0, 0.3)
  const evictionUrgency = evictionUrgencyFactor(delinquencyPolicy)
  const evictionMitigation = delinquencyPolicy.allowPaymentPlans ? 0.5 : 1
  const collectionRate =
    overrides.collectionRate !== undefined
      ? overrides.collectionRate
      : paymentPlanCollectionRate(delinquencyPolicy)

  let remainingDelinquentUnits = overrides.remainingDelinquentUnits
  let payingUnits = overrides.payingUnits

  if (remainingDelinquentUnits === undefined || payingUnits === undefined) {
    const delinquentUnitsRaw = state.facility.occupiedUnits * delinquencyRate
    const evictedUnits = delinquentUnitsRaw * evictionUrgency * evictionMitigation
    const cappedDelinquent = Math.max(0, delinquentUnitsRaw - evictedUnits)
    remainingDelinquentUnits = Math.min(state.facility.occupiedUnits, cappedDelinquent)
    payingUnits = Math.max(0, state.facility.occupiedUnits - remainingDelinquentUnits)
  }

  const managerRevenueBonus =
    overrides.managerRevenueBonus ?? state.automation.aiManager?.bonuses.revenue ?? 0
  const dailyRent = overrides.dailyRent ?? state.facility.averageRent / 30
  const effectiveRevenueUnits = (payingUnits + remainingDelinquentUnits * collectionRate) * (1 + managerRevenueBonus)

  const revenue = effectiveRevenueUnits * dailyRent * (1 - specialsDiscount)
  const operations = (420 + state.facility.totalUnits * 2.6) * (1 - state.automation.level * 0.18)
  const marketingSpend = 240 * state.marketing.level + state.marketing.momentum * 160
  const automationSpend = 160 * (1 + state.automation.level * 2)
  const interest = (state.financials.debt * state.financials.interestRate) / 360
  const insurance = state.market.climateRisk * 120
  const expenses = operations + marketingSpend + automationSpend + interest + insurance
  const net = revenue - expenses

  const totalUnits = Math.max(state.facility.totalUnits, 1)
  const effectiveOccupancyRate = clamp(effectiveRevenueUnits / totalUnits, 0, 1)
  const delinquentShare = clamp(remainingDelinquentUnits / totalUnits, 0, 1)

  return {
    dailyRevenue: revenue,
    dailyExpenses: expenses,
    operatingDailyNet: net,
    averageDailyRent: dailyRent,
    effectiveOccupancyRate,
    delinquentShare,
  }
}
