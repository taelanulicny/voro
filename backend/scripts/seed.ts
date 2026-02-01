import { docClient, TABLE_NAMES } from '../src/utils/dynamodb';
import { PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Entity, PriceHistory } from '../src/models/types';
import { validateEntityIdsArray } from '../src/utils/idGenerator';
import { BASE_PRICE } from '../src/services/priceCalculationService';

// Entities data from mockEntities.ts
// EPSILON values are set based on expected daily trading volume per entity
// Higher epsilon = more stable prices (more tokens needed to move price)
// Lower epsilon = more volatile prices (fewer tokens move price more)
// Note: Ticker field removed - using entityId and name only
const ENTITIES: Omit<Entity, 'createdAt' | 'updatedAt' | 'positiveTokens' | 'negativeTokens'>[] = [
  // Very High Volume (45k-50k epsilon): Major celebrities, political figures
  { entityId: 10, name: 'Donald Trump', category: 'Politics', basePrice: 142.55, epsilon: 48000, description: 'Former president and political figure. Trade confidence in political influence and electoral prospects.' },
  { entityId: 21, name: 'Taylor Swift', category: 'People', basePrice: 198.64, epsilon: 50000, description: 'Award-winning singer-songwriter and global pop icon. Track confidence in Taylor Swift\'s album releases, tours, and cultural influence.' },
  { entityId: 12, name: 'MrBeast', category: 'People', basePrice: 195.83, epsilon: 48000, description: 'YouTube creator and philanthropist. Trade confidence in MrBeast\'s channel growth, business ventures, and social impact initiatives.' },
  { entityId: 22, name: 'Drake', category: 'People', basePrice: 192.37, epsilon: 47000, description: 'Grammy-winning rapper and record producer. Trade confidence in Drake\'s chart dominance, album releases, and business ventures.' },
  { entityId: 31, name: 'Joe Biden', category: 'Politics', basePrice: 141.23, epsilon: 45000, description: 'Current president of the United States. Track confidence in Joe Biden\'s policy decisions, approval ratings, and political influence.' },
  
  // High Volume (35k-40k epsilon): Popular influencers and artists
  { entityId: 11, name: 'Alix Earle', category: 'People', basePrice: 200.47, epsilon: 38000, description: 'TikTok influencer and content creator. Track confidence in Alix Earle\'s influence, brand partnerships, and audience growth.' },
  { entityId: 15, name: 'Logan Paul', category: 'People', basePrice: 178.91, epsilon: 37000, description: 'YouTube creator, boxer, and entrepreneur. Track confidence in Logan Paul\'s ventures, fight career, and business success.' },
  { entityId: 20, name: 'Charli D\'Amelio', category: 'People', basePrice: 182.56, epsilon: 36000, description: 'TikTok star and social media influencer. Trade confidence in Charli D\'Amelio\'s influence, brand deals, and career growth.' },
  { entityId: 14, name: 'Kai Cenat', category: 'People', basePrice: 185.29, epsilon: 35000, description: 'Twitch streamer and content creator. Trade confidence in Kai Cenat\'s streaming success, audience engagement, and career trajectory.' },
  { entityId: 24, name: 'Bad Bunny', category: 'People', basePrice: 181.79, epsilon: 38000, description: 'Global reggaeton and Latin trap artist. Trade confidence in Bad Bunny\'s chart success, tours, and cultural impact.' },
  
  // Medium-High Volume (30k-35k epsilon): Well-known creators and artists
  { entityId: 16, name: 'Emma Chamberlain', category: 'People', basePrice: 162.42, epsilon: 33000, description: 'YouTube creator and fashion influencer. Trade confidence in Emma Chamberlain\'s brand partnerships, content creation, and influence.' },
  { entityId: 19, name: 'Jake Paul', category: 'People', basePrice: 175.34, epsilon: 34000, description: 'YouTube creator, boxer, and entrepreneur. Track confidence in Jake Paul\'s boxing career, business ventures, and public profile.' },
  { entityId: 18, name: 'Alex Cooper', category: 'People', basePrice: 172.68, epsilon: 32000, description: 'Podcast host and media personality. Trade confidence in Alex Cooper\'s podcast success, brand expansion, and media influence.' },
  { entityId: 26, name: 'Olivia Rodrigo', category: 'People', basePrice: 173.86, epsilon: 35000, description: 'Rising pop star and songwriter. Trade confidence in Olivia Rodrigo\'s album success, chart performance, and growing fanbase.' },
  { entityId: 25, name: 'Travis Scott', category: 'People', basePrice: 177.23, epsilon: 34000, description: 'Hip-hop artist and record producer. Track confidence in Travis Scott\'s album releases, collaborations, and live performances.' },
  
  // Medium Volume (25k-30k epsilon): Popular artists and established tech
  { entityId: 27, name: 'Playboi Carti', category: 'People', basePrice: 169.41, epsilon: 28000, description: 'Rapper and songwriter known for experimental sound. Track confidence in Playboi Carti\'s releases and influence on hip-hop culture.' },
  { entityId: 28, name: 'Ice Spice', category: 'People', basePrice: 165.98, epsilon: 27000, description: 'Rising rapper and viral sensation. Trade confidence in Ice Spice\'s chart success, collaborations, and career growth.' },
  { entityId: 29, name: 'The Weeknd', category: 'People', basePrice: 162.54, epsilon: 29000, description: 'Grammy-winning singer, songwriter, and producer. Track confidence in The Weeknd\'s album releases, tours, and artistic evolution.' },
  { entityId: 30, name: 'Doja Cat', category: 'People', basePrice: 159.27, epsilon: 28000, description: 'Singer, rapper, and songwriter. Trade confidence in Doja Cat\'s chart-topping hits, album releases, and social media presence.' },
  { entityId: 23, name: 'Kanye West', category: 'People', basePrice: 186.52, epsilon: 30000, description: 'Influential rapper, producer, and fashion designer. Track confidence in Kanye West\'s music releases and brand partnerships.' },
  { entityId: 41, name: 'Perplexity', category: 'Tech', basePrice: 188.92, epsilon: 28000, description: 'AI search and research platform. Track confidence in Perplexity\'s user growth, product innovation, and competitive positioning.' },
  { entityId: 47, name: 'Cursor', category: 'Tech', basePrice: 190.53, epsilon: 27000, description: 'AI-powered code editor for developers. Track confidence in Cursor\'s developer adoption, product development, and market positioning.' },
  
  // Medium-Low Volume (20k-25k epsilon): Streamers, tech startups
  { entityId: 17, name: 'Adin Ross', category: 'People', basePrice: 145.76, epsilon: 23000, description: 'Twitch streamer and content creator. Track confidence in Adin Ross\'s streaming career, collaborations, and audience growth.' },
  { entityId: 13, name: 'Andrew Tate', category: 'People', basePrice: 128.13, epsilon: 24000, description: 'Controversial internet personality and former kickboxer. Track confidence in Andrew Tate\'s influence and media presence.' },
  { entityId: 43, name: 'Replit', category: 'Tech', basePrice: 195.28, epsilon: 25000, description: 'Cloud-based development platform and AI coding assistant. Track confidence in Replit\'s developer adoption, platform growth, and product evolution.' },
  { entityId: 45, name: 'Character.AI', category: 'Tech', basePrice: 182.16, epsilon: 24000, description: 'AI character conversation platform. Track confidence in Character.AI\'s user engagement, content creation, and platform development.' },
  { entityId: 44, name: 'Mercury', category: 'Tech', basePrice: 171.85, epsilon: 22000, description: 'Banking platform for startups. Trade confidence in Mercury\'s financial services growth, customer acquisition, and market expansion.' },
  
  // Lower Volume (15k-20k epsilon): Politicians, smaller tech startups
  { entityId: 32, name: 'Kamala Harris', category: 'Politics', basePrice: 138.67, epsilon: 20000, description: 'Vice President of the United States. Trade confidence in Kamala Harris\'s political standing, policy impact, and future prospects.' },
  { entityId: 33, name: 'Ron DeSantis', category: 'Politics', basePrice: 135.89, epsilon: 19000, description: 'Governor of Florida and political figure. Track confidence in Ron DeSantis\'s political influence, policy decisions, and electoral prospects.' },
  { entityId: 34, name: 'Alexandria Ocasio-Cortez', category: 'Politics', basePrice: 133.42, epsilon: 18000, description: 'U.S. Representative and progressive political figure. Trade confidence in Alexandria Ocasio-Cortez\'s policy advocacy and political influence.' },
  { entityId: 35, name: 'Vivek Ramaswamy', category: 'Politics', basePrice: 130.76, epsilon: 17000, description: 'Entrepreneur and political figure. Track confidence in Vivek Ramaswamy\'s political influence, policy positions, and public profile.' },
  { entityId: 36, name: 'Nikki Haley', category: 'Politics', basePrice: 128.54, epsilon: 18000, description: 'Former U.N. Ambassador and political figure. Trade confidence in Nikki Haley\'s political standing, policy influence, and electoral prospects.' },
  { entityId: 37, name: 'Gavin Newsom', category: 'Politics', basePrice: 126.18, epsilon: 17000, description: 'Governor of California and political figure. Track confidence in Gavin Newsom\'s policy decisions, political influence, and future prospects.' },
  { entityId: 38, name: 'Tucker Carlson', category: 'Politics', basePrice: 123.91, epsilon: 19000, description: 'Media personality and political commentator. Trade confidence in Tucker Carlson\'s influence, media presence, and political impact.' },
  { entityId: 39, name: 'Bernie Sanders', category: 'Politics', basePrice: 121.45, epsilon: 18000, description: 'U.S. Senator and progressive political figure. Track confidence in Bernie Sanders\'s policy advocacy, political influence, and public support.' },
  { entityId: 40, name: 'Cluely', category: 'Tech', basePrice: 175.63, epsilon: 16000, description: 'AI-powered startup focused on intelligent solutions. Trade confidence in Cluely\'s product development, market adoption, and growth trajectory.' },
  { entityId: 42, name: 'Abridge', category: 'Tech', basePrice: 162.47, epsilon: 17000, description: 'AI-powered medical transcription and documentation platform. Trade confidence in Abridge\'s healthcare technology adoption and market expansion.' },
  { entityId: 46, name: 'Luma AI', category: 'Tech', basePrice: 169.74, epsilon: 18000, description: '3D rendering and AI visualization technology. Trade confidence in Luma AI\'s product innovation, market adoption, and technology advancement.' },
  { entityId: 48, name: 'Vapi', category: 'Tech', basePrice: 157.39, epsilon: 15000, description: 'AI voice API platform. Trade confidence in Vapi\'s API adoption, developer ecosystem growth, and product innovation.' },
  { entityId: 49, name: 'Anysphere', category: 'Tech', basePrice: 164.82, epsilon: 16000, description: 'AI development tools and infrastructure. Track confidence in Anysphere\'s product development, developer adoption, and market growth.' },
];

