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
    const entityIdNum = parseInt(id);
    const basePrice = 400 - (entityIdNum - 1) * 7.6;
    const price = Math.max(basePrice + (Math.random() - 0.5) * 2, 20);
    
    // Generate sentiment score (SAME algorithm as CategoryPage)
    // Higher rank = higher base sentiment
    const baseSentiment = 100 - (entityIdNum - 1) * 1.5; // Rank 1 = ~100%, Rank 50 = ~26%
    
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
      likes: Math.floor(Math.random() * 1000),
      shares: Math.floor(Math.random() * 100),
      sentiment: ['positive', 'negative', 'neutral'][i % 3] as 'positive' | 'negative' | 'neutral'
    }));

    // Generate trading history
    const tradingHistory: Trade[] = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      price: price + (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 10000) + 1000,
      timestamp: new Date(Date.now() - i * 300000).toISOString(),
      type: ['buy', 'sell'][Math.floor(Math.random() * 2)] as 'buy' | 'sell'
    }));

    return {
      id: entityIdNum,
      name: `${category} #${entityIdNum}`,
      ticker: `${category.substring(0, 3).toUpperCase()}${entityIdNum}`,
      price: Math.round(price * 100) / 100,
      change: 0,
      changePercent: 0,
      rank: entityIdNum,
      volume: Math.floor(Math.random() * 100000) + 10000,
      marketCap: Math.floor(price * 1000000),
      sentiment: baseSentiment, // Use calculated base sentiment
      description: `${category} #${entityIdNum} represents a high-potential entity in the ${category} category, showing strong market sentiment and trading activity.`,
      category: category,
      lineGraph: Array.from({ length: 100 }, (_, index) => {
        // Generate sentiment-based data (0-100 scale) - SAME algorithm as CategoryPage
        // CategoryPage shows first 20 points as preview, EntityPage shows all 100 points
        const timeVariation = Math.sin(index * 0.1) * 10; // Cyclical sentiment changes
        const randomVariation = (Math.random() - 0.5) * 15; // Random sentiment spikes/dips
        const trendVariation = (index * 0.05); // Slight upward trend over time
        
        const sentiment = Math.max(0, Math.min(100, 
          baseSentiment + timeVariation + randomVariation + trendVariation
        ));
        
        return sentiment;
      }),
      news: news,
      socialFeed: socialFeed,
      tradingHistory: tradingHistory,
      is24H: Math.random() > 0.5
    };
  };

  useEffect(() => {
    setEntity(generateEntityData(entityId, categoryName));
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-3xl font-bold text-gray-900">${entity.price.toFixed(2)}</div>
            <div className={`text-lg ${getChangeColor(entity.change)}`}>
              {entity.change >= 0 ? '+' : ''}{entity.change.toFixed(2)} {entity.change >= 0 ? '+' : ''}{entity.changePercent.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-500">Open, {new Date().toLocaleTimeString()} ET</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">H/L {entity.price + 5}-{entity.price - 5}</div>
            <div className="text-sm text-gray-600">Volume {formatNumber(entity.volume)}</div>
            <div className="text-sm text-gray-600">Mkt Cap {formatNumber(entity.marketCap)}</div>
          </div>
        </div>
      </div>

      {/* Main Content - Always Visible */}
      <div className="py-6 space-y-6">
        {/* 1. CHART SECTION - Always Visible */}
        <div className="space-y-4">
          {/* Price Chart */}
          <div className="bg-white">
            <div className="h-80 relative">
              <div className="h-full bg-white relative">
                {/* Generate more volatile price data */}
                {(() => {
                  const dataPoints = 50;
                  const basePrice = entity.price;
                  const volatility = 15; // More movement
                  const points = [];
                  
                  for (let i = 0; i < dataPoints; i++) {
                    const x = (i / (dataPoints - 1)) * 100;
                    // Create more realistic price movement with trends and reversals
                    const trend = Math.sin(i * 0.3) * 20; // Main trend
                    const noise = (Math.random() - 0.5) * volatility; // Random noise
                    const reversal = Math.sin(i * 0.1) * 10; // Smaller reversals
                    const y = 50 + trend + noise + reversal; // Center around 50, scale to 0-100
                    points.push(`${x},${Math.max(5, Math.min(95, y))}`);
                  }
                  
                  const minY = Math.min(...points.map(p => parseFloat(p.split(',')[1])));
                  const maxY = Math.max(...points.map(p => parseFloat(p.split(',')[1])));
                  const currentY = parseFloat(points[points.length - 1].split(',')[1]);
                  
                  return (
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* Main price line - thinner and more volatile */}
                      <polyline
                        points={points.join(' ')}
                        fill="none"
                        stroke="#3B82F6" // Blue color like screenshot
                        strokeWidth="1.5" // Thinner line
                      />
                      
                      {/* Current price horizontal line */}
                      <line
                        x1="0"
                        y1={currentY}
                        x2="100"
                        y2={currentY}
                        stroke="#10B981"
                        strokeDasharray="2,2"
                        strokeWidth="0.5"
                      />
                      
                      {/* High point marker */}
                      <circle
                        cx={points.find(p => parseFloat(p.split(',')[1]) === maxY)?.split(',')[0] || "50"}
                        cy={maxY}
                        r="2"
                        fill="#000"
                      />
                      
                      {/* Low point marker */}
                      <circle
                        cx={points.find(p => parseFloat(p.split(',')[1]) === minY)?.split(',')[0] || "50"}
                        cy={minY}
                        r="2"
                        fill="#000"
                      />
                      
                      {/* Current price marker */}
                      <circle
                        cx="100"
                        cy={currentY}
                        r="2"
                        fill="#3B82F6"
                      />
                    </svg>
                  );
                })()}
                
                {/* Right-side price panel */}
                <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-between text-right">
                  <div className="text-xs text-gray-600">
                    <div className="font-semibold">${(entity.price * 1.05).toFixed(2)}</div>
                    <div className="text-green-600">+0.87%</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    <div className="font-semibold">${entity.price.toFixed(2)}</div>
                    <div className="text-red-600">-0.43%</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    <div className="font-semibold">${(entity.price * 0.95).toFixed(2)}</div>
                    <div className="text-gray-500">-1.2%</div>
                  </div>
                </div>
                
                {/* Price labels on graph */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* High price label */}
                  <div className="absolute text-xs font-semibold text-gray-800" 
                       style={{ 
                         left: '20%', 
                         top: '15%' 
                       }}>
                    ${(entity.price * 1.08).toFixed(2)}
                  </div>
                  
                  {/* Low price label */}
                  <div className="absolute text-xs font-semibold text-gray-800" 
                       style={{ 
                         left: '70%', 
                         top: '80%' 
                       }}>
                    ${(entity.price * 0.92).toFixed(2)}
                  </div>
                  
                  {/* Current price label */}
                  <div className="absolute text-xs font-semibold text-green-600" 
                       style={{ 
                         left: '85%', 
                         top: '45%' 
                       }}>
                    ${entity.price.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Time Options - Moved to bottom */}
            <div className="bg-white px-4 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {['1 min', 'Daily', 'Weekly', 'Monthly', 'Quarterly'].map((timeframe) => (
                    <button
                      key={timeframe}
                      className={`px-3 py-1 text-sm rounded ${
                        timeframe === '1 min' 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {timeframe}
                    </button>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  ${formatNumber(entity.volume)} vol
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. FEED SECTION - Always Visible */}
        <div className="space-y-4 px-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Live Feed</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Live</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {entity.socialFeed.slice(0, 5).map((post) => (
                <div key={post.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {post.author.charAt(1).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">{post.author}</span>
                        <span className="text-sm text-gray-500">{post.platform}</span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-500">
                          {new Date(post.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-800 mb-2">{post.content}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <button className="flex items-center space-x-1 hover:text-red-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>{post.likes}</span>
                        </button>
                        <button className="flex items-center space-x-1 hover:text-blue-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{post.shares}</span>
                        </button>
                        <span className={`px-2 py-1 rounded text-xs ${
                          post.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                          post.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {post.sentiment}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityPage;