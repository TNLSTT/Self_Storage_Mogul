import type { ActionDefinition, GameActionId } from '../types/game'

export const ACTION_DEFINITIONS: ActionDefinition[] = [
  {
    id: 'expand_capacity',
    title: 'Construct 40 New Units',
    description: 'Acquire the adjacent lot and add climate-controlled units with solar canopies.',
    impact: 'Adds inventory and nudges valuation upward while temporarily lowering occupancy.',
    cost: 75000,
    cooldown: 12,
    icon: '🏗️',
  },
  {
    id: 'launch_campaign',
    title: 'Launch Drone Billboard Campaign',
    description: 'Deploy geo-fenced ads and influencer tours to spike local demand.',
    impact: 'Boosts marketing momentum and brand strength for several ticks.',
    cost: 12000,
    cooldown: 6,
    icon: '📡',
  },
  {
    id: 'optimize_pricing',
    title: 'Recalibrate Dynamic Pricing',
    description: 'Feed new comps into the pricing AI and rebalance unit mix incentives.',
    impact: 'Raises average rent with a slight hit to short-term absorption.',
    cost: 3500,
    cooldown: 4,
    icon: '📈',
  },
  {
    id: 'train_ai_manager',
    title: 'Train AI Facility Manager',
    description: 'Spin up an AI personality to orchestrate maintenance drones and customer ops.',
    impact: 'Major automation boost, steadier occupancy, and tailored event dispatches.',
    cost: 95000,
    cooldown: 16,
    icon: '🤖',
  },
]

export const ACTION_LOOKUP: Record<GameActionId, ActionDefinition> = ACTION_DEFINITIONS.reduce(
  (map, action) => ({ ...map, [action.id]: action }),
  {} as Record<GameActionId, ActionDefinition>
)