async function seedEntities() {
  console.log('Seeding entities...');
  
  // Validate entity IDs are unique before seeding
  const validation = validateEntityIdsArray(ENTITIES);
  if (!validation.isValid) {
    console.error('❌ ERROR: Duplicate entity IDs found:', validation.duplicates);
    throw new Error(`Duplicate entity IDs found: ${validation.duplicates.join(', ')}`);
  }
  console.log('✅ Entity IDs validated: all unique');
  
  const now = new Date().toISOString();
  const entities: Entity[] = ENTITIES.map(e => ({
    ...e,
    positiveTokens: 0, // Initialize pools
    negativeTokens: 0,
    createdAt: now,
    updatedAt: now,
  }));

  // Batch write entities (DynamoDB batch write limit is 25 items)
  for (let i = 0; i < entities.length; i += 25) {
    const batch = entities.slice(i, i + 25);
    const requests = batch.map(entity => ({
      PutRequest: {
        Item: entity,
      },
    }));

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAMES.ENTITIES]: requests,
        },
      })
    );
    
    console.log(`Seeded ${Math.min(i + 25, entities.length)}/${entities.length} entities`);
  }

  console.log('Entities seeded successfully!');
}

async function seedInitialPrices() {
  console.log('Seeding initial prices...');
  
  const now = new Date().toISOString();
  
  for (const entity of ENTITIES) {
    // Start with BASE_PRICE (100) plus small random variation
    const variation = (Math.random() - 0.5) * 8; // -4 to +4 range
    const initialPrice = Math.round((BASE_PRICE + variation) * 100) / 100;

    const priceHistory: PriceHistory = {
      entityId: entity.entityId,
      timestamp: now,
      price: initialPrice,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.PRICE_HISTORY,
        Item: priceHistory,
      })
    );
  }

  console.log('Initial prices seeded successfully!');
}

async function main() {
  try {
    await seedEntities();
    await seedInitialPrices();
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

