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

  // Generate fake entity data for this specific category
  const generateEntities = (category: string) => {
    const entities: Entity[] = [];
    const basePrice = 400; // Starting price for rank 1
    const categoryPrefix = getCategoryPrefix(category);

    for (let i = 0; i < 50; i++) {
      const rank = i + 1;
      // Price decreases as rank increases - rank 1 = highest price, rank 50 = lowest price
      const priceDecrease = (rank - 1) * 7.6; // Decrease by ~7.6 per rank to get from 400 to ~20
      const basePriceForRank = Math.max(basePrice - priceDecrease, 20); // Minimum price of $20
      
      // Add some cents variation to make prices look more realistic
      const centsVariation = (Math.random() - 0.5) * 2; // -1 to +1 cents variation
      const price = basePriceForRank + centsVariation;
      
      // No daily change for now - price is strictly based on rank
      const change = 0;
      const changePercent = 0;

      // Seeded random number generator for consistent patterns per entity
      const seed = rank + category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seededRandom = (index: number) => {
        const x = Math.sin(seed + index * 0.1) * 10000;
        return x - Math.floor(x);
      };
      
      // Generate sentiment score for this entity (based on rank)
      // Higher rank = higher base sentiment
      const baseSentiment = 100 - (rank - 1) * 1.5; // Rank 1 = ~100%, Rank 50 = ~26%
      
      // Generate line graph data - matches EntityPage algorithm for consistency - HIGH VOLATILITY
      const volatility = 20 + (seededRandom(0) * 50); // How much the price swings (20-70) - MUCH MORE VOLATILE
      const trendDirection = seededRandom(1) > 0.5 ? 1 : -1; // Overall trend up or down
      const trendStrength = seededRandom(2) * 25; // How strong the trend is (0-25) - STRONGER TRENDS
      const numPeaks = Math.floor(4 + seededRandom(3) * 6); // Number of peaks/valleys (4-10) - MORE SWINGS
      
      const lineGraph = Array.from({ length: 20 }, (_, index) => {
        // Create the same pattern as the full chart but simplified
        const progress = index / 19;
        const startY = 40 + seededRandom(4) * 20;
        const baseY = startY + (trendDirection * trendStrength * progress);
        const oscillation = Math.sin(progress * Math.PI * numPeaks) * volatility * seededRandom(5 + index);
        const noise = (seededRandom(100 + index) - 0.5) * 8; // INCREASED NOISE
        
        const sentiment = Math.max(0, Math.min(100, baseY + oscillation + noise));
        return sentiment;
      });

      entities.push({
        id: i + 1,
        name: `${category} #${rank}`,
        ticker: `${categoryPrefix}${rank}`,
        price: Math.round(price * 100) / 100,
        change: change,
        changePercent: changePercent,
        rank: rank,
        sentiment: baseSentiment, // Store base sentiment for EntityPage
        lineGraph: lineGraph,
        is24H: Math.random() > 0.5
      });
    }

    return entities;
  };

  useEffect(() => {
    setEntities(generateEntities(categoryName));
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
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    {/* Baseline */}
                    <line 
                      x1="0" y1="35" x2="100" y2="35" 
                      stroke="#E5E7EB" 
                      strokeWidth="1" 
                      strokeDasharray="2,2"
                    />
                    {/* Line Graph */}
                    <polyline
                      points={entity.lineGraph.map((sentiment, index) => {
                        const x = (index / (entity.lineGraph.length - 1)) * 100;
                        const y = 35 - (sentiment / 100) * 30; // Convert sentiment (0-100) to chart position
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke={entity.lineGraph[entity.lineGraph.length - 1] >= 50 ? '#10B981' : '#EF4444'} // Green if sentiment >= 50%, red if < 50%
                      strokeWidth="2"
                    />
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
