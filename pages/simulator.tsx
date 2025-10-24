import React, { useState, useEffect } from 'react';

const Simulator = () => {
  const [simulationResults, setSimulationResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [parameters, setParameters] = useState({
    initialPrice: 100,
    volatility: 0.02,
    trendStrength: 0.1,
    timeSteps: 100,
    entities: 10
  });

  // Example algorithm - replace with your actual equation
  const runSimulation = () => {
    setIsRunning(true);
    const results = [];
    
    for (let entity = 0; entity < parameters.entities; entity++) {
      const entityData = {
        id: entity,
        name: `Entity ${entity + 1}`,
        prices: [],
        volumes: [],
        sentiment: []
      };
      
      let currentPrice = parameters.initialPrice;
      
      for (let step = 0; step < parameters.timeSteps; step++) {
        // Example price movement algorithm
        const randomFactor = (Math.random() - 0.5) * parameters.volatility;
        const trendFactor = parameters.trendStrength * Math.sin(step / 10);
        const priceChange = currentPrice * (randomFactor + trendFactor);
        
        currentPrice += priceChange;
        currentPrice = Math.max(0.01, currentPrice); // Prevent negative prices
        
        entityData.prices.push(currentPrice);
        entityData.volumes.push(Math.random() * 1000 + 100);
        entityData.sentiment.push(Math.random() * 100);
      }
      
      results.push(entityData);
    }
    
    setSimulationResults(results);
    setIsRunning(false);
  };

  const updateParameter = (key, value) => {
    setParameters(prev => ({
      ...prev,
      [key]: parseFloat(value)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
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

        {/* Results Panel */}
        {simulationResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Simulation Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {simulationResults.map((entity) => (
                <div key={entity.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{entity.name}</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Final Price:</span>
                      <span className="font-medium">${entity.prices[entity.prices.length - 1].toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price Change:</span>
                      <span className={`font-medium ${
                        entity.prices[entity.prices.length - 1] > parameters.initialPrice 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {((entity.prices[entity.prices.length - 1] - parameters.initialPrice) / parameters.initialPrice * 100).toFixed(2)}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Volume:</span>
                      <span className="font-medium">
                        {entity.volumes.reduce((a, b) => a + b, 0) / entity.volumes.length.toFixed(0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Sentiment:</span>
                      <span className="font-medium">
                        {(entity.sentiment.reduce((a, b) => a + b, 0) / entity.sentiment.length).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Simple Chart Visualization */}
                  <div className="mt-4">
                    <div className="h-20 bg-gray-100 rounded p-2">
                      <svg width="100%" height="100%" viewBox="0 0 200 60">
                        <polyline
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="1"
                          points={entity.prices.map((price, index) => 
                            `${index * (200 / entity.prices.length)},${60 - ((price - Math.min(...entity.prices)) / (Math.max(...entity.prices) - Math.min(...entity.prices)) * 50)}`
                          ).join(' ')}
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Simulator;
