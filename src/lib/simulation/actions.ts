import type { Draft } from 'immer'
import { ACTION_LOOKUP } from '../data/actions'
import type { ActionDefinition, GameActionId, GameState } from '../types/game'
import { clamp, pushLog } from './helpers'
import { nextRandom } from '../utils/random'

const MANAGER_PROFILES = [
  {
    id: 'atlas',
    name: 'Atlas-5 Efficiency Core',
    archetype: 'atlas' as const,
    description: 'Relentless optimizer obsessed with throughput and uptime.',
    bonuses: { automation: 0.18, reputation: -0.01, revenue: 0.06 },
  },
  {
    id: 'nebula',
    name: 'Nebula Concierge AI',
    archetype: 'nebula' as const,
    description: 'Customer empathy routines that turn storage tours into fandoms.',
    bonuses: { automation: 0.12, reputation: 0.06, revenue: 0.04 },
  },
  {
    id: 'caretaker',
    name: 'Caretaker Loop v3',
    archetype: 'caretaker' as const,
    description: 'Focuses on longevity, climate stability, and community goodwill.',
    bonuses: { automation: 0.1, reputation: 0.08, revenue: 0.02 },
  },
]

export const applyActionEffects = (
  state: Draft<GameState>,
  action: GameActionId,
  definition: ActionDefinition = ACTION_LOOKUP[action]
) => {
  switch (action) {
    case 'expand_capacity': {
      state.facility.totalUnits += 40
      state.market.referenceRent += 5
      state.financials.valuation += 40 * state.facility.averageRent * 3.5
      state.facility.prestige = clamp(state.facility.prestige + 0.05, 0, 1.5)
      state.market.storyBeat = 'Construction crews pivot drones to raise a new solar canopy wing.'
      pushLog(state, 'Groundbreakers deployed: 40 new climate pods coming online soon.', 'positive')
      break
    }
    case 'launch_campaign': {
      state.marketing.momentum = clamp(state.marketing.momentum + 0.45, 0, 1.8)
      state.marketing.level = Math.min(state.marketing.level + 1, 6)
      state.marketing.brandStrength = clamp(state.marketing.brandStrength + 0.18, 0, 1)
      state.market.storyBeat = 'Drone billboards flood the skyline with iridescent storage promos.'
      pushLog(state, 'Influencer tours booked. Expect a rush of new move-ins within days.', 'positive')
      break
    }
    case 'optimize_pricing': {
      state.facility.averageRent += 8
      state.market.referenceRent += 2
      state.marketing.momentum = clamp(state.marketing.momentum - 0.05, 0, 2)
      state.marketing.brandStrength = clamp(state.marketing.brandStrength + 0.05, 0, 1)
      pushLog(state, 'Pricing AI rolled out new tiers and micro-lease bundles.', 'info')
      break
    }
    case 'train_ai_manager': {
      const roll = Math.floor(nextRandom(state) * MANAGER_PROFILES.length)
      const profile = MANAGER_PROFILES[roll]
      state.automation.aiManager = {
        ...profile,
        active: true,
      }
      const automationBoost = profile.bonuses.automation + 0.15
      state.automation.level = clamp(state.automation.level + automationBoost, 0, 1.2)
      state.automation.reliability = clamp(state.automation.reliability + 0.12, 0, 1)
      state.facility.automationLevel = state.automation.level
      state.facility.reputation = clamp(state.facility.reputation + profile.bonuses.reputation * 100, 30, 99)
      state.financials.valuation += 125000 * profile.bonuses.revenue
      pushLog(state, `${profile.name} activated to orchestrate robotics and guest services.`, 'positive')
      break
    }
    default: {
      pushLog(state, `${definition.title} executed.`, 'info')
    }
  }
}
