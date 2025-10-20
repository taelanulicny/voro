import React from 'react';

interface HomeProps {
  onCategoryClick: (category: string) => void;
  onTradeableCategoriesClick?: () => void;
}

const Home: React.FC<HomeProps> = ({ onCategoryClick, onTradeableCategoriesClick }) => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
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
        <div className="bg-gray-50 rounded-lg p-4 mb-4 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-900">Season Competition Q3-2026</h3>
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

      {/* Search Bar */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-lg border border-gray-200 flex items-center px-4 py-3">
          <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Symbol/Name/Feature/Knowledge" 
            className="flex-1 text-sm text-gray-600 placeholder-gray-400 outline-none"
          />
          <div className="flex items-center space-x-3 ml-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
            </svg>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
