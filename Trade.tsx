import React, { useState, useEffect } from 'react';

interface Entity {
  id: number;
  name: string;
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  rank: number;
  lineGraph: number[];
  is24H: boolean;
}

interface TradeProps {
  selectedCategory?: string;
  onBack: () => void;
  onCategorySelect?: (category: string) => void;
}

const Trade: React.FC<TradeProps> = ({ selectedCategory, onBack, onCategorySelect }) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [currentCategory, setCurrentCategory] = useState('All Categories');

  // Generate fake entity data
  const generateEntities = (category: string) => {
    // If "All Categories" is selected, show all available categories as entities
    if (category === 'All Categories') {
      const allCategories = [
        'Male Athletes', 'Startups', 'Influencers', 'Clothing Brands', 'Cities',
        'Universities', 'Tech Companies', 'Movies', 'Sports Teams', 'Crypto',
        'Gaming', 'Food & Beverage', 'Fashion', 'Entertainment'
      ];

      const entities: Entity[] = [];
      const baseVolume = 850000; // Starting volume for rank 1 (highest sentiment)

      for (let i = 0; i < allCategories.length; i++) {
        const rank = i + 1;
        const categoryName = allCategories[i];
        
        // Volume decreases as rank increases - rank 1 = highest volume
        const volumeDecrease = (rank - 1) * 55000; // Decrease by ~55k per rank
        const baseVolumeForRank = Math.max(baseVolume - volumeDecrease, 50000); // Minimum volume of 50k
        
        // Add some variation to make volumes look more realistic
        const volumeVariation = Math.floor((Math.random() - 0.5) * 20000); // ±10k variation
        const volume = baseVolumeForRank + volumeVariation;
        
        // No daily change for now - volume is strictly based on rank
        const change = 0;
        const changePercent = 0;

        // Generate line graph data (simplified) - shows volume trend
        const lineGraph = Array.from({ length: 20 }, (_, index) => {
          const baseValue = volume;
          const variation = (Math.random() - 0.5) * 50000;
          return Math.max(baseValue + variation - (index * 1000), 10000);
        });

        entities.push({
          id: i + 1,
          name: categoryName, // Just the category name, no rank number
          ticker: `CAT${rank}`,
          price: volume, // Using price field to store volume for display
          change: change,
          changePercent: changePercent,
          rank: rank,
          lineGraph: lineGraph,
          is24H: Math.random() > 0.5
        });
      }

      return entities;
    }

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
        default: return 'ALL';
      }
    };

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

      // Generate line graph data (simplified)
      const lineGraph = Array.from({ length: 20 }, (_, index) => {
        const baseValue = price;
        const variation = (Math.random() - 0.5) * 20;
        return Math.max(baseValue + variation - (index * 2), 5);
      });

      entities.push({
        id: i + 1,
        name: `${category} #${rank}`,
        ticker: `${categoryPrefix}${rank}`,
        price: Math.round(price * 100) / 100,
        change: change,
        changePercent: changePercent,
        rank: rank,
        lineGraph: lineGraph,
        is24H: Math.random() > 0.5
      });
    }

    return entities;
  };

  useEffect(() => {
    setEntities(generateEntities(currentCategory));
  }, [currentCategory]);


  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeBgColor = (change: number) => {
    return change >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  const getLineColor = (change: number) => {
    return change >= 0 ? '#10B981' : '#EF4444';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
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
          <h1 className="text-lg font-bold text-gray-900">Trade</h1>
          <div className="w-8"></div>
        </div>
      </div>



      {/* Entity List */}
      <div className="px-4 py-4">
        {entities.map((entity) => (
          <div 
            key={entity.id} 
            className={`bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100 ${
              currentCategory === 'All Categories' 
                ? 'cursor-pointer hover:bg-gray-50 transition-colors' 
                : ''
            }`}
            onClick={() => {
              if (currentCategory === 'All Categories' && onCategorySelect) {
                const baseCategoryName = entity.name.split(' #')[0]; // Extract base category name
                onCategorySelect(baseCategoryName); // Navigate to category page
              }
            }}
          >
            <div className="flex items-center justify-between">
              {/* Left Side - Category Name Only */}
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-900">{entity.name}</div>
              </div>

              {/* Middle Section - Line Graph */}
              <div className="flex-1 flex justify-center">
                <div className="w-24 h-12 relative">
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
                      points={entity.lineGraph.map((value, index) => {
                        const x = (index / (entity.lineGraph.length - 1)) * 100;
                        const y = 35 - ((value - Math.min(...entity.lineGraph)) / (Math.max(...entity.lineGraph) - Math.min(...entity.lineGraph))) * 30;
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke={getLineColor(entity.change)}
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>

              {/* Right Side - Volume */}
              <div className="flex-1 text-right">
                <div 
                  className="inline-block px-3 py-2 rounded-lg text-white font-bold text-lg bg-green-500"
                >
                  {Math.floor(entity.price).toLocaleString()}
                </div>
                <div className="text-sm mt-1 text-gray-600">
                  Volume
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Trade;
