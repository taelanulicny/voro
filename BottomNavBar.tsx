import React from 'react';

interface BottomNavBarProps {
  activeItem?: 'home' | 'watchlist' | 'feeds' | 'news';
  onItemClick?: (item: string) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ 
  activeItem = 'home', 
  onItemClick 
}) => {
  const handleItemClick = (item: string) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Home */}
        <button
          onClick={() => handleItemClick('home')}
          className="flex flex-col items-center space-y-1"
        >
          <span className="text-gray-700 text-sm font-medium">Home</span>
          {activeItem === 'home' && (
            <div className="w-8 h-0.5 bg-gray-700"></div>
          )}
        </button>

        {/* Watchlist */}
        <button
          onClick={() => handleItemClick('watchlist')}
          className="flex flex-col items-center space-y-1"
        >
          <span className="text-gray-700 text-sm font-medium">Watchlist</span>
          {activeItem === 'watchlist' && (
            <div className="w-8 h-0.5 bg-gray-700"></div>
          )}
        </button>

        {/* Center V Icon */}
        <button
          onClick={() => handleItemClick('center')}
          className="flex flex-col items-center space-y-1"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-600 rounded-lg flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
            <span className="text-white text-2xl font-bold">V</span>
          </div>
        </button>

        {/* Feeds */}
        <button
          onClick={() => handleItemClick('feeds')}
          className="flex flex-col items-center space-y-1"
        >
          <span className="text-gray-700 text-sm font-medium">Feeds</span>
          {activeItem === 'feeds' && (
            <div className="w-8 h-0.5 bg-gray-700"></div>
          )}
        </button>

        {/* News */}
        <button
          onClick={() => handleItemClick('news')}
          className="flex flex-col items-center space-y-1"
        >
          <span className="text-gray-700 text-sm font-medium">News</span>
          {activeItem === 'news' && (
            <div className="w-8 h-0.5 bg-gray-700"></div>
          )}
        </button>
      </div>
    </div>
  );
};

export default BottomNavBar;
