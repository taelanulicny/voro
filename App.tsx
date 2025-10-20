import React, { useState } from 'react';
import Home from './Home';
import BottomNavBar from './BottomNavBar';
import Trade from './Trade';
import CategoryPage from './CategoryPage';

const App: React.FC = () => {
  const [activeItem, setActiveItem] = useState<'home' | 'watchlist' | 'feeds' | 'news' | 'trade' | 'category'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const handleNavClick = (item: string) => {
    switch (item) {
      case 'home':
        setActiveItem('home');
        setSelectedCategory(undefined);
        break;
      case 'watchlist':
        setActiveItem('watchlist');
        setSelectedCategory(undefined);
        break;
      case 'feeds':
        setActiveItem('feeds');
        setSelectedCategory(undefined);
        break;
      case 'news':
        setActiveItem('news');
        setSelectedCategory(undefined);
        break;
      case 'center':
        setActiveItem('trade');
        setSelectedCategory(undefined);
        break;
      default:
        break;
    }
  };

  const handleCategoryClick = (category: string) => {
    setActiveItem('category');
    setSelectedCategory(category);
  };

  const handleBackToHome = () => {
    setActiveItem('home');
    setSelectedCategory(undefined);
  };

  const handleBackToTrade = () => {
    setActiveItem('trade');
    setSelectedCategory(undefined);
  };

  const renderCurrentPage = () => {
    switch (activeItem) {
      case 'home':
        return <Home onCategoryClick={handleCategoryClick} />;
      case 'watchlist':
        return (
          <div className="min-h-screen bg-gray-50 p-6 pb-20">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Watchlist</h1>
              <div className="bg-white rounded-lg shadow-md p-8">
                <p className="text-gray-600">Your watchlist content will go here.</p>
              </div>
            </div>
          </div>
        );
      case 'feeds':
        return (
          <div className="min-h-screen bg-gray-50 p-6 pb-20">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Feeds</h1>
              <div className="bg-white rounded-lg shadow-md p-8">
                <p className="text-gray-600">Your feeds content will go here.</p>
              </div>
            </div>
          </div>
        );
      case 'news':
        return (
          <div className="min-h-screen bg-gray-50 p-6 pb-20">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">News</h1>
              <div className="bg-white rounded-lg shadow-md p-8">
                <p className="text-gray-600">News content will go here.</p>
              </div>
            </div>
          </div>
        );
      case 'trade':
        return <Trade selectedCategory={selectedCategory} onBack={handleBackToHome} onCategorySelect={handleCategoryClick} />;
      case 'category':
        return selectedCategory ? <CategoryPage categoryName={selectedCategory} onBack={handleBackToTrade} /> : <Home onCategoryClick={handleCategoryClick} />;
      default:
        return <Home onCategoryClick={handleCategoryClick} />;
    }
  };

  return (
    <div className="relative">
      {renderCurrentPage()}
      <BottomNavBar activeItem={activeItem} onItemClick={handleNavClick} />
    </div>
  );
};

export default App;
