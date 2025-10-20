import React, { useState } from 'react';
// Force rebuild
import Home from './Home';
import BottomNavBar from './BottomNavBar';
import Trade from './Trade';
import CategoryPage from './CategoryPage';
import EntityPage from './EntityPage';
import SeasonCompetition from './SeasonCompetition';

const App: React.FC = () => {
  const [activeItem, setActiveItem] = useState<'home' | 'watchlist' | 'feeds' | 'news' | 'tradeable-categories' | 'category' | 'entity' | 'season-competition'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedEntity, setSelectedEntity] = useState<string | undefined>(undefined);

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
        setActiveItem('tradeable-categories');
        setSelectedCategory(undefined);
        break;
      default:
        break;
    }
  };

  const handleCategoryClick = (category: string) => {
    setActiveItem('category');
    setSelectedCategory(category);
    setSelectedEntity(undefined);
  };

  const handleEntityClick = (entityId: string, categoryName: string) => {
    setActiveItem('entity');
    setSelectedEntity(entityId);
    setSelectedCategory(categoryName);
  };

  const handleBackToHome = () => {
    setActiveItem('home');
    setSelectedCategory(undefined);
    setSelectedEntity(undefined);
  };

  const handleBackToTradeableCategories = () => {
    setActiveItem('tradeable-categories');
    setSelectedCategory(undefined);
    setSelectedEntity(undefined);
  };

  const handleBackToCategory = () => {
    setActiveItem('category');
    setSelectedEntity(undefined);
  };

  const handleSeasonCompetitionClick = () => {
    setActiveItem('season-competition');
  };

  const handleTradeableCategoriesClick = () => {
    setActiveItem('tradeable-categories');
    setSelectedCategory(undefined);
  };

  const renderCurrentPage = () => {
    switch (activeItem) {
      case 'home':
        return <Home onCategoryClick={handleCategoryClick} onTradeableCategoriesClick={handleTradeableCategoriesClick} onSeasonCompetitionClick={handleSeasonCompetitionClick} />;
      case 'watchlist':
        return (
          <div className="bg-gray-50 p-6" style={{ minHeight: '100vh', paddingBottom: '8rem' }}>
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
          <div className="bg-gray-50 p-6" style={{ minHeight: '100vh', paddingBottom: '8rem' }}>
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
          <div className="bg-gray-50 p-6" style={{ minHeight: '100vh', paddingBottom: '8rem' }}>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">News</h1>
              <div className="bg-white rounded-lg shadow-md p-8">
                <p className="text-gray-600">News content will go here.</p>
              </div>
            </div>
          </div>
        );
      case 'tradeable-categories':
        return <Trade selectedCategory={selectedCategory} onBack={handleBackToHome} onCategorySelect={handleCategoryClick} />;
      case 'category':
        return selectedCategory ? <CategoryPage categoryName={selectedCategory} onBack={handleBackToTradeableCategories} onEntityClick={handleEntityClick} /> : <Home onCategoryClick={handleCategoryClick} />;
      case 'entity':
        return selectedEntity && selectedCategory ? <EntityPage entityId={selectedEntity} categoryName={selectedCategory} onBack={handleBackToCategory} /> : <Home onCategoryClick={handleCategoryClick} />;
      case 'season-competition':
        return <SeasonCompetition onBack={handleBackToHome} />;
      default:
        return <Home onCategoryClick={handleCategoryClick} onTradeableCategoriesClick={handleTradeableCategoriesClick} onSeasonCompetitionClick={handleSeasonCompetitionClick} />;
    }
  };

  // Show search bar only on main pages, not on trading pages
  const showSearchBar = ['home', 'watchlist', 'feeds', 'news'].includes(activeItem);

  return (
    <div className="relative">
      {renderCurrentPage()}
      
      {/* Fixed Search Bar - Above Navigation (only on main pages) */}
      {showSearchBar && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4">
          <div className="bg-white rounded-lg border border-gray-200 flex items-center px-4 py-3 shadow-lg">
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
      )}
      
      <BottomNavBar activeItem={activeItem} onItemClick={handleNavClick} />
    </div>
  );
};

export default App;
