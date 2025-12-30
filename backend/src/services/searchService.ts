import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Entity } from '../models/types';

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
 */
function matchText(query: string, text: string): { matched: boolean; score: number; matchType: 'exact' | 'fuzzy' | 'partial' } {
  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase().trim();

  // Exact match
  if (textLower === queryLower) {
    return { matched: true, score: 1.0, matchType: 'exact' };
  }

  // Starts with query
  if (textLower.startsWith(queryLower)) {
    return { matched: true, score: 0.9, matchType: 'partial' };
  }

  // Contains query
  if (textLower.includes(queryLower)) {
    return { matched: true, score: 0.7, matchType: 'partial' };
  }

  // Fuzzy match (similarity threshold: 0.6)
  const similarity = similarityScore(queryLower, textLower);
  if (similarity >= 0.6) {
    return { matched: true, score: similarity * 0.6, matchType: 'fuzzy' };
  }

  // Word-by-word fuzzy matching (for multi-word queries)
  const queryWords = queryLower.split(/\s+/);
  const textWords = textLower.split(/\s+/);
  let bestWordMatch = 0;
  
  for (const queryWord of queryWords) {
    for (const textWord of textWords) {
      const wordSimilarity = similarityScore(queryWord, textWord);
      if (wordSimilarity >= 0.6) {
        bestWordMatch = Math.max(bestWordMatch, wordSimilarity);
      }
    }
  }

  if (bestWordMatch >= 0.6) {
    return { matched: true, score: bestWordMatch * 0.5, matchType: 'fuzzy' };
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
    const searchResults: SearchResult[] = [];

    for (const entity of entities) {
      const matchedFields: string[] = [];
      let bestScore = 0;
      let bestMatchType: 'exact' | 'fuzzy' | 'partial' = 'partial';

      // Search in ticker
      const tickerMatch = matchText(query, entity.ticker);
      if (tickerMatch.matched) {
        matchedFields.push('ticker');
        if (tickerMatch.score > bestScore) {
          bestScore = tickerMatch.score;
          bestMatchType = tickerMatch.matchType;
        }
      }

      // Search in name (weighted higher)
      const nameMatch = matchText(query, entity.name);
      if (nameMatch.matched) {
        matchedFields.push('name');
        // Boost score for name matches
        const boostedScore = nameMatch.score * 1.2;
        if (boostedScore > bestScore) {
          bestScore = Math.min(boostedScore, 1.0); // Cap at 1.0
          bestMatchType = nameMatch.matchType;
        }
      }

      // Search in description (weighted lower)
      if (entity.description) {
        const descMatch = matchText(query, entity.description);
        if (descMatch.matched) {
          matchedFields.push('description');
          // Lower weight for description matches
          const weightedScore = descMatch.score * 0.5;
          if (weightedScore > bestScore && matchedFields.length === 0) {
            bestScore = weightedScore;
            bestMatchType = descMatch.matchType;
          }
        }
      }

      // Only include entities that matched
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
      // Sort by score (highest first), then by name
      searchResults.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.entity.name.localeCompare(b.entity.name);
      });
    } else if (sortBy === 'name') {
      searchResults.sort((a, b) => a.entity.name.localeCompare(b.entity.name));
    } else {
      // For price/change sorting, we'd need current prices
      // For now, just sort by relevance
      searchResults.sort((a, b) => b.score - a.score);
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

