import React, { useState, useEffect } from 'react';

interface EntityData {
  id: number;
  name: string;
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  rank: number;
  volume: number;
  marketCap: number;
  sentiment: number;
  description: string;
  category: string;
  lineGraph: number[];
  news: NewsItem[];
  socialFeed: SocialPost[];
  tradingHistory: Trade[];
  is24H: boolean;
}

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
}

interface SocialPost {
  id: number;
  content: string;
  author: string;
  platform: string;
  timestamp: string;
  likes: number;
  shares: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface Trade {
  id: number;
  price: number;
  volume: number;
  timestamp: string;
  type: 'buy' | 'sell';
}

interface EntityPageProps {
  entityId: string;
  categoryName: string;
  onBack: () => void;
}

const EntityPage: React.FC<EntityPageProps> = ({ entityId, categoryName, onBack }) => {
  const [entity, setEntity] = useState<EntityData | null>(null);

  // Generate comprehensive entity data
  const generateEntityData = (id: string, category: string): EntityData => {
    const entityIdNum = parseInt(id) || 1; // Default to 1 if parsing fails
    const basePrice = 400 - (entityIdNum - 1) * 7.6;
    
    // Use seeded random for consistent data
    const seed = entityIdNum + category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seededRandom = (index: number) => {
      const x = Math.sin(seed + index * 0.1) * 10000;
      return x - Math.floor(x);
    };
    
    const price = Math.max(basePrice + (seededRandom(2000) - 0.5) * 2, 20);
    
    console.log(`EntityPage: Generating data for entityId="${id}", parsed=${entityIdNum}, category="${category}"`);
    
    // Generate realistic entity name and ticker (EXACT SAME as CategoryPage)
    const getEntityName = (category: string, rank: number) => {
      const names: { [key: string]: string[] } = {
        'Male Athletes': ['LeBron James', 'Tom Brady', 'Lionel Messi', 'Cristiano Ronaldo', 'Tiger Woods', 'Roger Federer', 'Usain Bolt', 'Michael Phelps', 'Kobe Bryant', 'Serena Williams', 'Aaron Rodgers', 'Patrick Mahomes', 'Stephen Curry', 'Kevin Durant', 'Mike Trout', 'Connor McDavid', 'Lewis Hamilton', 'Rafael Nadal', 'Novak Djokovic', 'Virat Kohli', 'Neymar Jr', 'Kylian Mbappé', 'Luka Dončić', 'Giannis Antetokounmpo', 'Jayson Tatum', 'Luka Modrić', 'Robert Lewandowski', 'Mohamed Salah', 'Sadio Mané', 'Erling Haaland', 'Kylian Mbappé', 'Jadon Sancho', 'Phil Foden', 'Mason Mount', 'Declan Rice', 'Bukayo Saka', 'Jude Bellingham', 'Pedri', 'Gavi', 'Ansu Fati', 'Frenkie de Jong', 'Matthijs de Ligt', 'Ryan Gravenberch', 'Xavi Simons', 'Timothy Weah', 'Christian Pulisic', 'Weston McKennie', 'Tyler Adams', 'Gio Reyna'],
        'Startups': ['OpenAI', 'Stripe', 'Canva', 'Figma', 'Notion', 'Linear', 'Vercel', 'Supabase', 'PlanetScale', 'Railway', 'Render', 'Netlify', 'Vercel', 'Prisma', 'tRPC', 'Next.js', 'Remix', 'SvelteKit', 'Nuxt', 'Vue', 'React', 'Angular', 'Svelte', 'Solid', 'Qwik', 'Astro', 'SvelteKit', 'Nuxt', 'Vue', 'React', 'Angular', 'Svelte', 'Solid', 'Qwik', 'Astro', 'SvelteKit', 'Nuxt', 'Vue', 'React', 'Angular', 'Svelte', 'Solid', 'Qwik', 'Astro', 'SvelteKit', 'Nuxt', 'Vue', 'React', 'Angular'],
        'Influencers': ['MrBeast', 'PewDiePie', 'T-Series', 'Cocomelon', 'SET India', '5-Minute Crafts', 'WWE', 'Like Nastya', 'Vlad and Niki', 'Dude Perfect', 'Markiplier', 'Jacksepticeye', 'DanTDM', 'VanossGaming', 'PrestonPlayz', 'SSundee', 'PopularMMOs', 'TheDiamondMinecart', 'CaptainSparklez', 'Skeppy', 'BadBoyHalo', 'GeorgeNotFound', 'Dream', 'Sapnap', 'TommyInnit', 'Tubbo', 'Ranboo', 'Wilbur Soot', 'Philza', 'Technoblade', 'Quackity', 'Karl Jacobs', 'Foolish Gamers', 'Slimecicle', 'ConnorEatsPants', 'Fundy', 'Nihachu', 'Jack Manifold', 'Tubbo', 'Ranboo', 'Wilbur Soot', 'Philza', 'Technoblade', 'Quackity', 'Karl Jacobs', 'Foolish Gamers', 'Slimecicle', 'ConnorEatsPants', 'Fundy', 'Nihachu'],
        'Clothing Brands': ['Nike', 'Adidas', 'Supreme', 'Off-White', 'Balenciaga', 'Gucci', 'Louis Vuitton', 'Chanel', 'Dior', 'Prada', 'Versace', 'Armani', 'Tom Ford', 'Saint Laurent', 'Givenchy', 'Celine', 'Loewe', 'Bottega Veneta', 'Fendi', 'Valentino', 'Burberry', 'Alexander McQueen', 'Rick Owens', 'Raf Simons', 'Vivienne Westwood', 'Comme des Garçons', 'Issey Miyake', 'Yohji Yamamoto', 'Junya Watanabe', 'Undercover', 'A Bathing Ape', 'Stüssy', 'Champion', 'Carhartt', 'Dickies', 'Levi\'s', 'Wrangler', 'Lee', 'Gap', 'Old Navy', 'Banana Republic', 'J.Crew', 'Uniqlo', 'Zara', 'H&M', 'Forever 21', 'Urban Outfitters', 'American Eagle', 'Hollister', 'Abercrombie & Fitch'],
        'Cities': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Mesa', 'Kansas City', 'Atlanta', 'Long Beach', 'Colorado Springs', 'Raleigh', 'Miami', 'Virginia Beach', 'Omaha', 'Oakland', 'Minneapolis', 'Tulsa', 'Arlington', 'Tampa', 'New Orleans'],
        'Universities': ['Harvard', 'Stanford', 'MIT', 'Yale', 'Princeton', 'Columbia', 'University of Chicago', 'Penn', 'Caltech', 'Duke', 'Northwestern', 'Johns Hopkins', 'Dartmouth', 'Brown', 'Vanderbilt', 'Rice', 'Washington University', 'Cornell', 'Emory', 'Georgetown', 'Carnegie Mellon', 'UCLA', 'UC Berkeley', 'USC', 'NYU', 'University of Michigan', 'University of Virginia', 'UNC Chapel Hill', 'Wake Forest', 'Tufts', 'Boston University', 'Northeastern', 'Tulane', 'University of Florida', 'University of Texas', 'University of Georgia', 'University of North Carolina', 'University of Wisconsin', 'University of Illinois', 'Ohio State', 'Purdue', 'Indiana University', 'University of Minnesota', 'University of Iowa', 'University of Missouri', 'University of Kansas', 'University of Nebraska', 'University of Colorado', 'Arizona State', 'University of Arizona'],
        'Tech Companies': ['Apple', 'Microsoft', 'Google', 'Amazon', 'Meta', 'Tesla', 'Netflix', 'Nvidia', 'Oracle', 'Salesforce', 'Adobe', 'Intel', 'Cisco', 'IBM', 'Qualcomm', 'Broadcom', 'ServiceNow', 'Workday', 'Snowflake', 'CrowdStrike', 'Okta', 'Zscaler', 'Palo Alto Networks', 'Fortinet', 'Splunk', 'MongoDB', 'Elastic', 'Datadog', 'New Relic', 'Atlassian', 'Slack', 'Zoom', 'DocuSign', 'Square', 'PayPal', 'Stripe', 'Shopify', 'Twilio', 'SendGrid', 'Mailchimp', 'HubSpot', 'Salesforce', 'Zendesk', 'Intercom', 'Freshworks', 'Monday.com', 'Asana', 'Notion', 'Airtable', 'Figma'],
        'Movies': ['Avatar', 'Avengers: Endgame', 'Titanic', 'Star Wars', 'Jurassic World', 'The Lion King', 'The Avengers', 'Furious 7', 'Frozen II', 'Avengers: Infinity War', 'Top Gun: Maverick', 'Black Panther', 'Harry Potter', 'Spider-Man', 'Transformers', 'The Dark Knight', 'Pirates of the Caribbean', 'Toy Story', 'Finding Nemo', 'Incredibles', 'Shrek', 'Despicable Me', 'Minions', 'Frozen', 'Moana', 'Coco', 'Inside Out', 'Up', 'Wall-E', 'Ratatouille', 'Cars', 'Monsters Inc', 'Finding Dory', 'The Incredibles', 'Cars 2', 'Monsters University', 'Cars 3', 'Incredibles 2', 'Toy Story 4', 'Onward', 'Soul', 'Luca', 'Turning Red', 'Lightyear', 'Elemental', 'Wish', 'Inside Out 2', 'Elio', 'Zootopia 2', 'Frozen 3', 'Moana 2']
      };
      
      const entityNames = names[category] || [];
      return entityNames[rank - 1] || `${category} #${rank}`;
    };

    const entityName = getEntityName(category, entityIdNum);
    
    // Generate 4-letter ticker that's recognizable from the entity name (SAME as CategoryPage)
    const getEntityTicker = (name: string, rank: number) => {
      const words = name.split(' ').filter(w => w.length > 0);
      const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');
      
      let ticker = '';
      const usedLetters = new Set<string>();
      
      // Helper function to add a letter if not already used
      const addLetter = (letter: string) => {
        if (letter && !usedLetters.has(letter) && ticker.length < 4) {
          ticker += letter;
          usedLetters.add(letter);
          return true;
        }
        return false;
      };
      
      if (words.length >= 2) {
        // Multi-word name: use initials of first words
        for (let i = 0; i < Math.min(words.length, 2); i++) {
          addLetter(words[i].charAt(0).toUpperCase());
        }
        
        // Fill remaining spots with consonants from last word
        const lastWord = words[words.length - 1].toUpperCase();
        for (let char of lastWord) {
          if (ticker.length >= 4) break;
          if (!'AEIOU'.includes(char)) {
            addLetter(char);
          }
        }
        
        // If still need more, use any remaining unique letters from the name
        for (let char of cleanName) {
          if (ticker.length >= 4) break;
          addLetter(char);
        }
      } else {
        // Single word: use first letter + consonants
        addLetter(cleanName.charAt(0));
        
        // Add unique consonants
        for (let char of cleanName) {
          if (ticker.length >= 4) break;
          if (!'AEIOU'.includes(char)) {
            addLetter(char);
          }
        }
        
        // Fill with any remaining unique letters
        for (let char of cleanName) {
          if (ticker.length >= 4) break;
          addLetter(char);
        }
      }
      
      return ticker.padEnd(4, 'X').substring(0, 4);
    };
    
    const ticker = getEntityTicker(entityName, entityIdNum);
    
    // Generate sentiment score (SAME algorithm as CategoryPage)
    // Higher rank = higher base sentiment
    const baseSentiment = 100 - (entityIdNum - 1) * 1.5; // Rank 1 = ~100%, Rank 50 = ~26%
    
    // Generate chart characteristics (SAME as CategoryPage)
    const volatility = 15 + (seededRandom(0) * 35); // How much the price swings (15-50) - REALISTIC
    const trendDirection = seededRandom(1) > 0.5 ? 1 : -1; // Overall trend up or down
    const trendStrength = seededRandom(2) * 18; // How strong the trend is (0-18) - MODERATE TRENDS
    const numPeaks = Math.floor(3 + seededRandom(3) * 5); // Number of peaks/valleys (3-8) - GOOD MOVEMENT
    
    // Generate news data
    const news: NewsItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: `${category} #${entityIdNum} ${['Gains Momentum', 'Faces Challenges', 'Shows Strong Performance', 'Experiences Volatility', 'Reaches New Heights'][i % 5]}`,
      summary: `Recent developments in ${category} #${entityIdNum} have shown significant activity in the market.`,
      source: ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'Yahoo Finance'][i % 5],
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      sentiment: ['positive', 'negative', 'neutral'][i % 3] as 'positive' | 'negative' | 'neutral',
      impact: ['high', 'medium', 'low'][i % 3] as 'high' | 'medium' | 'low'
    }));

    // Generate social feed data
    const socialFeed: SocialPost[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      content: `${category} #${entityIdNum} is ${['trending up', 'looking strong', 'facing headwinds', 'breaking out', 'consolidating'][i % 5]} today!`,
      author: `@trader${i + 1}`,
      platform: ['Twitter', 'Reddit', 'Discord', 'Telegram'][i % 4],
      timestamp: new Date(Date.now() - i * 1800000).toISOString(),
      likes: Math.floor(seededRandom(5000 + i) * 1000),
      shares: Math.floor(seededRandom(6000 + i) * 100),
      sentiment: ['positive', 'negative', 'neutral'][i % 3] as 'positive' | 'negative' | 'neutral'
    }));

    // Generate trading history
    const tradingHistory: Trade[] = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      price: price + (seededRandom(7000 + i) - 0.5) * 10,
      volume: Math.floor(seededRandom(8000 + i) * 10000) + 1000,
      timestamp: new Date(Date.now() - i * 300000).toISOString(),
      type: ['buy', 'sell'][Math.floor(seededRandom(9000 + i) * 2)] as 'buy' | 'sell'
    }));

    return {
      id: entityIdNum,
      name: entityName,
      ticker: ticker,
      price: Math.round(price * 100) / 100,
      change: 0, // Will be calculated after lineGraph is generated
      changePercent: 0, // Will be calculated after lineGraph is generated
      rank: entityIdNum,
      volume: Math.floor(seededRandom(3000) * 100000) + 10000,
      marketCap: Math.floor(price * 1000000),
      sentiment: baseSentiment, // Use calculated base sentiment
      description: `${entityName} represents a high-potential entity in the ${category} category, showing strong market sentiment and trading activity.`,
      category: category,
      lineGraph: Array.from({ length: 100 }, (_, index) => {
        // Use the SAME algorithm as CategoryPage for consistency
        const progress = index / 99;
        const startY = 40 + seededRandom(4) * 20;
        const baseY = startY + (trendDirection * trendStrength * progress);
        const oscillation = Math.sin(progress * Math.PI * numPeaks) * volatility * seededRandom(5 + index);
        const noise = (seededRandom(100 + index) - 0.5) * 5; // BALANCED NOISE
        
        const sentiment = Math.max(0, Math.min(100, baseY + oscillation + noise));
        return sentiment;
      }),
      news: news,
      socialFeed: socialFeed,
      tradingHistory: tradingHistory,
      is24H: seededRandom(4000) > 0.5
    };
  };

  // Calculate realistic daily change based on chart movement after entity is created
  const calculatePriceChange = (entity: EntityData) => {
    const startSentiment = entity.lineGraph[0];
    const endSentiment = entity.lineGraph[entity.lineGraph.length - 1];
    const sentimentChange = endSentiment - startSentiment;
    const changePercent = (sentimentChange / 100) * 10; // Scale sentiment change to price change
    const change = (entity.price * changePercent) / 100;
    
    return {
      ...entity,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100
    };
  };

  useEffect(() => {
    const generatedEntity = generateEntityData(entityId, categoryName);
    const entityWithPriceChange = calculatePriceChange(generatedEntity);
    setEntity(entityWithPriceChange);
  }, [entityId, categoryName]);

  if (!entity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading entity data...</p>
        </div>
      </div>
    );
  }

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* Header */}
      <div className="bg-white py-4 border-b border-gray-200">
        <div className="flex items-center justify-between px-4">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{entity.ticker}</h1>
          <div className="flex items-center space-x-3">
            <button className="text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Price and Change - Top Left */}
        <div className="flex items-center justify-between mb-4 px-4">
          <div>
            <div className="text-3xl font-bold text-gray-900">${entity.price.toFixed(2)}</div>
            <div className={`text-lg ${getChangeColor(entity.change)}`}>
              {entity.change >= 0 ? '+' : ''}{entity.change.toFixed(2)} {entity.change >= 0 ? '+' : ''}{entity.changePercent.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-500">Open, {new Date().toLocaleTimeString()} ET</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Volume {formatNumber(entity.volume)}</div>
            <div className="text-sm text-gray-600">Mkt Cap {formatNumber(entity.marketCap)}</div>
          </div>
        </div>
      </div>

      {/* Main Content - Always Visible */}
      <div className="space-y-0">
        {/* 1. CHART SECTION - Always Visible */}
        <div>
          {/* Price Chart */}
          <div className="bg-white">
            <div className="relative border border-gray-200 rounded" style={{ height: '30vh' }}>
              <div className="h-full bg-white relative">
                {/* Use the same chart data as CategoryPage */}
                {(() => {
                  if (!entity || !entity.lineGraph || entity.lineGraph.length === 0) {
                    return (
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#10B981" strokeWidth="0.5" />
                        <text x="50" y="50" textAnchor="middle" fontSize="8" fill="#666">Chart Loading...</text>
                      </svg>
                    );
                  }
                  
                  // Convert sentiment data to chart points (same as CategoryPage mini chart)
                  const points = entity.lineGraph.map((sentiment, index) => {
                    const x = (index / (entity.lineGraph.length - 1)) * 100;
                    const y = 100 - sentiment; // Invert Y so higher sentiment = higher on chart
                    return `${x},${y}`;
                  });
                  
                  console.log('Using entity.lineGraph data with', points.length, 'points for entity', entityId);
                  
                  return (
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* Main price line - same data as CategoryPage */}
                      <polyline
                        points={points.join(' ')}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="0.5"
                      />
                      
                      {/* Current price marker */}
                      <circle
                        cx="95"
                        cy={points[points.length - 1].split(',')[1]}
                        r="1"
                        fill="#10B981"
                      />
                    </svg>
                  );
                })()}
                
                
                
                {/* Time labels at bottom - matching screenshot */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 pb-1">
                  <div className="text-xs text-gray-500">08:00</div>
                  <div className="text-xs text-gray-500">10:51</div>
                  <div className="text-xs text-gray-500">13:42</div>
                  <div className="text-xs text-gray-500">00:18</div>
                </div>
              </div>
            </div>
            
            {/* Time Options - Matching screenshot */}
            <div className="bg-white py-3 border-t border-gray-200">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                  {['24H', '5D', '1M', '3M', '1Y', '5Y', 'Max'].map((timeframe) => (
                    <button
                      key={timeframe}
                      className={`px-3 py-1 text-sm rounded ${
                        timeframe === '24H' 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {timeframe}
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. FEED SECTION - Always Visible - Full Width */}
        <div className="space-y-0">
          {entity.socialFeed.slice(0, 5).map((post) => (
            <div key={post.id} className="bg-white border-b border-gray-100 p-4">
              <div className="flex items-start space-x-3">
                {/* Profile Picture */}
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">
                    {post.author.charAt(1).toUpperCase()}
                  </span>
                </div>
                
                {/* Post Content */}
                <div className="flex-1 min-w-0">
                  {/* User Info and Actions */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">{post.author}</span>
                      <span className="text-sm text-gray-500">
                        {Math.floor(Math.random() * 60) + 1}m ago
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-600">
                        + Follow
                      </button>
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Post Content */}
                  <div className="mb-3">
                    <p className="text-gray-800">
                      <span className="text-blue-600 font-semibold">${entity.ticker}</span> {post.content}
                    </p>
                  </div>
                  
                  {/* Interaction Buttons */}
                  <div className="flex items-center space-x-6">
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-sm">Comment</span>
                    </button>
                    
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-green-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm">Share</span>
                    </button>
                    
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-red-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className="text-sm">Like {post.likes > 0 ? post.likes : ''}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EntityPage;