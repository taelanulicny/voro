import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Entity } from '../models/types';

// Simple in-memory cache for search results (TTL: 5 minutes)
interface CachedSearchResult {
  results: SearchResult[];
  timestamp: number;
}

const searchCache = new Map<string, CachedSearchResult>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Limit cache size

export interface SearchResult {
  entity: Entity;
  score: number;
  matchType: 'exact' | 'fuzzy' | 'partial';
  matchedFields: string[];
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + 1   // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
function similarityScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
}

/**
 * Check if query matches text (exact, starts with, contains, or fuzzy)
 * Gold standard algorithm: prioritize exact/prefix matches, strict fuzzy matching
 */
function matchText(query: string, text: string): { matched: boolean; score: number; matchType: 'exact' | 'fuzzy' | 'partial' } {
  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase().trim();

  // Exact match (highest priority)
  if (textLower === queryLower) {
    return { matched: true, score: 1.0, matchType: 'exact' };
  }

  // Starts with query (high priority for prefix matching)
  if (textLower.startsWith(queryLower)) {
    return { matched: true, score: 0.9, matchType: 'partial' };
  }

  // Contains query as whole word (better than substring match)
  const wordBoundaryRegex = new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  if (wordBoundaryRegex.test(textLower)) {
    return { matched: true, score: 0.8, matchType: 'partial' };
  }

  // Contains query as substring (lower priority)
  if (textLower.includes(queryLower)) {
    return { matched: true, score: 0.6, matchType: 'partial' };
  }

  // Strict fuzzy match (only for single words, higher threshold: 0.75)
  // Only use fuzzy matching if query is a single word to avoid false positives
  if (!queryLower.includes(' ') && queryLower.length >= 3) {
    const similarity = similarityScore(queryLower, textLower);
    if (similarity >= 0.75) {
      return { matched: true, score: similarity * 0.5, matchType: 'fuzzy' };
    }
  }

  // For multi-word queries, check if any word matches (strict)
  if (queryLower.includes(' ')) {
    const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 2);
    const textWords = textLower.split(/\s+/);
    
    // Count how many query words match
    let matchedWords = 0;
    for (const queryWord of queryWords) {
      for (const textWord of textWords) {
        // Exact word match
        if (textWord === queryWord || textWord.startsWith(queryWord)) {
          matchedWords++;
          break;
        }
        // Strict fuzzy match for words (threshold 0.8)
        if (queryWord.length >= 3 && similarityScore(queryWord, textWord) >= 0.8) {
          matchedWords++;
          break;
        }
      }
    }
    
    // Require at least one word to match
    if (matchedWords > 0) {
      const matchRatio = matchedWords / queryWords.length;
      return { matched: true, score: matchRatio * 0.5, matchType: 'fuzzy' };
    }
  }

  return { matched: false, score: 0, matchType: 'partial' };
}

/**
 * Search entities with fuzzy matching
 */
export async function searchEntities(params: {
  query: string;
  category?: string;
  limit?: number;
  sortBy?: 'relevance' | 'name' | 'price_high' | 'price_low' | 'change_high' | 'change_low';
}): Promise<SearchResult[]> {
  const { query, category, limit = 50, sortBy = 'relevance' } = params;

  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    // Get all entities (or filter by category if provided)
    const scanParams: any = {
      TableName: TABLE_NAMES.ENTITIES,
    };

    if (category) {
      scanParams.FilterExpression = 'category = :category';
      scanParams.ExpressionAttributeValues = {
        ':category': category,
      };
    }

    const result = await docClient.send(new ScanCommand(scanParams));
    const entities = (result.Items || []) as Entity[];

    // Search and score each entity
    // Gold standard: only match name and ticker, no description matching
    const searchResults: SearchResult[] = [];

    for (const entity of entities) {
      const matchedFields: string[] = [];
      let bestScore = 0;
      let bestMatchType: 'exact' | 'fuzzy' | 'partial' = 'partial';

      // Search in ticker (exact ticker matches are very important)
      const tickerMatch = matchText(query, entity.ticker);
      if (tickerMatch.matched) {
        matchedFields.push('ticker');
        // Ticker matches get high priority
        const tickerScore = tickerMatch.matchType === 'exact' ? 1.0 : tickerMatch.score * 0.9;
        if (tickerScore > bestScore) {
          bestScore = tickerScore;
          bestMatchType = tickerMatch.matchType;
        }
      }

      // Search in name (weighted higher, this is the primary field)
      const nameMatch = matchText(query, entity.name);
      if (nameMatch.matched) {
        matchedFields.push('name');
        // Boost score for name matches, especially exact/prefix matches
        let boostedScore = nameMatch.score;
        if (nameMatch.matchType === 'exact') {
          boostedScore = 1.0;
        } else if (nameMatch.matchType === 'partial' && nameMatch.score >= 0.8) {
          boostedScore = nameMatch.score * 1.1; // Slight boost for good partial matches
        }
        if (boostedScore > bestScore) {
          bestScore = Math.min(boostedScore, 1.0); // Cap at 1.0
          bestMatchType = nameMatch.matchType;
        }
      }

      // Only include entities that matched in name or ticker
      // Description matching removed - only search name and ticker as requested
      if (matchedFields.length > 0) {
        searchResults.push({
          entity,
          score: bestScore,
          matchType: bestMatchType,
          matchedFields,
        });
      }
    }

    // Sort results
    if (sortBy === 'relevance') {
      // Sort by match quality: exact > partial > fuzzy, then by score, then by name
      const getMatchPriority = (matchType: 'exact' | 'fuzzy' | 'partial') => {
        if (matchType === 'exact') return 3;
        if (matchType === 'partial') return 2;
        return 1; // fuzzy
      };
      
      searchResults.sort((a, b) => {
        // First, prioritize by match type
        const priorityA = getMatchPriority(a.matchType);
        const priorityB = getMatchPriority(b.matchType);
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        // Then by score
        if (Math.abs(b.score - a.score) > 0.01) {
          return b.score - a.score;
        }
        // Finally by name
        return a.entity.name.localeCompare(b.entity.name);
      });
    } else if (sortBy === 'name') {
      searchResults.sort((a, b) => a.entity.name.localeCompare(b.entity.name));
    } else {
      // For price/change sorting, we'd need current prices
      // For now, just sort by relevance
      const getMatchPriority = (matchType: 'exact' | 'fuzzy' | 'partial') => {
        if (matchType === 'exact') return 3;
        if (matchType === 'partial') return 2;
        return 1; // fuzzy
      };
      searchResults.sort((a, b) => {
        const priorityA = getMatchPriority(a.matchType);
        const priorityB = getMatchPriority(b.matchType);
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        return b.score - a.score;
      });
    }

    // Limit results
    return searchResults.slice(0, limit);
  } catch (error: any) {
    console.error('Error searching entities:', error);
    throw error;
  }
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSearchSuggestions(query: string, limit: number = 10): Promise<Entity[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const results = await searchEntities({
      query,
      limit,
      sortBy: 'relevance',
    });

    // Return only exact or high-scoring matches for suggestions
    return results
      .filter(result => result.matchType === 'exact' || result.score >= 0.8)
      .map(result => result.entity)
      .slice(0, limit);
  } catch (error: any) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

