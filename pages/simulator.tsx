import { useState, useEffect } from "react";

export default function Simulator() {
  // Core state
  const [price, setPrice] = useState(100);
  const [isLiveSimulation, setIsLiveSimulation] = useState(false);
  const [liveTime, setLiveTime] = useState(0);
  const [liveData, setLiveData] = useState<{
    time: number;
    price: number;
    posTokens: number;
    negTokens: number;
    netConviction: number;
    deltaConviction: number;
    convictionPressure: number;
    r: number;
  }[]>([]);
  const [simulationSpeed, setSimulationSpeed] = useState(1000); // 1 second per tick
  const [prevNetConviction, setPrevNetConviction] = useState(0); // Track previous net conviction (POS - NEG)
  const [z_t, setZ_t] = useState(0); // Correlated noise term for realistic price movement
  
  // Data logging state
  const [loggedData, setLoggedData] = useState<{
    timestamp: string;
    price: number;
    posTokens: number;
    negTokens: number;
    netConviction: number;
    deltaConviction: number;
    convictionPressure: number;
    r: number;
    B_H: number;
    S_H: number;
    A: number;
    L0: number;
    USERS: number;
  }[]>([]);

  // Essential variables for momentum-based dual-token conviction system
  const [B_H, setBH] = useState(6000); // Buy pressure (posTokens)
  const [S_H, setSH] = useState(4000); // Sell pressure (negTokens)
  const [A, setA] = useState(5.0); // Amplitude (volatility multiplier) - Strong for visible linear impact
  const [L0, setL0] = useState(150000); // Base liquidity
  const [USERS, setUSERS] = useState(1000); // Active users
  
  // Mode system for automated trading scenarios
  type ModeType = "Custom" | "IPO" | "BadNews" | "GoodNews" | "NormalDay";
  const [mode, setMode] = useState<ModeType>("Custom");
  const [currentPressure, setCurrentPressure] = useState({ targetBH: B_H, targetSH: S_H, note: "" });
  const [currentBH, setCurrentBH] = useState(B_H);
  const [currentSH, setCurrentSH] = useState(S_H);

  // Debug state for equation values
  const [debugValues, setDebugValues] = useState<{
    P: number;
    posTokens: number;
    negTokens: number;
    netConviction: number;
    deltaConviction: number;
    convictionPressure: number;
    L_global: number;
    effectiveA: number;
    effectiveBH: number;
    effectiveSH: number;
    hour: number;
    step: number;
    equationSteps: string[];
    K: number;
    r: number;
  } | null>(null);

  // Get time-based pressure adjustments based on mode
  const getTimeBasedPressure = (timeStep: number) => {
    const hour = Math.floor(timeStep / 60) + 8; // Each step is 1 minute, starting from 8 AM
    
    switch (mode) {
      case "IPO":
        // Strong early buying, then volatile trading, then stabilizes
        if (hour >= 8 && hour < 10) {
          return { targetBH: 16000, targetSH: 1500, note: "Initial IPO surge" };
        } else if (hour >= 10 && hour < 12) {
          return { targetBH: 14000, targetSH: 2500, note: "Strong early buying" };
        } else if (hour >= 12 && hour < 14) {
          return { targetBH: 6500, targetSH: 8500, note: "First dip/correction" };
        } else if (hour >= 14 && hour < 16) {
          return { targetBH: 12000, targetSH: 3000, note: "Recovery bounce" };
        } else if (hour >= 16 && hour < 18) {
          return { targetBH: 5000, targetSH: 7000, note: "Profit taking" };
        } else {
          return { targetBH: 7000, targetSH: 5000, note: "Stabilizing" };
        }
      
      case "BadNews":
        // Negative pressure builds throughout day
        if (hour >= 8 && hour < 12) {
          return { targetBH: 6000, targetSH: 4000, note: "Pre-news" };
        } else if (hour >= 12 && hour < 16) {
          return { targetBH: 3600, targetSH: 6400, note: "Bad news hits" };
        } else if (hour >= 16 && hour < 20) {
          return { targetBH: 4200, targetSH: 5600, note: "Continued selling" };
        } else {
          return { targetBH: 5400, targetSH: 4800, note: "Fading" };
        }
      
      case "GoodNews":
        // Quiet morning, then news hits at 10am, peaks, minor selloff at 2pm, then rally to midnight, slight selloff before close
        if (hour >= 8 && hour < 10) {
          return { targetBH: 5500, targetSH: 4500, note: "Quiet morning" };
        } else if (hour >= 10 && hour < 11) {
          return { targetBH: 12000, targetSH: 2000, note: "Good news hits - strong buying" };
        } else if (hour >= 11 && hour < 14) {
          return { targetBH: 11000, targetSH: 3000, note: "Continuing rally" };
        } else if (hour >= 14 && hour < 15) {
          return { targetBH: 4500, targetSH: 8500, note: "Selloff at 2pm - goes negative" };
        } else if (hour >= 15 && hour < 24) {
          return { targetBH: 8500, targetSH: 3500, note: "Rally continues to midnight" };
        } else if (hour >= 0 && hour < 1) {
          return { targetBH: 7000, targetSH: 4500, note: "Slight selloff before close" };
        } else {
          return { targetBH: 6000, targetSH: 4000, note: "Market closing" };
        }
      
      case "NormalDay":
        // Gentle intraday patterns
        if (hour >= 8 && hour < 12) {
          return { targetBH: 6600, targetSH: 3600, note: "Morning lift" };
        } else if (hour >= 12 && hour < 16) {
          return { targetBH: 5700, targetSH: 4200, note: "Midday drift" };
        } else {
          return { targetBH: 6000, targetSH: 4000, note: "Evening" };
        }
      
      default:
        return { targetBH: B_H, targetSH: S_H, note: "Custom" };
    }
  };

  // Liquidity-driven price update function
  const updatePriceRealistic = (currentPrice: number, posTokens: number, negTokens: number, liquidity: number, volume: number, currentZ_t: number, medianCP: number) => {
    // Parameters
    const KAPPA = 1.0;          // base sensitivity scaling
    const ETA = 22.0;           // liquidity elasticity (↑ETA = softer moves)
    const SIGMA = 0.00012;      // base random volatility (~0.012%)
    const GAMMA = 3.5;          // volatility amplification from high volume
    const RHO = 0.92;           // AR(1) correlation of micro noise (0.9–0.95 looks realistic)
    const CP_THRESH = 1.25;     // multiple of median(|cp|) triggering bursts
    const P_BURST = 0.02;       // 2% chance of burst when cp exceeds threshold
    const BURST_MAG = 0.001;    // burst size (0.1% move)
    
    // Compute conviction pressure
    const cp = (posTokens - negTokens) / (posTokens + negTokens + 1e-9);
    
    // Normalize volume and compute basic liquidity resistance
    const L = liquidity + 1e-9;
    const V_norm = volume / Math.max(1, volume);
    
    // Liquidity elasticity: diminishing returns for large conviction
    const x = (cp * V_norm) / L;
    let rate = KAPPA * (x / (1 + ETA * Math.abs(x)));
    
    // Add correlated microstructure noise
    const sigmaEff = SIGMA * Math.sqrt(1 + GAMMA * Math.abs(V_norm));
    const randn = () => Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
    const newZ_t = RHO * currentZ_t + randn() * sigmaEff;
    
    // Update z_t state for next iteration
    setZ_t(newZ_t);
    rate += newZ_t;
    
    // Occasional burst moves when conviction is extreme
    if (Math.abs(cp) > CP_THRESH * medianCP && Math.random() < P_BURST) {
      const burstSign = Math.sign(cp);
      rate += burstSign * BURST_MAG;
    }
    
    // Update price (ensure no negative prices)
    const nextPrice = Math.max(0.01, currentPrice * (1 + rate));
    
    return { nextPrice, rate, cp, newZ_t };
  };

  // Live simulation effect
  useEffect(() => {
    if (!isLiveSimulation) return;

    const interval = setInterval(() => {
      // Get time-based pressure adjustments
      const pressure = getTimeBasedPressure(liveTime);
      setCurrentPressure(pressure); // Update current pressure for display
      
      // Gradually adjust sliders to target values (as if users are manually trading)
      let newBH, newSH;
      
      if (mode !== "Custom") {
        // Automated modes: transition to target values
        const targetBH = pressure.targetBH;
        const targetSH = pressure.targetSH;
        
        // Gradual transitions (8% per tick) to simulate very gradual market response
        newBH = currentBH + (targetBH - currentBH) * 0.08;
        newSH = currentSH + (targetSH - currentSH) * 0.08;
        
        // Add small random wandering (±1%) to simulate real trader behavior even when at target
        const wanderAmount = 0.01; // ±1% wandering
        newBH = newBH * (1 + (Math.random() - 0.5) * wanderAmount);
        newSH = newSH * (1 + (Math.random() - 0.5) * wanderAmount);
      } else {
        // Custom mode: use slider values directly with minimal wandering
        newBH = B_H * (1 + (Math.random() - 0.5) * 0.005); // ±0.5% for micro-movement
        newSH = S_H * (1 + (Math.random() - 0.5) * 0.005);
      }
      
      setCurrentBH(newBH);
      setCurrentSH(newSH);
      
      const adjustedBH = newBH;
      const adjustedSH = newSH;
      
      // Liquidity-driven realistic price update
      let B_t = adjustedBH; // Current buy volume
      let S_t = adjustedSH; // Current sell volume
      
      // Calculate volume factor V_t
      let V_t = B_t + S_t;
      
      // Calculate liquidity L_t
      let L_t = L0 + USERS;
      
      // Calculate net conviction (POS - NEG tokens)
      const netConviction = currentBH - currentSH;
      
      // Use realistic price update function
      const medianCP = 0.05; // Approximate median conviction pressure
      const priceResult = updatePriceRealistic(price, B_t, S_t, L_t, V_t, z_t, medianCP);
      const nextPrice = priceResult.nextPrice;
      const r_t = priceResult.rate;
      const cp = priceResult.cp;
      
      // Update z_t for next iteration
      setZ_t(priceResult.newZ_t);
      
      // Calculate delta conviction (change in net conviction) for display
      const deltaNetConviction = netConviction - prevNetConviction;
      
      // Store previous net conviction for next tick
      setPrevNetConviction(netConviction);
      
      // Update live data with minute-by-minute buy/sell volumes
      const newDataPoint = {
        time: liveTime,
        price: nextPrice,
        posTokens: currentBH, // Buy volume for this minute
        negTokens: currentSH, // Sell volume for this minute
        netConviction: netConviction, // POS - NEG tokens
        deltaConviction: deltaNetConviction, // Change in net conviction
        convictionPressure: cp * (V_t / L_t), // Conviction pressure from realistic formula
        r: r_t
      };

      // Log data for export
      const logEntry = {
        timestamp: new Date().toISOString(),
        price: nextPrice,
        posTokens: currentBH, // Actual buy volume for this minute
        negTokens: currentSH, // Actual sell volume for this minute
        netConviction: netConviction, // POS - NEG tokens
        deltaConviction: deltaNetConviction, // Change in net conviction
        convictionPressure: cp * (V_t / L_t), // Conviction pressure from realistic formula
        r: r_t,
        B_H,
        S_H,
        A,
        L0,
        USERS
      };

      setLiveData(prev => [...prev, newDataPoint]); // Keep all data points
      setLoggedData(prev => [...prev, logEntry]); // Log all data
      setLiveTime(prev => prev + 1);
      setPrice(nextPrice);
    }, simulationSpeed);

    return () => clearInterval(interval);
  }, [isLiveSimulation, B_H, S_H, A, L0, USERS, price, prevNetConviction, simulationSpeed, liveTime, mode, currentBH, currentSH]);

  const runStep = () => {
    console.log("Run Step clicked");
    let B_t = B_H; // Current buy volume
    let S_t = S_H; // Current sell volume
    
    // Calculate sentiment fraction f_t
    const epsilon = 1e-9;
    let f_t = (B_t - S_t) / (B_t + S_t + epsilon);
    
    // Calculate volume factor V_t
    let V_t = B_t + S_t;
    
    // Calculate liquidity L_t
    let L_t = L0 + USERS;
    
    // Calculate change in sentiment delta_f_t
    let delta_f_t = f_t - prevNetConviction;
    
    // Calculate return rate r_t
    let r_t = A * delta_f_t * (V_t / L_t);
    
    // Update price
    const prevPrice = price;
    const nextPrice = Math.max(0.01, prevPrice * (1 + r_t));
    let P = nextPrice;
    
    // Store previous sentiment fraction for next tick
    setPrevNetConviction(f_t);

    // Capture debug values with step-by-step breakdown
    const currentHour = new Date().getHours();
    
    const L_t_debug = L0 + USERS;
    const V_t_debug = B_H + S_H;
    const epsilon_debug = 1e-9;
    const f_t_debug = (B_H - S_H) / (B_H + S_H + epsilon_debug);
    const delta_f_t_debug = f_t_debug - prevNetConviction;
    
    const equationSteps = [
      `1. B_t = ${B_H}, S_t = ${S_H}`,
      `2. f_t = (B_t - S_t) / (B_t + S_t + ε) = (${B_H} - ${S_H}) / (${B_H} + ${S_H} + 1e-9) = ${f_t_debug.toFixed(6)}`,
      `3. Δf_t = f_t - f_{t-1} = ${f_t_debug.toFixed(6)} - ${prevNetConviction.toFixed(6)} = ${delta_f_t_debug.toFixed(6)}`,
      `4. V_t = B_t + S_t = ${B_H} + ${S_H} = ${V_t_debug}`,
      `5. L_t = L0 + USERS = ${L0} + ${USERS} = ${L_t_debug}`,
      `6. r_t = A × Δf_t × (V_t / L_t) = ${A} × ${delta_f_t_debug.toFixed(6)} × (${V_t_debug} / ${L_t_debug}) = ${r_t.toFixed(6)}`,
      `7. nextPrice = prevPrice × (1 + r_t) = ${prevPrice.toFixed(4)} × (1 + ${r_t.toFixed(6)}) = ${P.toFixed(4)}`
    ];

    setDebugValues({
      P,
      posTokens: B_H,
      negTokens: S_H,
      netConviction: f_t_debug,
      deltaConviction: delta_f_t_debug,
      convictionPressure: delta_f_t_debug * (V_t_debug / L_t_debug),
      L_global: L_t_debug,
      effectiveA: A,
      effectiveBH: B_H,
      effectiveSH: S_H,
      hour: currentHour,
      step: liveData.length + 1,
      equationSteps,
      K: 0,
      r: r_t
    });

    setPrice(P);
  };

  const resetSimulation = () => {
    setPrice(100);
    setLiveTime(0);
    setLiveData([]);
    setPrevNetConviction(0);
    setIsLiveSimulation(false);
    setCurrentBH(B_H);
    setCurrentSH(S_H);
  };
  
  // Reset current values when mode changes
  useEffect(() => {
    if (!isLiveSimulation) {
      setCurrentBH(B_H);
      setCurrentSH(S_H);
    }
  }, [mode, B_H, S_H, isLiveSimulation]);

  const exportData = () => {
    if (loggedData.length === 0) {
      alert("No data to export. Run a simulation first.");
      return;
    }

    const csvContent = [
      // CSV Header
      "Timestamp,Price,PosTokens,NegTokens,NetConviction,DeltaConviction,ConvictionPressure,Rate,B_H,S_H,A,L0,USERS",
      // CSV Data
      ...loggedData.map(entry => 
        `${entry.timestamp},${entry.price.toFixed(4)},${entry.posTokens},${entry.negTokens},${entry.netConviction},${entry.deltaConviction},${entry.convictionPressure.toFixed(6)},${entry.r.toFixed(6)},${entry.B_H},${entry.S_H},${entry.A},${entry.L0},${entry.USERS}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const clearLoggedData = () => {
    setLoggedData([]);
    alert("Logged data cleared.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-3xl font-bold mb-6">Momentum-Based Trading Simulator</h1>

      <div className="bg-white shadow rounded-lg p-6 w-full max-w-6xl">
        <div className="text-center mb-6">
        <p className="text-gray-700 mb-2">Live Price</p>
          <div className="text-4xl font-bold text-blue-600">${price.toFixed(2)}</div>
        </div>

        {/* Mode Selector */}
        <div className="mb-6">
          <h2 className="font-semibold mb-3 text-lg">Trading Mode</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setMode("Custom")}
              className={`px-4 py-2 rounded font-medium ${
                mode === "Custom" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Custom
            </button>
            <button
              onClick={() => setMode("IPO")}
              className={`px-4 py-2 rounded font-medium ${
                mode === "IPO" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              IPO (Strong early buying)
            </button>
            <button
              onClick={() => setMode("BadNews")}
              className={`px-4 py-2 rounded font-medium ${
                mode === "BadNews" ? "bg-red-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Bad News (Selloff scenario)
            </button>
            <button
              onClick={() => setMode("GoodNews")}
              className={`px-4 py-2 rounded font-medium ${
                mode === "GoodNews" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Good News (Rally scenario)
            </button>
            <button
              onClick={() => setMode("NormalDay")}
              className={`px-4 py-2 rounded font-medium ${
                mode === "NormalDay" ? "bg-gray-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Normal Day (Gentle patterns)
            </button>
          </div>
          {mode !== "Custom" && (
            <p className="mt-2 text-sm text-gray-600 italic">
              Mode active: Pressure will automatically adjust throughout the trading day based on time
            </p>
          )}
        </div>

        {/* Essential Variables with Sliders */}
        <div className="mb-6">
          <h2 className="font-semibold mb-3 text-lg">Essential Variables</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-2">
                B_H - Buy Pressure (posTokens)
                {mode !== "Custom" && isLiveSimulation && (
                  <span className="ml-2 text-xs font-normal text-blue-600">
                    (Target: {currentPressure.targetBH}) | Current: {currentBH.toFixed(0)}
                  </span>
                )}
            </label>
              <div className="flex items-center space-x-4">
              <input
                  type="range"
                  min="0"
                  max="20000"
                  step="50"
                value={B_H}
                onChange={(e) => setBH(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-green-600 w-16">
                  {isLiveSimulation 
                    ? currentBH.toFixed(0) 
                    : B_H}
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-2">
                S_H - Sell Pressure (negTokens)
                {mode !== "Custom" && isLiveSimulation && (
                  <span className="ml-2 text-xs font-normal text-red-600">
                    (Target: {currentPressure.targetSH}) | Current: {currentSH.toFixed(0)}
                  </span>
                )}
            </label>
              <div className="flex items-center space-x-4">
              <input
                  type="range"
                  min="0"
                  max="20000"
                  step="50"
                value={S_H}
                onChange={(e) => setSH(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-red-600 w-16">
                  {isLiveSimulation 
                    ? currentSH.toFixed(0) 
                    : S_H}
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-2">A - Amplitude (Volatility)</label>
              <div className="flex items-center space-x-4">
              <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                value={A}
                onChange={(e) => setA(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-blue-600 w-16">{A.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-2">L0 - Base Liquidity</label>
              <div className="flex items-center space-x-4">
              <input
                  type="range"
                  min="10000"
                  max="500000"
                  step="10000"
                  value={L0}
                  onChange={(e) => setL0(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-purple-600 w-16">{(L0/1000).toFixed(0)}k</span>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-2">USERS - Active Users</label>
              <div className="flex items-center space-x-4">
              <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={USERS}
                  onChange={(e) => setUSERS(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-orange-600 w-16">{USERS}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Simulator Controls */}
        <div className="mb-6">
          <h2 className="font-semibold mb-3 text-lg">Live Simulator</h2>
          {/* Buttons row */}
          <div className="flex flex-wrap gap-4 items-center mb-3">
            <button
              onClick={() => setIsLiveSimulation(!isLiveSimulation)}
              className={`px-4 py-2 rounded font-medium ${
                isLiveSimulation
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              {isLiveSimulation ? "Stop" : "Start"} Live Simulation
            </button>
            <button
              onClick={runStep}
              className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600"
            >
              Run Single Step
            </button>
            <button
              onClick={resetSimulation}
              className="px-4 py-2 bg-gray-500 text-white rounded font-medium hover:bg-gray-600"
            >
              Reset
            </button>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600"
            >
              Export Data ({loggedData.length} points)
            </button>
            <button
              onClick={clearLoggedData}
              className="px-4 py-2 bg-red-500 text-white rounded font-medium hover:bg-red-600"
            >
              Clear Logged Data
            </button>
          </div>
          {/* Speed control row */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Speed:</label>
            <input
              type="range"
              min="100"
              max="3000"
              step="100"
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-gray-600">{simulationSpeed}ms</span>
          </div>
        </div>

        {/* Live Chart */}
        <div className="mb-6">
          <h2 className="font-semibold mb-3 text-lg">Live Price Chart (8 AM - 2 AM Trading Hours)</h2>
          <div className="h-64 bg-gray-50 rounded border p-4">
            <svg width="100%" height="100%" viewBox="0 0 800 220">
              {/* Trading hours: 8 AM to 2 AM = 18 hours = 1080 one-minute intervals */}
              {Array.from({ length: 1081 }, (_, i) => {
                const x = (i / 1080) * 800;
                return (
                  <line
                    key={i}
                    x1={x}
                    y1="10"
                    x2={x}
                    y2="190"
                    stroke="transparent"
                    strokeWidth="1"
                  />
                );
              })}
              
              {/* Time labels - evenly distributed from 8 AM to 2 AM */}
              {[0, 120, 240, 360, 480, 600, 720, 840, 960, 1080].map((interval, index) => {
                const hours = ['8 AM', '10 AM', '12 PM', '2 PM', '6 PM', '10 PM', '12 AM', '1 AM', '2 AM'];
                const x = (interval / 1080) * 800;
                return (
                  <text
                    key={index}
                    x={x}
                    y="210"
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                    fontSize="12"
                  >
                    {hours[index]}
                  </text>
                );
              })}
              
              {/* Line chart with lines connecting dots */}
              {liveData.map((point, index) => {
                // Convert time to 1-minute interval position (0-1080)
                const intervalPosition = Math.min(point.time, 1080);
                const x = (intervalPosition / 1080) * 800;
                
                // Fixed price range: $85 to $115 (centered around $100)
                const minPrice = 85;
                const maxPrice = 115;
                const priceRange = maxPrice - minPrice;
                const y = 190 - ((point.price - minPrice) / priceRange) * 180;
                
                // Draw line from previous point to current point
                if (index > 0) {
                  const prevIntervalPosition = Math.min(liveData[index - 1].time, 1080);
                  const prevX = (prevIntervalPosition / 1080) * 800;
                  const prevPrice = liveData[index - 1].price;
                  const prevY = 190 - ((prevPrice - minPrice) / priceRange) * 180;
                  
                  // Determine line color based on price movement
                  const isUp = point.price > prevPrice;
                  
                  return (
                    <line
                      key={`line-${index}`}
                      x1={prevX}
                      y1={prevY}
                      x2={x}
                      y2={y}
                      stroke={isUp ? "#10b981" : "#ef4444"}
                      strokeWidth="2"
                    />
                  );
                }
                return null;
              })}
              
              {/* Fixed price scale */}
              <text x="-10" y="20" className="text-xs fill-gray-600" textAnchor="end">
                $115.00
              </text>
              <text x="-10" y="100" className="text-xs fill-gray-600" textAnchor="end">
                $100.00
              </text>
              <text x="-10" y="190" className="text-xs fill-gray-600" textAnchor="end">
                $85.00
              </text>
              
              {/* Horizontal reference line at $100 */}
              <line
                x1="0"
                y1="100"
                x2="800"
                y2="100"
                stroke="#d1d5db"
                strokeWidth="1"
                strokeDasharray="5,5"
              />
            </svg>
          </div>
        </div>

        {/* Live Data Table */}
        {liveData.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold mb-3 text-lg">Live Data</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pos Tokens</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Neg Tokens</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net Conviction</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Delta Conviction</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Conviction Pressure</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate (r)</th>
                  </tr>
                </thead>
                <tbody>
                  {liveData.slice(-10).reverse().map((point, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="px-4 py-2 text-sm text-gray-900">{point.time}</td>
                      <td className="px-4 py-2 text-sm font-medium text-blue-600">${point.price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-green-600">{point.posTokens.toFixed(0)}</td>
                      <td className="px-4 py-2 text-sm text-red-600">{point.negTokens.toFixed(0)}</td>
                      <td className="px-4 py-2 text-sm text-purple-600">{point.netConviction.toFixed(0)}</td>
                      <td className="px-4 py-2 text-sm text-indigo-600">{point.deltaConviction.toFixed(0)}</td>
                      <td className="px-4 py-2 text-sm text-orange-600">{point.convictionPressure.toFixed(6)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{point.r.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      </div>
        )}

        {/* Data Logging Status */}
        <div className="mb-6">
          <h2 className="font-semibold mb-3 text-lg">Data Logging</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Logged Data Points:</span>
              <span className="text-lg font-bold text-blue-600">{loggedData.length}</span>
            </div>
            {loggedData.length > 0 && (
              <div className="text-sm text-gray-600">
                <p>First entry: {loggedData[0].timestamp}</p>
                <p>Latest entry: {loggedData[loggedData.length - 1].timestamp}</p>
                <p>Price range: ${Math.min(...loggedData.map(d => d.price)).toFixed(2)} - ${Math.max(...loggedData.map(d => d.price)).toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Debug Panel */}
        {debugValues && (
          <div className="mb-6">
            <h2 className="font-semibold mb-3 text-lg">Debug Panel - Step-by-Step Calculation</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-700">posTokens</div>
                  <div className="text-sm font-bold text-green-600">{debugValues.posTokens.toFixed(0)}</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-700">negTokens</div>
                  <div className="text-sm font-bold text-red-600">{debugValues.negTokens.toFixed(0)}</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-700">netConviction</div>
                  <div className="text-sm font-bold text-purple-600">{debugValues.netConviction.toFixed(0)}</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-700">deltaConviction</div>
                  <div className="text-sm font-bold text-indigo-600">{debugValues.deltaConviction.toFixed(0)}</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-700">convictionPressure</div>
                  <div className="text-sm font-bold text-orange-600">{debugValues.convictionPressure.toFixed(6)}</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-700">L_global</div>
                  <div className="text-sm font-bold text-indigo-600">{debugValues.L_global.toFixed(2)}</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-700">A (Amplitude)</div>
                  <div className="text-sm font-bold text-blue-600">{debugValues.effectiveA.toFixed(4)}</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-700">r (Rate)</div>
                  <div className="text-sm font-bold text-gray-600">{debugValues.r.toFixed(6)}</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded border">
                <h3 className="font-medium text-gray-700 mb-2">Equation Steps:</h3>
                <div className="space-y-1 text-sm font-mono">
                  {debugValues.equationSteps.map((step, index) => (
                    <div key={index} className="text-gray-700">{step}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}