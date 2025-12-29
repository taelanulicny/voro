import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { ScanCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { User } from '../models/types';
import { getUserPortfolio } from './tradingService';

const INITIAL_CASH_BALANCE = 10000;

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  portfolioValue: number;
  profit: number; // todayChange
  profitPercent: number; // todayChangePercent
  tradesCount?: number; // Optional for now
}

export async function getLeaderboard(
  timeframe: 'daily' | 'weekly' | 'monthly' | 'alltime' = 'alltime',
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  // Get all users
  const usersResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.USERS,
    })
  );

  const users = (usersResult.Items || []) as User[];

  // Calculate portfolio values for all users
  const entries: LeaderboardEntry[] = [];

  for (const user of users) {
    try {
      const portfolio = await getUserPortfolio(user.userId);

      entries.push({
        rank: 0, // Will be assigned after sorting
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        portfolioValue: portfolio.totalValue,
        profit: portfolio.todayChange,
        profitPercent: portfolio.todayChangePercent,
        tradesCount: 0, // TODO: Calculate from transactions table
      });
    } catch (error) {
      // Skip users with errors in portfolio calculation
      console.error(`Error calculating portfolio for user ${user.userId}:`, error);
    }
  }

  // Sort by portfolio value (descending)
  entries.sort((a, b) => b.portfolioValue - a.portfolioValue);

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  // Apply timeframe filter (for now, we only support alltime)
  // TODO: Implement daily/weekly/monthly filters by storing historical portfolio snapshots
  let filteredEntries = entries;

  // Limit results
  return filteredEntries.slice(0, limit);
}

export async function getUserRank(userId: string): Promise<number | null> {
  const leaderboard = await getLeaderboard('alltime', 1000);
  const userEntry = leaderboard.find(entry => entry.userId === userId);
  return userEntry ? userEntry.rank : null;
}

