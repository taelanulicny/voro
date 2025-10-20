import React from 'react';

interface HomeProps {
  onCategoryClick: (category: string) => void;
  onTradeableCategoriesClick?: () => void;
  onSeasonCompetitionClick?: () => void;
}

const Home: React.FC<HomeProps> = ({ onCategoryClick, onTradeableCategoriesClick, onSeasonCompetitionClick }) => {
  return (
    <div className="bg-gray-50" style={{ minHeight: '100vh', paddingBottom: '8rem' }}>
      {/* Profile Section - Top 40% */}
      <div className="bg-white px-4 py-6">
        {/* Profile Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-gray-400 rounded-full"></div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Taelan Ulicny</h2>
              <p className="text-sm text-gray-600">Portfolio Value: $2,082.99</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600">Lite</span>
              <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </div>
            </div>
            <div className="w-6 h-6 flex items-center justify-center">
              <div className="w-1 h-1 bg-gray-400 rounded-full mb-1"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full mb-1"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Season Competition Card */}
        <div 
          className="bg-gray-50 rounded-lg p-4 mb-4 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={onSeasonCompetitionClick}
        >
          <div>
            <h3 className="font-semibold text-gray-900">Season Competition Q4-2025</h3>
            <p className="text-sm text-gray-600">Token Amount: 612.45</p>
            <p className="text-sm text-gray-600">Rank: #297/10,140</p>
          </div>
          <div className="text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* User Stats */}
        <div className="flex justify-between">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">17</p>
            <p className="text-xs text-gray-600">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">22</p>
            <p className="text-xs text-gray-600">Following</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">49</p>
            <p className="text-xs text-gray-600">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">7</p>
            <p className="text-xs text-gray-600">Groups</p>
          </div>
        </div>
      </div>

      {/* Voro Spotlights Section */}
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Voro Spotlights</h3>
          <div className="text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        
        <div className="flex space-x-3 overflow-x-auto pb-2">
          <div className="bg-black rounded-lg p-4 min-w-[120px] flex items-center justify-center">
            <span className="text-white font-medium text-sm">bonus</span>
          </div>
          <div className="bg-gray-200 rounded-lg p-4 min-w-[120px] flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-600 rounded"></div>
              <span className="text-gray-800 font-medium text-sm">Cal AI</span>
            </div>
          </div>
          <div className="bg-blue-600 rounded-lg p-4 min-w-[120px] flex items-center justify-center">
            <span className="text-white font-bold text-sm">Dodgers</span>
          </div>
          <div className="bg-green-500 rounded-lg p-4 min-w-[120px] flex items-center justify-center">
            <span className="text-white font-medium text-sm">Tesla</span>
          </div>
        </div>
      </div>

      {/* Top Categories Section */}
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Top Categories</h3>
          <button 
            onClick={() => onTradeableCategoriesClick ? onTradeableCategoriesClick() : onCategoryClick('Tradeable Categories')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            See More &gt;
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {/* Row 1 */}
          <button 
            onClick={() => onCategoryClick('Startups')}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
            </div>
            <p className="text-xs text-gray-600">Startups</p>
          </button>
          <button 
            onClick={() => onCategoryClick('Male Athletes')}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
            </div>
            <p className="text-xs text-gray-600">Male Athletes</p>
          </button>
          <button 
            onClick={() => onCategoryClick('Influencers')}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
            </div>
            <p className="text-xs text-gray-600">Influencers</p>
          </button>
          <button 
            onClick={() => onCategoryClick('Clothing Brands')}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
            </div>
            <p className="text-xs text-gray-600">Clothing Brands</p>
          </button>
          
          {/* Row 2 */}
          <button 
            onClick={() => onCategoryClick('Cities')}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
            </div>
            <p className="text-xs text-gray-600">Cities</p>
          </button>
          <button 
            onClick={() => onCategoryClick('Universities')}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
            </div>
            <p className="text-xs text-gray-600">Universities</p>
          </button>
          <button 
            onClick={() => onCategoryClick('Tech Companies')}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
            </div>
            <p className="text-xs text-gray-600">Tech Companies</p>
          </button>
          <button 
            onClick={() => onCategoryClick('Movies')}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
            </div>
            <p className="text-xs text-gray-600">Movies</p>
          </button>
        </div>
      </div>

    </div>
  );
};

export default Home;
