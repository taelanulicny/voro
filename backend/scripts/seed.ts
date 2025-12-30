import { docClient, TABLE_NAMES } from '../src/utils/dynamodb';
import { PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Entity, PriceHistory } from '../src/models/types';
import { validateEntityIdsArray } from '../src/utils/idGenerator';

// Entities data from mockEntities.ts
const ENTITIES: Omit<Entity, 'createdAt'>[] = [
  { entityId: 10, ticker: 'TRUMP', name: 'Donald Trump', category: 'Politics', basePrice: 142.55, description: 'Former president and political figure. Trade confidence in political influence and electoral prospects.' },
  { entityId: 11, ticker: 'ALIX', name: 'Alix Earle', category: 'People', basePrice: 200.47, description: 'TikTok influencer and content creator. Track confidence in Alix Earle\'s influence, brand partnerships, and audience growth.' },
  { entityId: 12, ticker: 'MRBST', name: 'MrBeast', category: 'People', basePrice: 195.83, description: 'YouTube creator and philanthropist. Trade confidence in MrBeast\'s channel growth, business ventures, and social impact initiatives.' },
  { entityId: 14, ticker: 'KACEN', name: 'Kai Cenat', category: 'People', basePrice: 185.29, description: 'Twitch streamer and content creator. Trade confidence in Kai Cenat\'s streaming success, audience engagement, and career trajectory.' },
  { entityId: 20, ticker: 'CDAME', name: 'Charli D\'Amelio', category: 'People', basePrice: 182.56, description: 'TikTok star and social media influencer. Trade confidence in Charli D\'Amelio\'s influence, brand deals, and career growth.' },
  { entityId: 15, ticker: 'LPAUL', name: 'Logan Paul', category: 'People', basePrice: 178.91, description: 'YouTube creator, boxer, and entrepreneur. Track confidence in Logan Paul\'s ventures, fight career, and business success.' },
  { entityId: 19, ticker: 'JPAUL', name: 'Jake Paul', category: 'People', basePrice: 175.34, description: 'YouTube creator, boxer, and entrepreneur. Track confidence in Jake Paul\'s boxing career, business ventures, and public profile.' },
  { entityId: 18, ticker: 'ACOOP', name: 'Alex Cooper', category: 'People', basePrice: 172.68, description: 'Podcast host and media personality. Trade confidence in Alex Cooper\'s podcast success, brand expansion, and media influence.' },
  { entityId: 16, ticker: 'ECHAM', name: 'Emma Chamberlain', category: 'People', basePrice: 162.42, description: 'YouTube creator and fashion influencer. Trade confidence in Emma Chamberlain\'s brand partnerships, content creation, and influence.' },
  { entityId: 17, ticker: 'AROSS', name: 'Adin Ross', category: 'People', basePrice: 145.76, description: 'Twitch streamer and content creator. Track confidence in Adin Ross\'s streaming career, collaborations, and audience growth.' },
  { entityId: 13, ticker: 'ATATE', name: 'Andrew Tate', category: 'People', basePrice: 128.13, description: 'Controversial internet personality and former kickboxer. Track confidence in Andrew Tate\'s influence and media presence.' },
  { entityId: 21, ticker: 'TSWFT', name: 'Taylor Swift', category: 'People', basePrice: 198.64, description: 'Award-winning singer-songwriter and global pop icon. Track confidence in Taylor Swift\'s album releases, tours, and cultural influence.' },
  { entityId: 22, ticker: 'DRAKE', name: 'Drake', category: 'People', basePrice: 192.37, description: 'Grammy-winning rapper and record producer. Trade confidence in Drake\'s chart dominance, album releases, and business ventures.' },
  { entityId: 23, ticker: 'KANYE', name: 'Kanye West', category: 'People', basePrice: 186.52, description: 'Influential rapper, producer, and fashion designer. Track confidence in Kanye West\'s music releases and brand partnerships.' },
  { entityId: 24, ticker: 'BUNNY', name: 'Bad Bunny', category: 'People', basePrice: 181.79, description: 'Global reggaeton and Latin trap artist. Trade confidence in Bad Bunny\'s chart success, tours, and cultural impact.' },
  { entityId: 25, ticker: 'TSOTT', name: 'Travis Scott', category: 'People', basePrice: 177.23, description: 'Hip-hop artist and record producer. Track confidence in Travis Scott\'s album releases, collaborations, and live performances.' },
  { entityId: 26, ticker: 'RODRI', name: 'Olivia Rodrigo', category: 'People', basePrice: 173.86, description: 'Rising pop star and songwriter. Trade confidence in Olivia Rodrigo\'s album success, chart performance, and growing fanbase.' },
  { entityId: 27, ticker: 'CARTI', name: 'Playboi Carti', category: 'People', basePrice: 169.41, description: 'Rapper and songwriter known for experimental sound. Track confidence in Playboi Carti\'s releases and influence on hip-hop culture.' },
  { entityId: 28, ticker: 'ISPCE', name: 'Ice Spice', category: 'People', basePrice: 165.98, description: 'Rising rapper and viral sensation. Trade confidence in Ice Spice\'s chart success, collaborations, and career growth.' },
  { entityId: 29, ticker: 'WKEND', name: 'The Weeknd', category: 'People', basePrice: 162.54, description: 'Grammy-winning singer, songwriter, and producer. Track confidence in The Weeknd\'s album releases, tours, and artistic evolution.' },
  { entityId: 30, ticker: 'DOJAC', name: 'Doja Cat', category: 'People', basePrice: 159.27, description: 'Singer, rapper, and songwriter. Trade confidence in Doja Cat\'s chart-topping hits, album releases, and social media presence.' },
  { entityId: 31, ticker: 'JBIDN', name: 'Joe Biden', category: 'Politics', basePrice: 141.23, description: 'Current president of the United States. Track confidence in Joe Biden\'s policy decisions, approval ratings, and political influence.' },
  { entityId: 32, ticker: 'KHARR', name: 'Kamala Harris', category: 'Politics', basePrice: 138.67, description: 'Vice President of the United States. Trade confidence in Kamala Harris\'s political standing, policy impact, and future prospects.' },
  { entityId: 33, ticker: 'RDESA', name: 'Ron DeSantis', category: 'Politics', basePrice: 135.89, description: 'Governor of Florida and political figure. Track confidence in Ron DeSantis\'s political influence, policy decisions, and electoral prospects.' },
  { entityId: 34, ticker: 'AOC', name: 'Alexandria Ocasio-Cortez', category: 'Politics', basePrice: 133.42, description: 'U.S. Representative and progressive political figure. Trade confidence in Alexandria Ocasio-Cortez\'s policy advocacy and political influence.' },
  { entityId: 35, ticker: 'VRAMA', name: 'Vivek Ramaswamy', category: 'Politics', basePrice: 130.76, description: 'Entrepreneur and political figure. Track confidence in Vivek Ramaswamy\'s political influence, policy positions, and public profile.' },
  { entityId: 36, ticker: 'NHALE', name: 'Nikki Haley', category: 'Politics', basePrice: 128.54, description: 'Former U.N. Ambassador and political figure. Trade confidence in Nikki Haley\'s political standing, policy influence, and electoral prospects.' },
  { entityId: 37, ticker: 'GNEWS', name: 'Gavin Newsom', category: 'Politics', basePrice: 126.18, description: 'Governor of California and political figure. Track confidence in Gavin Newsom\'s policy decisions, political influence, and future prospects.' },
  { entityId: 38, ticker: 'TCARS', name: 'Tucker Carlson', category: 'Politics', basePrice: 123.91, description: 'Media personality and political commentator. Trade confidence in Tucker Carlson\'s influence, media presence, and political impact.' },
  { entityId: 39, ticker: 'BSAND', name: 'Bernie Sanders', category: 'Politics', basePrice: 121.45, description: 'U.S. Senator and progressive political figure. Track confidence in Bernie Sanders\'s policy advocacy, political influence, and public support.' },
  { entityId: 40, ticker: 'CLUEL', name: 'Cluely', category: 'Tech', basePrice: 175.63, description: 'AI-powered startup focused on intelligent solutions. Trade confidence in Cluely\'s product development, market adoption, and growth trajectory.' },
  { entityId: 41, ticker: 'PERPL', name: 'Perplexity', category: 'Tech', basePrice: 188.92, description: 'AI search and research platform. Track confidence in Perplexity\'s user growth, product innovation, and competitive positioning.' },
  { entityId: 42, ticker: 'ABRID', name: 'Abridge', category: 'Tech', basePrice: 162.47, description: 'AI-powered medical transcription and documentation platform. Trade confidence in Abridge\'s healthcare technology adoption and market expansion.' },
  { entityId: 43, ticker: 'REPLI', name: 'Replit', category: 'Tech', basePrice: 195.28, description: 'Cloud-based development platform and AI coding assistant. Track confidence in Replit\'s developer adoption, platform growth, and product evolution.' },
  { entityId: 44, ticker: 'MERCU', name: 'Mercury', category: 'Tech', basePrice: 171.85, description: 'Banking platform for startups. Trade confidence in Mercury\'s financial services growth, customer acquisition, and market expansion.' },
  { entityId: 45, ticker: 'CHRAC', name: 'Character.AI', category: 'Tech', basePrice: 182.16, description: 'AI character conversation platform. Track confidence in Character.AI\'s user engagement, content creation, and platform development.' },
  { entityId: 46, ticker: 'LUMAI', name: 'Luma AI', category: 'Tech', basePrice: 169.74, description: '3D rendering and AI visualization technology. Trade confidence in Luma AI\'s product innovation, market adoption, and technology advancement.' },
  { entityId: 47, ticker: 'CURSO', name: 'Cursor', category: 'Tech', basePrice: 190.53, description: 'AI-powered code editor for developers. Track confidence in Cursor\'s developer adoption, product development, and market positioning.' },
  { entityId: 48, ticker: 'VAPI', name: 'Vapi', category: 'Tech', basePrice: 157.39, description: 'AI voice API platform. Trade confidence in Vapi\'s API adoption, developer ecosystem growth, and product innovation.' },
  { entityId: 49, ticker: 'ANYSP', name: 'Anysphere', category: 'Tech', basePrice: 164.82, description: 'AI development tools and infrastructure. Track confidence in Anysphere\'s product development, developer adoption, and market growth.' },
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
    createdAt: now,
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
    // Start with base price plus small random variation
    const variation = (Math.random() - 0.5) * 8; // -4 to +4 range
    const initialPrice = Math.round((entity.basePrice + variation) * 100) / 100;

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

