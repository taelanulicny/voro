import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  rank: number;
  seasonTokens: number;
  change: number;
  changePercent: number;
  avatar: string;
  isCurrentUser?: boolean;
}

interface SeasonCompetitionProps {
  onBack: () => void;
}

const SeasonCompetition: React.FC<SeasonCompetitionProps> = ({ onBack }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');

  // Generate realistic leaderboard data
  const generateLeaderboardData = (): { users: User[], currentUser: User } => {
    const totalUsers = 10140;
    const currentUserRank = 297;
    const currentUserTokens = 612.45;
    
    // Generate top 50 users
    const topUsers: User[] = [];
    
    for (let i = 1; i <= 50; i++) {
      // Higher ranks have more tokens, with some variation
      const baseTokens = 2000 - (i - 1) * 25; // Start at 2000, decrease by 25 per rank
      const variation = (Math.random() - 0.5) * 100; // ±50 token variation
      const tokens = Math.max(100, baseTokens + variation);
      
      // Generate realistic daily change
      const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%
      const change = (tokens * changePercent) / 100;
      
      topUsers.push({
        id: i,
        username: `Trader${i.toString().padStart(3, '0')}`,
        rank: i,
        seasonTokens: Math.round(tokens * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        avatar: `https://ui-avatars.com/api/?name=Trader${i}&background=random&color=fff&size=40`
      });
    }
    
    // Create current user entry
    const currentUser: User = {
      id: 999,
      username: 'You',
      rank: currentUserRank,
      seasonTokens: currentUserTokens,
      change: 12.34,
      changePercent: 2.05,
      avatar: 'https://ui-avatars.com/api/?name=You&background=3b82f6&color=fff&size=40',
      isCurrentUser: true
    };
    
    return { users: topUsers, currentUser };
  };

  // Generate past seasons data (3 quarters back)
  const generatePastSeasonsData = () => {
    const pastSeasons = [
      {
        season: 'Q1 2025',
        topThree: [
          { rank: 1, username: 'CryptoKing_2025', tokens: 3247.32 },
          { rank: 2, username: 'TradingPro_2025', tokens: 2987.45 },
          { rank: 3, username: 'TokenMaster_99', tokens: 2756.89 }
        ],
        totalParticipants: 12450,
        yourRank: 89,
        yourTokens: 2134.56,
        ended: 'Mar 31, 2025',
        participated: true
      },
      {
        season: 'Q4 2024',
        topThree: [
          { rank: 1, username: 'TradingPro_2024', tokens: 2847.32 },
          { rank: 2, username: 'CryptoQueen_X', tokens: 2654.78 },
          { rank: 3, username: 'MarketMaster_88', tokens: 2432.15 }
        ],
        totalParticipants: 8947,
        yourRank: 156,
        yourTokens: 1234.56,
        ended: 'Dec 31, 2024',
        participated: true
      },
      {
        season: 'Q3 2024',
        topThree: [
          { rank: 1, username: 'MarketMaster_X', tokens: 2654.91 },
          { rank: 2, username: 'TokenHunter_88', tokens: 2432.67 },
          { rank: 3, username: 'CryptoTrader_77', tokens: 2214.33 }
        ],
        totalParticipants: 7234,
        yourRank: null,
        yourTokens: null,
        ended: 'Sep 30, 2024',
        participated: false
      }
    ];

    return pastSeasons;
  };

  useEffect(() => {
    const { users: generatedUsers, currentUser: generatedCurrentUser } = generateLeaderboardData();
    setUsers(generatedUsers);
    setCurrentUser(generatedCurrentUser);
  }, []);

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeBgColor = (change: number) => {
    return change >= 0 ? 'bg-green-100' : 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ minHeight: '100vh', paddingBottom: '5rem' }}>
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
          <h1 className="text-lg font-bold text-gray-900">Season Competition</h1>
          <div className="w-8"></div>
        </div>
      </div>

      {/* Season Info */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Q4 2025 Season</h2>
          <p className="text-sm text-gray-600 mb-3">Compete to acquire the most season tokens</p>
          <div className="flex justify-center space-x-6 text-sm">
            <div>
              <span className="text-gray-500">Total Participants:</span>
              <span className="font-semibold text-gray-900 ml-1">10,140</span>
            </div>
            <div>
              <span className="text-gray-500">Your Rank:</span>
              <span className="font-semibold text-gray-900 ml-1">297th</span>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex mt-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'current'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Current Season
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'past'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Past Seasons
          </button>
        </div>
      </div>

      {/* Current Season Content */}
      {activeTab === 'current' && (
        <>
          {/* Current User Card */}
          {currentUser && (
            <div className="px-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.username}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{currentUser.username}</div>
                      <div className="text-sm text-gray-600">Rank #{currentUser.rank}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {currentUser.seasonTokens.toFixed(2)}
                    </div>
                    <div className={`text-sm ${getChangeColor(currentUser.change)}`}>
                      {currentUser.change >= 0 ? '+' : ''}{currentUser.change.toFixed(2)} ({currentUser.changePercent >= 0 ? '+' : ''}{currentUser.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="px-4 py-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 50 Leaders</h3>
            
            <div className="space-y-2">
              {users.map((user) => (
                <div 
                  key={user.id}
                  className={`bg-white rounded-lg p-4 border ${
                    user.rank <= 3 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        user.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                        user.rank === 2 ? 'bg-gray-300 text-gray-700' :
                        user.rank === 3 ? 'bg-orange-400 text-orange-900' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {user.rank}
                      </div>
                      <img 
                        src={user.avatar} 
                        alt={user.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">Rank #{user.rank}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {user.seasonTokens.toFixed(2)}
                      </div>
                      <div className={`text-sm ${getChangeColor(user.change)}`}>
                        {user.change >= 0 ? '+' : ''}{user.change.toFixed(2)} ({user.changePercent >= 0 ? '+' : ''}{user.changePercent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Past Seasons Content */}
      {activeTab === 'past' && (
        <div className="px-4 py-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Past Season Results</h3>
          
          <div className="space-y-4">
            {generatePastSeasonsData().map((season, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{season.season}</h4>
                    <p className="text-sm text-gray-500">Ended {season.ended}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Participants</div>
                    <div className="font-semibold text-gray-900">{season.totalParticipants.toLocaleString()}</div>
                  </div>
                </div>
                
                {/* Top 3 Winners */}
                <div className="space-y-2 mb-3">
                  {season.topThree.map((winner, winnerIndex) => (
                    <div 
                      key={winnerIndex}
                      className={`rounded-lg p-3 ${
                        winner.rank === 1 ? 'bg-yellow-50 border border-yellow-200' :
                        winner.rank === 2 ? 'bg-gray-50 border border-gray-200' :
                        'bg-orange-50 border border-orange-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            winner.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                            winner.rank === 2 ? 'bg-gray-300 text-gray-700' :
                            'bg-orange-400 text-orange-900'
                          }`}>
                            {winner.rank}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{winner.username}</div>
                            <div className="text-sm text-gray-600">
                              {winner.rank === 1 ? 'Winner' : winner.rank === 2 ? '2nd Place' : '3rd Place'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {winner.tokens.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">tokens</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Your Performance */}
                {season.participated ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                          {season.yourRank}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">You</div>
                          <div className="text-sm text-gray-600">Your rank</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {season.yourTokens.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">tokens</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-gray-500 text-sm">You didn't participate</div>
                        <div className="text-xs text-gray-400 mt-1">Season was optional</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Info */}
      <div className="px-4 py-4">
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600">
            Season ends in <span className="font-semibold text-gray-900">23 days</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            All participants started with 500 season tokens
          </p>
        </div>
      </div>
    </div>
  );
};

export default SeasonCompetition;
