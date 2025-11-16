/**
 * Centralized Mock Entity Data
 * This ensures consistent entity information across all screens
 */

export interface MockEntity {
  id: number;
  ticker: string;
  name: string;
  category: string;
  basePrice: number;
  description: string;
}

// Single source of truth for all entities
export const MOCK_ENTITIES: MockEntity[] = [
  {
    id: 1,
    ticker: 'OPENAI',
    name: 'OpenAI',
    category: 'Tech',
    basePrice: 180,
    description: 'Leading AI research and deployment company. Track confidence in OpenAI\'s continued innovation and market impact.',
  },
  {
    id: 2,
    ticker: 'CAND-X',
    name: 'Candidate X',
    category: 'Politics',
    basePrice: 120,
    description: 'Political candidate with growing momentum. Trade confidence in electoral success and policy impact.',
  },
  {
    id: 3,
    ticker: 'AISAFE',
    name: 'AI Safety Initiative',
    category: 'Tech',
    basePrice: 95,
    description: 'Initiative focused on responsible AI development. Track confidence in AI safety measures and adoption.',
  },
  {
    id: 4,
    ticker: 'BTCHLV',
    name: 'Bitcoin Halving 2028',
    category: 'Crypto',
    basePrice: 145,
    description: 'Upcoming Bitcoin halving event. Trade confidence in the impact on Bitcoin price and adoption.',
  },
  {
    id: 5,
    ticker: 'MUSK',
    name: 'Elon Musk',
    category: 'People',
    basePrice: 165,
    description: 'Entrepreneur and innovator. Track confidence in Musk\'s ventures and influence on tech and business.',
  },
  {
    id: 6,
    ticker: 'AGI',
    name: 'Artificial General Intelligence',
    category: 'Tech',
    basePrice: 210,
    description: 'The race toward human-level AI. Trade confidence in AGI timeline and breakthrough achievements.',
  },
  {
    id: 7,
    ticker: 'STARSH',
    name: 'Starship Success',
    category: 'Events',
    basePrice: 135,
    description: 'SpaceX Starship orbital missions. Track confidence in successful launches and Mars mission timeline.',
  },
  {
    id: 8,
    ticker: 'NEURL',
    name: 'Neuralink IPO',
    category: 'Tech',
    basePrice: 88,
    description: 'Brain-computer interface company. Trade confidence in Neuralink\'s public offering and market reception.',
  },
  {
    id: 9,
    ticker: 'SOLANA',
    name: 'Solana Ecosystem',
    category: 'Crypto',
    basePrice: 115,
    description: 'High-performance blockchain platform. Track confidence in Solana\'s growth and adoption.',
  },
  {
    id: 10,
    ticker: 'TRUMP',
    name: 'Donald Trump',
    category: 'Politics',
    basePrice: 142,
    description: 'Former president and political figure. Trade confidence in political influence and electoral prospects.',
  },
];

/**
 * Get entity by ID
 */
export const getEntityById = (id: number): MockEntity | undefined => {
  return MOCK_ENTITIES.find(entity => entity.id === id);
};

/**
 * Get entity by ticker
 */
export const getEntityByTicker = (ticker: string): MockEntity | undefined => {
  return MOCK_ENTITIES.find(entity => entity.ticker === ticker);
};

/**
 * Get all entities
 */
export const getAllEntities = (): MockEntity[] => {
  return MOCK_ENTITIES;
};

/**
 * Get entities by category
 */
export const getEntitiesByCategory = (category: string): MockEntity[] => {
  return MOCK_ENTITIES.filter(entity => entity.category === category);
};

