import React, { useState, useEffect } from 'react';

interface Entity {
  id: number;
  name: string;
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  rank: number;
  sentiment: number; // Base sentiment score (0-100)
  lineGraph: number[]; // Daily sentiment data points
  is24H: boolean;
}

interface CategoryPageProps {
  categoryName: string;
  onBack: () => void;
  onEntityClick?: (entityId: string, categoryName: string) => void;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ categoryName, onBack, onEntityClick }) => {
  const [entities, setEntities] = useState<Entity[]>([]);

  // Generate category-specific ticker prefix
  const getCategoryPrefix = (cat: string) => {
    switch (cat) {
      case 'Male Athletes': return 'ATH';
      case 'Startups': return 'STU';
      case 'Influencers': return 'INF';
      case 'Clothing Brands': return 'CLB';
      case 'Cities': return 'CTY';
      case 'Universities': return 'UNI';
      case 'Tech Companies': return 'TCH';
      case 'Movies': return 'MOV';
      case 'Sports Teams': return 'SPT';
      case 'Crypto': return 'CRY';
      case 'Gaming': return 'GAM';
      case 'Food & Beverage': return 'FNB';
      case 'Fashion': return 'FSH';
      case 'Entertainment': return 'ENT';
      default: return 'CAT';
    }
  };

  // Generate realistic fake entity data for this specific category
  const generateEntities = (category: string) => {
    const entities: Entity[] = [];
    const basePrice = 400; // Starting price for rank 1
    const categoryPrefix = getCategoryPrefix(category);

    // Realistic entity names for each category
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
      
      const categoryNames = names[category] || Array.from({ length: 50 }, (_, i) => `${category} #${i + 1}`);
      return categoryNames[rank - 1] || `${category} #${rank}`;
    };

    for (let i = 0; i < 50; i++) {
      const rank = i + 1;
      // Price decreases as rank increases - rank 1 = highest price, rank 50 = lowest price
      const priceDecrease = (rank - 1) * 7.6; // Decrease by ~7.6 per rank to get from 400 to ~20
      const basePriceForRank = Math.max(basePrice - priceDecrease, 20); // Minimum price of $20
      
      // Add some cents variation to make prices look more realistic
      const centsVariation = (Math.random() - 0.5) * 2; // -1 to +1 cents variation
      const price = basePriceForRank + centsVariation;
      
      // Generate realistic daily change (-5% to +5%)
      const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%
      const change = (price * changePercent) / 100;

      // Seeded random number generator for consistent patterns per entity
      const seed = rank + category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seededRandom = (index: number) => {
        const x = Math.sin(seed + index * 0.1) * 10000;
        return x - Math.floor(x);
      };
      
      // Generate sentiment score for this entity (based on rank)
      // Higher rank = higher base sentiment
      const baseSentiment = 100 - (rank - 1) * 1.5; // Rank 1 = ~100%, Rank 50 = ~26%
      
      // Generate line graph data - matches EntityPage algorithm for consistency - BALANCED VOLATILITY
      const volatility = 15 + (seededRandom(0) * 35); // How much the price swings (15-50) - REALISTIC
      const trendDirection = seededRandom(1) > 0.5 ? 1 : -1; // Overall trend up or down
      const trendStrength = seededRandom(2) * 18; // How strong the trend is (0-18) - MODERATE TRENDS
      const numPeaks = Math.floor(3 + seededRandom(3) * 5); // Number of peaks/valleys (3-8) - GOOD MOVEMENT
      
      const lineGraph = Array.from({ length: 20 }, (_, index) => {
        // Create the same pattern as the full chart but simplified
        const progress = index / 19;
        const startY = 40 + seededRandom(4) * 20;
        const baseY = startY + (trendDirection * trendStrength * progress);
        const oscillation = Math.sin(progress * Math.PI * numPeaks) * volatility * seededRandom(5 + index);
        const noise = (seededRandom(100 + index) - 0.5) * 5; // BALANCED NOISE
        
        const sentiment = Math.max(0, Math.min(100, baseY + oscillation + noise));
        return sentiment;
      });

      const entityName = getEntityName(category, rank);
      const ticker = `${categoryPrefix}${rank}`;
      
      entities.push({
        id: i + 1,
        name: entityName,
        ticker: ticker,
        price: Math.round(price * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        rank: rank,
        sentiment: baseSentiment, // Store base sentiment for EntityPage
        lineGraph: lineGraph,
        is24H: Math.random() > 0.5
      });
    }

    return entities;
  };

  useEffect(() => {
    const generatedEntities = generateEntities(categoryName);
    console.log(`Generated ${generatedEntities.length} entities for ${categoryName}:`, generatedEntities[0]);
    setEntities(generatedEntities);
  }, [categoryName]);

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="bg-gray-50" style={{ minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">{categoryName}</h1>
          <div className="w-8"></div>
        </div>
      </div>

      {/* Category Info */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-md font-semibold text-gray-900">{categoryName} Trading</h2>
            <p className="text-sm text-gray-600">Ranked by public sentiment</p>
          </div>
          <span className="text-sm text-gray-500">{entities.length} entities</span>
        </div>
      </div>

      {/* Entity List */}
      <div className="px-4 py-4">
        {entities.map((entity) => (
          <div 
            key={entity.id} 
            className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => onEntityClick ? onEntityClick(entity.id.toString(), categoryName) : null}
          >
            <div className="flex items-center justify-between">
              {/* Left Side - Ticker and Name */}
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-900 mb-1">{entity.ticker}</div>
                <div className="text-sm text-gray-600">{entity.name}</div>
              </div>

              {/* Middle Section - Line Graph */}
              <div className="flex-1 flex justify-center">
                <div className="relative" style={{ width: '6rem', height: '3rem' }}>
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Line Graph - looks like mini version of entity page chart */}
                    {entity.lineGraph && entity.lineGraph.length > 0 ? (
                      <polyline
                        points={entity.lineGraph.map((sentiment, index) => {
                          const x = (index / (entity.lineGraph.length - 1)) * 100;
                          const y = 100 - sentiment; // Invert Y so higher sentiment = higher on chart
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke={entity.lineGraph[entity.lineGraph.length - 1] >= 50 ? '#10B981' : '#EF4444'} // Green if sentiment >= 50%, red if < 50%
                        strokeWidth="1"
                      />
                    ) : (
                      // Fallback line if no data
                      <line x1="0" y1="50" x2="100" y2="50" stroke="#10B981" strokeWidth="1" />
                    )}
                  </svg>
                </div>
              </div>

              {/* Right Side - Price and After-hours */}
              <div className="flex-1 text-right">
                <div 
                  className={`inline-block px-3 py-2 rounded-lg text-white font-bold text-lg ${
                    entity.change >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  ${entity.price.toFixed(2)}
                </div>
                <div className={`text-sm mt-1 ${getChangeColor(entity.change)}`}>
                  Change: {entity.change >= 0 ? '+' : ''}{entity.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPage;
