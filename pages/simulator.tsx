import React, { useState, useEffect } from 'react';

const Simulator = () => {
  const [simulationResults, setSimulationResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [price, setPrice] = useState(100);
  const [parameters, setParameters] = useState({
    initialPrice: 100,
    volatility: 0.02,
    trendStrength: 0.1,
    timeSteps: 100,
    entities: 10
  });

  // Voro Engine Algorithm - replace with your actual equation
  const runSimulation = async () => {
    setIsRunning(true);
    const results = [];
    
    for (let entity = 0; entity < parameters.entities; entity++) {
      const entityData = {
        id: entity,
        name: `Entity ${entity + 1}`,
        ticker: `ENT${(entity + 1).toString().padStart(2, '0')}`,
        prices: [],
        volumes: [],
        sentiment: [],
        currentPrice: 0,
        change: 0,
        changePercent: 0,
        voroData: null
      };
      
      let currentPrice = parameters.initialPrice;
      
      for (let step = 0; step < parameters.timeSteps; step++) {
        try {
          // Call Voro engine API
          const response = await fetch('/api/simulate');
          const voroResult = await response.json();
          
          // Use Voro engine price calculation
          const priceChange = (parseFloat(voroResult.newPrice) - currentPrice) * parameters.volatility;
          currentPrice += priceChange;
          currentPrice = Math.max(0.01, currentPrice); // Prevent negative prices
          
          entityData.prices.push(currentPrice);
          entityData.volumes.push(Math.random() * 1000 + 100);
          entityData.sentiment.push(Math.random() * 100);
          
          // Store Voro data for the last step
          if (step === parameters.timeSteps - 1) {
            entityData.voroData = voroResult;
          }
        } catch (error) {
          console.error('Error calling Voro engine:', error);
          // Fallback to simple algorithm
          const randomFactor = (Math.random() - 0.5) * parameters.volatility;
          const trendFactor = parameters.trendStrength * Math.sin(step / 10);
          const priceChange = currentPrice * (randomFactor + trendFactor);
          
          currentPrice += priceChange;
          currentPrice = Math.max(0.01, currentPrice);
          
          entityData.prices.push(currentPrice);
          entityData.volumes.push(Math.random() * 1000 + 100);
          entityData.sentiment.push(Math.random() * 100);
        }
      }
      
      // Calculate final metrics
      entityData.currentPrice = currentPrice;
      entityData.change = currentPrice - parameters.initialPrice;
      entityData.changePercent = (entityData.change / parameters.initialPrice) * 100;
      
      results.push(entityData);
    }
    
    setSimulationResults(results);
    setIsRunning(false);
  };

  const selectEntity = (entity) => {
    setSelectedEntity(entity);
    setPrice(entity.currentPrice);
  };

  const trade = (action) => {
    // Placeholder trade function
    console.log(`${action} ${selectedEntity?.ticker} at $${price.toFixed(2)}`);
    alert(`${action.toUpperCase()} ${selectedEntity?.ticker} at $${price.toFixed(2)}`);
  };

  const updateParameter = (key, value) => {
    setParameters(prev => ({
      ...prev,
      [key]: parseFloat(value)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ minHeight: '100vh', paddingBottom: '5rem' }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Algorithm Simulator</h1>
        
        {/* Parameters Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Simulation Parameters</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Price
              </label>
              <input
                type="number"
                value={parameters.initialPrice}
                onChange={(e) => updateParameter('initialPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Volatility
              </label>
              <input
                type="number"
                step="0.001"
                value={parameters.volatility}
                onChange={(e) => updateParameter('volatility', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trend Strength
              </label>
              <input
                type="number"
                step="0.01"
                value={parameters.trendStrength}
                onChange={(e) => updateParameter('trendStrength', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Steps
              </label>
              <input
                type="number"
                value={parameters.timeSteps}
                onChange={(e) => updateParameter('timeSteps', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entities
              </label>
              <input
                type="number"
                value={parameters.entities}
                onChange={(e) => updateParameter('entities', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running Simulation...' : 'Run Simulation'}
          </button>
        </div>

        {/* Entity Selection */}
        {simulationResults.length > 0 && !selectedEntity && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Entity to Trade</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {simulationResults.map((entity) => (
                <div 
                  key={entity.id} 
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => selectEntity(entity)}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">{entity.ticker}</h3>
                  <p className="text-sm text-gray-600 mb-2">{entity.name}</p>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-medium">${entity.currentPrice.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Change:</span>
                      <span className={`font-medium ${
                        entity.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {entity.change >= 0 ? '+' : ''}{entity.change.toFixed(2)} ({entity.changePercent >= 0 ? '+' : ''}{entity.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Entity View */}
        {selectedEntity && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            {/* Entity Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedEntity.ticker}</h2>
                <p className="text-lg text-gray-600">{selectedEntity.name}</p>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Back to Selection
              </button>
            </div>

            {/* Price Info */}
            <div className="mb-6">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                ${selectedEntity.currentPrice.toFixed(2)}
              </div>
              <div className={`text-lg ${
                selectedEntity.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedEntity.change >= 0 ? '+' : ''}{selectedEntity.change.toFixed(2)} ({selectedEntity.changePercent >= 0 ? '+' : ''}{selectedEntity.changePercent.toFixed(2)}%)
              </div>
            </div>

            {/* Voro Engine Data */}
            {selectedEntity.voroData && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Voro Engine Data</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Base Price (P0):</span>
                      <div className="font-semibold">${selectedEntity.voroData.P0}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Global Liquidity:</span>
                      <div className="font-semibold">{selectedEntity.voroData.L_global.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Flow Ratio (f):</span>
                      <div className="font-semibold">{selectedEntity.voroData.f}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Effective Tokens:</span>
                      <div className="font-semibold">{selectedEntity.voroData.T_eff}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Long Tokens:</span>
                      <div className="font-semibold">{selectedEntity.voroData.T_long.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Short Tokens:</span>
                      <div className="font-semibold">{selectedEntity.voroData.T_short.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">T_eff_prime:</span>
                      <div className="font-semibold">{selectedEntity.voroData.T_eff_prime}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Voro Price:</span>
                      <div className="font-semibold text-blue-600">${selectedEntity.voroData.newPrice}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Chart</h3>
              <div className="h-64 bg-gray-100 rounded p-4">
                <svg width="100%" height="100%" viewBox="0 0 400 200">
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    points={selectedEntity.prices.map((price, index) => 
                      `${index * (400 / selectedEntity.prices.length)},${200 - ((price - Math.min(...selectedEntity.prices)) / (Math.max(...selectedEntity.prices) - Math.min(...selectedEntity.prices)) * 180)}`
                    ).join(' ')}
                  />
                </svg>
              </div>
            </div>

            {/* Feed Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Feed</h3>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                        <span className="font-medium text-gray-900">Trader{i}</span>
                      </div>
                      <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                        Follow
                      </button>
                    </div>
                    <p className="text-gray-700">
                      {selectedEntity.change >= 0 ? 'Bullish' : 'Bearish'} on {selectedEntity.ticker}. 
                      Price action looks {selectedEntity.change >= 0 ? 'strong' : 'weak'} today.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trading Buttons - Fixed at Bottom */}
        {selectedEntity && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-900">
                Price: ${price.toFixed(2)}
              </div>
              <div className="flex space-x-4">
                <button 
                  onClick={() => trade("buy")}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Buy
                </button>
                <button 
                  onClick={() => trade("sell")}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Sell
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Simulator;
