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
    id: 10,
    ticker: 'TRUMP',
    name: 'Donald Trump',
    category: 'Political Figures',
    basePrice: 142.55,
    description: 'Former president and political figure. Trade confidence in political influence and electoral prospects.',
  },
  // Influencers
  {
    id: 11,
    ticker: 'ALIX',
    name: 'Alix Earle',
    category: 'Influencers',
    basePrice: 200.47,
    description: 'TikTok influencer and content creator. Track confidence in Alix Earle\'s influence, brand partnerships, and audience growth.',
  },
  {
    id: 12,
    ticker: 'MRBST',
    name: 'MrBeast',
    category: 'Influencers',
    basePrice: 195.83,
    description: 'YouTube creator and philanthropist. Trade confidence in MrBeast\'s channel growth, business ventures, and social impact initiatives.',
  },
  {
    id: 14,
    ticker: 'KACEN',
    name: 'Kai Cenat',
    category: 'Influencers',
    basePrice: 185.29,
    description: 'Twitch streamer and content creator. Trade confidence in Kai Cenat\'s streaming success, audience engagement, and career trajectory.',
  },
  {
    id: 20,
    ticker: 'CDAME',
    name: 'Charli D\'Amelio',
    category: 'Influencers',
    basePrice: 182.56,
    description: 'TikTok star and social media influencer. Trade confidence in Charli D\'Amelio\'s influence, brand deals, and career growth.',
  },
  {
    id: 15,
    ticker: 'LPAUL',
    name: 'Logan Paul',
    category: 'Influencers',
    basePrice: 178.91,
    description: 'YouTube creator, boxer, and entrepreneur. Track confidence in Logan Paul\'s ventures, fight career, and business success.',
  },
  {
    id: 19,
    ticker: 'JPAUL',
    name: 'Jake Paul',
    category: 'Influencers',
    basePrice: 175.34,
    description: 'YouTube creator, boxer, and entrepreneur. Track confidence in Jake Paul\'s boxing career, business ventures, and public profile.',
  },
  {
    id: 18,
    ticker: 'ACOOP',
    name: 'Alex Cooper',
    category: 'Influencers',
    basePrice: 172.68,
    description: 'Podcast host and media personality. Trade confidence in Alex Cooper\'s podcast success, brand expansion, and media influence.',
  },
  {
    id: 16,
    ticker: 'ECHAM',
    name: 'Emma Chamberlain',
    category: 'Influencers',
    basePrice: 162.42,
    description: 'YouTube creator and fashion influencer. Trade confidence in Emma Chamberlain\'s brand partnerships, content creation, and influence.',
  },
  {
    id: 17,
    ticker: 'AROSS',
    name: 'Adin Ross',
    category: 'Influencers',
    basePrice: 145.76,
    description: 'Twitch streamer and content creator. Track confidence in Adin Ross\'s streaming career, collaborations, and audience growth.',
  },
  {
    id: 13,
    ticker: 'ATATE',
    name: 'Andrew Tate',
    category: 'Influencers',
    basePrice: 128.13,
    description: 'Controversial internet personality and former kickboxer. Track confidence in Andrew Tate\'s influence and media presence.',
  },
  // Music Artists
  {
    id: 21,
    ticker: 'TSWFT',
    name: 'Taylor Swift',
    category: 'Music Artists',
    basePrice: 198.64,
    description: 'Award-winning singer-songwriter and global pop icon. Track confidence in Taylor Swift\'s album releases, tours, and cultural influence.',
  },
  {
    id: 22,
    ticker: 'DRAKE',
    name: 'Drake',
    category: 'Music Artists',
    basePrice: 192.37,
    description: 'Grammy-winning rapper and record producer. Trade confidence in Drake\'s chart dominance, album releases, and business ventures.',
  },
  {
    id: 23,
    ticker: 'KANYE',
    name: 'Kanye West',
    category: 'Music Artists',
    basePrice: 186.52,
    description: 'Influential rapper, producer, and fashion designer. Track confidence in Kanye West\'s music releases and brand partnerships.',
  },
  {
    id: 24,
    ticker: 'BUNNY',
    name: 'Bad Bunny',
    category: 'Music Artists',
    basePrice: 181.79,
    description: 'Global reggaeton and Latin trap artist. Trade confidence in Bad Bunny\'s chart success, tours, and cultural impact.',
  },
  {
    id: 25,
    ticker: 'TSOTT',
    name: 'Travis Scott',
    category: 'Music Artists',
    basePrice: 177.23,
    description: 'Hip-hop artist and record producer. Track confidence in Travis Scott\'s album releases, collaborations, and live performances.',
  },
  {
    id: 26,
    ticker: 'RODRI',
    name: 'Olivia Rodrigo',
    category: 'Music Artists',
    basePrice: 173.86,
    description: 'Rising pop star and songwriter. Trade confidence in Olivia Rodrigo\'s album success, chart performance, and growing fanbase.',
  },
  {
    id: 27,
    ticker: 'CARTI',
    name: 'Playboi Carti',
    category: 'Music Artists',
    basePrice: 169.41,
    description: 'Rapper and songwriter known for experimental sound. Track confidence in Playboi Carti\'s releases and influence on hip-hop culture.',
  },
  {
    id: 28,
    ticker: 'ISPCE',
    name: 'Ice Spice',
    category: 'Music Artists',
    basePrice: 165.98,
    description: 'Rising rapper and viral sensation. Trade confidence in Ice Spice\'s chart success, collaborations, and career growth.',
  },
  {
    id: 29,
    ticker: 'WKEND',
    name: 'The Weeknd',
    category: 'Music Artists',
    basePrice: 162.54,
    description: 'Grammy-winning singer, songwriter, and producer. Track confidence in The Weeknd\'s album releases, tours, and artistic evolution.',
  },
  {
    id: 30,
    ticker: 'DOJAC',
    name: 'Doja Cat',
    category: 'Music Artists',
    basePrice: 159.27,
    description: 'Singer, rapper, and songwriter. Trade confidence in Doja Cat\'s chart-topping hits, album releases, and social media presence.',
  },
  // Political Figures
  {
    id: 31,
    ticker: 'JBIDN',
    name: 'Joe Biden',
    category: 'Political Figures',
    basePrice: 141.23,
    description: 'Current president of the United States. Track confidence in Joe Biden\'s policy decisions, approval ratings, and political influence.',
  },
  {
    id: 32,
    ticker: 'KHARR',
    name: 'Kamala Harris',
    category: 'Political Figures',
    basePrice: 138.67,
    description: 'Vice President of the United States. Trade confidence in Kamala Harris\'s political standing, policy impact, and future prospects.',
  },
  {
    id: 33,
    ticker: 'RDESA',
    name: 'Ron DeSantis',
    category: 'Political Figures',
    basePrice: 135.89,
    description: 'Governor of Florida and political figure. Track confidence in Ron DeSantis\'s political influence, policy decisions, and electoral prospects.',
  },
  {
    id: 34,
    ticker: 'AOC',
    name: 'Alexandria Ocasio-Cortez',
    category: 'Political Figures',
    basePrice: 133.42,
    description: 'U.S. Representative and progressive political figure. Trade confidence in Alexandria Ocasio-Cortez\'s policy advocacy and political influence.',
  },
  {
    id: 35,
    ticker: 'VRAMA',
    name: 'Vivek Ramaswamy',
    category: 'Political Figures',
    basePrice: 130.76,
    description: 'Entrepreneur and political figure. Track confidence in Vivek Ramaswamy\'s political influence, policy positions, and public profile.',
  },
  {
    id: 36,
    ticker: 'NHALE',
    name: 'Nikki Haley',
    category: 'Political Figures',
    basePrice: 128.54,
    description: 'Former U.N. Ambassador and political figure. Trade confidence in Nikki Haley\'s political standing, policy influence, and electoral prospects.',
  },
  {
    id: 37,
    ticker: 'GNEWS',
    name: 'Gavin Newsom',
    category: 'Political Figures',
    basePrice: 126.18,
    description: 'Governor of California and political figure. Track confidence in Gavin Newsom\'s policy decisions, political influence, and future prospects.',
  },
  {
    id: 38,
    ticker: 'TCARS',
    name: 'Tucker Carlson',
    category: 'Political Figures',
    basePrice: 123.91,
    description: 'Media personality and political commentator. Trade confidence in Tucker Carlson\'s influence, media presence, and political impact.',
  },
  {
    id: 39,
    ticker: 'BSAND',
    name: 'Bernie Sanders',
    category: 'Political Figures',
    basePrice: 121.45,
    description: 'U.S. Senator and progressive political figure. Track confidence in Bernie Sanders\'s policy advocacy, political influence, and public support.',
  },
  // Startups
  {
    id: 40,
    ticker: 'CLUEL',
    name: 'Cluely',
    category: 'Startups',
    basePrice: 175.63,
    description: 'AI-powered startup focused on intelligent solutions. Trade confidence in Cluely\'s product development, market adoption, and growth trajectory.',
  },
  {
    id: 41,
    ticker: 'PERPL',
    name: 'Perplexity',
    category: 'Startups',
    basePrice: 188.92,
    description: 'AI search and research platform. Track confidence in Perplexity\'s user growth, product innovation, and competitive positioning.',
  },
  {
    id: 42,
    ticker: 'ABRID',
    name: 'Abridge',
    category: 'Startups',
    basePrice: 162.47,
    description: 'AI-powered medical transcription and documentation platform. Trade confidence in Abridge\'s healthcare technology adoption and market expansion.',
  },
  {
    id: 43,
    ticker: 'REPLI',
    name: 'Replit',
    category: 'Startups',
    basePrice: 195.28,
    description: 'Cloud-based development platform and AI coding assistant. Track confidence in Replit\'s developer adoption, platform growth, and product evolution.',
  },
  {
    id: 44,
    ticker: 'MERCU',
    name: 'Mercury',
    category: 'Startups',
    basePrice: 171.85,
    description: 'Banking platform for startups. Trade confidence in Mercury\'s financial services growth, customer acquisition, and market expansion.',
  },
  {
    id: 45,
    ticker: 'CHRAC',
    name: 'Character.AI',
    category: 'Startups',
    basePrice: 182.16,
    description: 'AI character conversation platform. Track confidence in Character.AI\'s user engagement, content creation, and platform development.',
  },
  {
    id: 46,
    ticker: 'LUMAI',
    name: 'Luma AI',
    category: 'Startups',
    basePrice: 169.74,
    description: '3D rendering and AI visualization technology. Trade confidence in Luma AI\'s product innovation, market adoption, and technology advancement.',
  },
  {
    id: 47,
    ticker: 'CURSO',
    name: 'Cursor',
    category: 'Startups',
    basePrice: 190.53,
    description: 'AI-powered code editor for developers. Track confidence in Cursor\'s developer adoption, product development, and market positioning.',
  },
  {
    id: 48,
    ticker: 'VAPI',
    name: 'Vapi',
    category: 'Startups',
    basePrice: 157.39,
    description: 'AI voice API platform. Trade confidence in Vapi\'s API adoption, developer ecosystem growth, and product innovation.',
  },
  {
    id: 49,
    ticker: 'ANYSP',
    name: 'Anysphere',
    category: 'Startups',
    basePrice: 164.82,
    description: 'AI development tools and infrastructure. Track confidence in Anysphere\'s product development, developer adoption, and market growth.',
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

/**
 * Get entity by name (case-insensitive)
 */
export const getEntityByName = (name: string): MockEntity | undefined => {
  return MOCK_ENTITIES.find(entity => 
    entity.name.toLowerCase() === name.toLowerCase()
  );
};

/**
 * Validate that all entities have unique IDs
 * This is a runtime check to ensure data integrity
 */
export function validateEntityIds(): { isValid: boolean; duplicates: number[] } {
  const ids = MOCK_ENTITIES.map(e => e.id);
  const seen = new Set<number>();
  const duplicates: number[] = [];
  
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.push(id);
    } else {
      seen.add(id);
    }
  }
  
  return {
    isValid: duplicates.length === 0,
    duplicates,
  };
}

// Validate on module load (development only)
if (__DEV__) {
  const validation = validateEntityIds();
  if (!validation.isValid) {
    console.error('❌ Duplicate entity IDs found:', validation.duplicates);
    throw new Error(`Duplicate entity IDs found: ${validation.duplicates.join(', ')}`);
  }
}

