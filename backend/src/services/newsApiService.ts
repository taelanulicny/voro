/**
 * NewsAPI Integration Service
 * 
 * Fetches news from NewsAPI.org and transforms them for our app
 * Includes entity matching, sentiment analysis, and smart categorization
 * 
 * Get your API key at: https://newsapi.org/register
 */

import { NewsArticle } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';

// ============================================
// ENTITY MATCHING - Link articles to tickers
// ============================================

interface EntityMatch {
  entityId: number;
  ticker: string;
  name: string;
  keywords: string[];
  category: 'Tech' | 'Politics' | 'People' | 'Events' | 'General';
}

// Map of entities to their keywords for matching
// This matches the entities from MOCK_ENTITIES in the frontend
const ENTITY_MAPPINGS: EntityMatch[] = [
  // Politics
  { entityId: 10, ticker: 'TRUMP', name: 'Donald Trump', keywords: ['donald trump', 'trump', 'president trump', 'trump administration', 'maga', 'make america great again'], category: 'Politics' },
  { entityId: 31, ticker: 'JBIDN', name: 'Joe Biden', keywords: ['joe biden', 'biden', 'president biden', 'biden administration'], category: 'Politics' },
  { entityId: 32, ticker: 'KHARR', name: 'Kamala Harris', keywords: ['kamala harris', 'vice president harris', 'harris'], category: 'Politics' },
  { entityId: 33, ticker: 'RDESA', name: 'Ron DeSantis', keywords: ['ron desantis', 'desantis', 'florida governor', 'governor desantis'], category: 'Politics' },
  { entityId: 34, ticker: 'AOC', name: 'Alexandria Ocasio-Cortez', keywords: ['alexandria ocasio-cortez', 'aoc', 'ocasio-cortez', 'rep aoc'], category: 'Politics' },
  { entityId: 35, ticker: 'VRAMA', name: 'Vivek Ramaswamy', keywords: ['vivek ramaswamy', 'ramaswamy', 'vivek'], category: 'Politics' },
  { entityId: 36, ticker: 'NHALE', name: 'Nikki Haley', keywords: ['nikki haley', 'haley', 'ambassador haley'], category: 'Politics' },
  { entityId: 37, ticker: 'GNEWS', name: 'Gavin Newsom', keywords: ['gavin newsom', 'newsom', 'california governor', 'governor newsom'], category: 'Politics' },
  { entityId: 38, ticker: 'TCARS', name: 'Tucker Carlson', keywords: ['tucker carlson', 'carlson', 'tucker'], category: 'Politics' },
  { entityId: 39, ticker: 'BSAND', name: 'Bernie Sanders', keywords: ['bernie sanders', 'sanders', 'senator sanders'], category: 'Politics' },
  
  // Influencers
  { entityId: 11, ticker: 'ALIX', name: 'Alix Earle', keywords: ['alix earle', 'alixearle'], category: 'People' },
  { entityId: 12, ticker: 'MRBST', name: 'MrBeast', keywords: ['mrbeast', 'jimmy donaldson', 'mr beast', 'beast philanthropy', 'feastables'], category: 'People' },
  { entityId: 14, ticker: 'KACEN', name: 'Kai Cenat', keywords: ['kai cenat', 'kaicenat'], category: 'People' },
  { entityId: 20, ticker: 'CDAME', name: 'Charli D\'Amelio', keywords: ['charli d\'amelio', 'charli damelio', 'charlidamelio'], category: 'People' },
  { entityId: 15, ticker: 'LPAUL', name: 'Logan Paul', keywords: ['logan paul', 'loganpaul', 'prime hydration'], category: 'People' },
  { entityId: 19, ticker: 'JPAUL', name: 'Jake Paul', keywords: ['jake paul', 'jakepaul'], category: 'People' },
  { entityId: 18, ticker: 'ACOOP', name: 'Alex Cooper', keywords: ['alex cooper', 'call her daddy', 'chd'], category: 'People' },
  { entityId: 16, ticker: 'ECHAM', name: 'Emma Chamberlain', keywords: ['emma chamberlain', 'emmachamberlain'], category: 'People' },
  { entityId: 17, ticker: 'AROSS', name: 'Adin Ross', keywords: ['adin ross', 'adinross'], category: 'People' },
  { entityId: 13, ticker: 'ATATE', name: 'Andrew Tate', keywords: ['andrew tate', 'tate', 'cobra tate'], category: 'People' },
  
  // Music Artists
  { entityId: 21, ticker: 'TSWFT', name: 'Taylor Swift', keywords: ['taylor swift', 'taylorswift', 'swift', 'eras tour', 'swiftie', 'taylor swift album'], category: 'People' },
  { entityId: 22, ticker: 'DRAKE', name: 'Drake', keywords: ['drake', 'drake rapper', 'aubrey graham', 'ovo', 'ovo sound'], category: 'People' },
  { entityId: 23, ticker: 'KANYE', name: 'Kanye West', keywords: ['kanye west', 'kanye', 'ye', 'yeezy'], category: 'People' },
  { entityId: 24, ticker: 'BUNNY', name: 'Bad Bunny', keywords: ['bad bunny', 'badbunny', 'benito'], category: 'People' },
  { entityId: 25, ticker: 'TSOTT', name: 'Travis Scott', keywords: ['travis scott', 'travisscott', 'cactus jack', 'utopia'], category: 'People' },
  { entityId: 26, ticker: 'RODRI', name: 'Olivia Rodrigo', keywords: ['olivia rodrigo', 'oliviarodrigo', 'sour', 'guts'], category: 'People' },
  { entityId: 27, ticker: 'CARTI', name: 'Playboi Carti', keywords: ['playboi carti', 'playboicarti', 'carti'], category: 'People' },
  { entityId: 28, ticker: 'ISPCE', name: 'Ice Spice', keywords: ['ice spice', 'icespice'], category: 'People' },
  { entityId: 29, ticker: 'WKEND', name: 'The Weeknd', keywords: ['the weeknd', 'weeknd', 'abel tesfaye'], category: 'People' },
  { entityId: 30, ticker: 'DOJAC', name: 'Doja Cat', keywords: ['doja cat', 'dojacat', 'doja'], category: 'People' },
  
  // Tech Startups
  { entityId: 40, ticker: 'CLUEL', name: 'Cluely', keywords: ['cluely', 'cluely ai'], category: 'Tech' },
  { entityId: 41, ticker: 'PERPL', name: 'Perplexity', keywords: ['perplexity', 'perplexity ai', 'perplexity search'], category: 'Tech' },
  { entityId: 42, ticker: 'ABRID', name: 'Abridge', keywords: ['abridge', 'abridge ai', 'medical transcription'], category: 'Tech' },
  { entityId: 43, ticker: 'REPLI', name: 'Replit', keywords: ['replit', 'replit ai', 'replit coding'], category: 'Tech' },
  { entityId: 44, ticker: 'MERCU', name: 'Mercury', keywords: ['mercury', 'mercury banking', 'mercury bank'], category: 'Tech' },
  { entityId: 45, ticker: 'CHRAC', name: 'Character.AI', keywords: ['character.ai', 'character ai', 'characterai'], category: 'Tech' },
  { entityId: 46, ticker: 'LUMAI', name: 'Luma AI', keywords: ['luma ai', 'lumaai', 'luma dream machine'], category: 'Tech' },
  { entityId: 47, ticker: 'CURSO', name: 'Cursor', keywords: ['cursor', 'cursor ai', 'cursor ide', 'cursor editor'], category: 'Tech' },
  { entityId: 48, ticker: 'VAPI', name: 'Vapi', keywords: ['vapi', 'vapi ai', 'vapi voice'], category: 'Tech' },
  { entityId: 49, ticker: 'ANYSP', name: 'Anysphere', keywords: ['anysphere', 'anysphere ai'], category: 'Tech' },
];

/**
 * Match article to entities based on content
 */
function matchToEntities(title: string, description: string): EntityMatch | null {
  const text = `${title} ${description}`.toLowerCase();
  
  for (const entity of ENTITY_MAPPINGS) {
    for (const keyword of entity.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return entity;
      }
    }
  }
  
  return null;
}

// ============================================
// SENTIMENT ANALYSIS - Improved keyword-based
// ============================================

// Weighted sentiment words with scores - comprehensive financial/news lexicon
const SENTIMENT_LEXICON = {
  // Strong positive (3 points each)
  strongPositive: [
    'breakthrough', 'soaring', 'skyrocket', 'surge', 'boom', 'record-breaking', 'record high', 
    'historic win', 'massive success', 'outstanding', 'revolutionary', 'game-changing',
    'all-time high', 'doubles', 'triples', 'crushes expectations', 'blowout', 'dominates',
    'blockbuster', 'smashing', 'tremendous', 'phenomenal'
  ],
  
  // Moderate positive (1.5 points each)
  positive: [
    'growth', 'profit', 'gain', 'rise', 'success', 'win', 'strong', 'bullish', 'optimistic',
    'upgrade', 'beat', 'exceed', 'positive', 'improve', 'advance', 'boost', 'rally', 'recover',
    'expand', 'launch', 'innovation', 'partnership', 'deal', 'agreement', 'approve', 'green light',
    'outperform', 'upside', 'momentum', 'growth', 'accelerate', 'confident', 'opportunity',
    'milestone', 'achievement', 'awarded', 'secures', 'wins contract', 'record revenue',
    'beats estimates', 'expands', 'increases', 'jumps', 'climbs', 'advances'
  ],
  
  // Strong negative (-3 points each)
  strongNegative: [
    'crash', 'plunge', 'collapse', 'crisis', 'disaster', 'scandal', 'fraud', 'bankrupt',
    'devastating', 'catastrophe', 'fatal', 'death', 'indictment', 'arrested', 'convicted',
    'massive layoffs', 'shuts down', 'delisted', 'defaults', 'implodes', 'plummets',
    'worst ever', 'record low', 'tanks', 'hemorrhaging'
  ],
  
  // Moderate negative (-1.5 points each)
  negative: [
    'loss', 'decline', 'drop', 'fall', 'fail', 'weak', 'bearish', 'concern', 'worry', 'risk',
    'threat', 'lawsuit', 'investigation', 'probe', 'fine', 'penalty', 'miss', 'below', 'cut',
    'layoff', 'downgrade', 'sell', 'warning', 'delay', 'cancel', 'reject', 'disappoints',
    'underperform', 'slump', 'struggles', 'faces challenges', 'uncertainty', 'volatile',
    'selloff', 'downturn', 'recession', 'inflation', 'headwinds', 'misses estimates',
    'cuts guidance', 'lowers forecast', 'layoffs', 'restructuring', 'loses', 'sued'
  ],
  
  // Neutral modifiers (reduce absolute score by 30%)
  neutral: [
    'could', 'might', 'may', 'possibly', 'potentially', 'rumor', 'speculation', 
    'expected', 'forecast', 'predict', 'sources say', 'reportedly', 'allegedly',
    'considers', 'explores', 'mulls', 'weighs', 'uncertain'
  ],
};

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // -100 to 100
  confidence: number; // 0 to 1
  label: string; // 'Bullish', 'Bearish', 'Neutral'
}

function analyzeSentiment(title: string, description: string): SentimentResult {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;
  let matches = 0;
  let hasNeutralModifier = false;
  
  // Check for strong positive (3 points each)
  for (const phrase of SENTIMENT_LEXICON.strongPositive) {
    if (text.includes(phrase.toLowerCase())) {
      score += 3;
      matches++;
    }
  }
  
  // Check for positive (1.5 points each)
  for (const word of SENTIMENT_LEXICON.positive) {
    // Use word boundary matching for single words, includes for phrases
    if (word.includes(' ')) {
      if (text.includes(word.toLowerCase())) {
        score += 1.5;
        matches++;
      }
    } else {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const wordMatches = text.match(regex);
      if (wordMatches) {
        score += 1.5 * wordMatches.length;
        matches += wordMatches.length;
      }
    }
  }
  
  // Check for strong negative (-3 points each)
  for (const phrase of SENTIMENT_LEXICON.strongNegative) {
    if (text.includes(phrase.toLowerCase())) {
      score -= 3;
      matches++;
    }
  }
  
  // Check for negative (-1.5 points each)
  for (const word of SENTIMENT_LEXICON.negative) {
    if (word.includes(' ')) {
      if (text.includes(word.toLowerCase())) {
        score -= 1.5;
        matches++;
      }
    } else {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const wordMatches = text.match(regex);
      if (wordMatches) {
        score -= 1.5 * wordMatches.length;
        matches += wordMatches.length;
      }
    }
  }
  
  // Check for neutral modifiers (reduce confidence by 30%)
  for (const word of SENTIMENT_LEXICON.neutral) {
    if (text.includes(word.toLowerCase())) {
      hasNeutralModifier = true;
      break;
    }
  }
  
  // Apply neutral modifier
  if (hasNeutralModifier) {
    score = score * 0.7;
  }
  
  // Normalize score to -100 to 100 (scale factor adjusted for new weights)
  const normalizedScore = Math.round(Math.min(100, Math.max(-100, score * 12)));
  
  // Calculate confidence based on number of matches
  const confidence = Math.min(1, matches / 4);
  
  // Determine sentiment and label with adjusted thresholds
  let sentiment: 'positive' | 'negative' | 'neutral';
  let label: string;
  
  if (normalizedScore >= 15) {
    sentiment = 'positive';
    label = normalizedScore >= 45 ? 'Very Bullish' : 'Bullish';
  } else if (normalizedScore <= -15) {
    sentiment = 'negative';
    label = normalizedScore <= -45 ? 'Very Bearish' : 'Bearish';
  } else {
    sentiment = 'neutral';
    label = 'Neutral';
  }
  
  return { sentiment, score: normalizedScore, confidence, label };
}

// ============================================
// BREAKING NEWS DETECTION
// ============================================

function isBreakingNews(article: any, publishedAt: Date): boolean {
  const title = (article.title || '').toLowerCase();
  const description = (article.description || '').toLowerCase();
  const text = `${title} ${description}`;
  
  // Comprehensive breaking news keywords
  const breakingKeywords = [
    'breaking',
    'breaking news',
    'just in',
    'just now',
    'urgent',
    'developing',
    'developing story',
    'alert',
    'live:',
    'live update',
    'update:',
    'latest:',
    'exclusive',
    'first:',
    'reports:',
    'sources say',
    'confirmed:',
    'announces',
    'announcement',
    'unveils',
    'reveals',
    'launches',
    'releases',
    'drops',
    'explodes',
    'surges',
    'plunges',
    'crashes',
    'scandal',
    'controversy',
    'lawsuit',
    'indictment',
    'arrest',
    'resigns',
    'steps down',
    'quits',
    'fired',
    'terminated',
    'acquired',
    'merger',
    'ipo',
    'goes public',
    'bankruptcy',
    'shuts down',
    'closes',
    'emergency',
    'crisis',
    'outbreak',
    'recall',
    'recalls',
  ];
  
  const hasBreakingKeyword = breakingKeywords.some(keyword => text.includes(keyword));
  
  // Check if very recent (within last 3 hours)
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const isVeryRecent = publishedAt > threeHoursAgo;
  
  // Major news sources that often have breaking news
  const majorSources = [
    'reuters',
    'bloomberg',
    'associated press',
    'ap news',
    'bbc',
    'cnn',
    'cnbc',
    'wall street journal',
    'wsj',
    'new york times',
    'nytimes',
    'washington post',
    'the verge',
    'techcrunch',
    'axios',
    'business insider',
    'forbes',
    'the guardian',
    'usa today',
    'nbc news',
    'abc news',
    'cbs news',
    'fox news',
  ];
  
  const sourceName = (article.source?.name || '').toLowerCase();
  const isMajorSource = majorSources.some(s => sourceName.includes(s));
  
  // Mark as breaking if:
  // 1. Has breaking keywords, OR
  // 2. Is very recent (within 3 hours) from a major source, OR
  // 3. Is extremely recent (within 1 hour) from any source
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const isExtremelyRecent = publishedAt > oneHourAgo;
  
  return hasBreakingKeyword || (isVeryRecent && isMajorSource) || isExtremelyRecent;
}

// ============================================
// CATEGORY DETECTION
// ============================================

function categorizeArticle(article: any, entityMatch: EntityMatch | null): 'Tech' | 'Politics' | 'Events' | 'People' | 'General' {
  // If we matched an entity, use its category
  if (entityMatch) {
    return entityMatch.category;
  }
  
  const text = `${article.title} ${article.description}`.toLowerCase();
  
  if (text.includes('politic') || text.includes('election') || text.includes('congress') || text.includes('senate') || text.includes('president') || text.includes('vote')) {
    return 'Politics';
  }
  if (text.includes('technology') || text.includes('ai ') || text.includes('artificial intelligence') || text.includes('software') || text.includes('startup') || text.includes('tech')) {
    return 'Tech';
  }
  if (text.includes('celebrity') || text.includes('influencer') || text.includes('star') || text.includes('famous')) {
    return 'People';
  }
  if (text.includes('event') || text.includes('conference') || text.includes('launch') || text.includes('announce')) {
    return 'Events';
  }
  
  return 'General';
}

// ============================================
// IMPACT LEVEL
// ============================================

function determineImpactLevel(article: any, sentimentScore: number): 'low' | 'medium' | 'high' | 'critical' {
  const majorSources = ['reuters', 'bloomberg', 'wsj', 'wall street journal', 'nytimes', 'new york times', 'bbc', 'cnn', 'techcrunch', 'the verge', 'cnbc'];
  const sourceName = (article.source?.name || '').toLowerCase();
  const isMajorSource = majorSources.some(s => sourceName.includes(s));
  
  const absoluteScore = Math.abs(sentimentScore);
  
  if (absoluteScore >= 70 && isMajorSource) {
    return 'critical';
  }
  if (absoluteScore >= 50 || isMajorSource) {
    return 'high';
  }
  if (absoluteScore >= 25) {
    return 'medium';
  }
  return 'low';
}

// ============================================
// DATE HELPERS
// ============================================

function getDateRange(daysBack: number = 14): { from: string; to: string } {
  const to = new Date();
  const from = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

// ============================================
// API TYPES
// ============================================

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: { id: string | null; name: string };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
  }>;
}

// ============================================
// MAIN API FUNCTIONS
// ============================================

/**
 * Fetch news from NewsAPI with entity matching
 */
export async function fetchFromNewsAPI(options: {
  query?: string;
  category?: string;
  pageSize?: number;
  page?: number;
  daysBack?: number;
}): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    console.error('[fetchFromNewsAPI] NEWS_API_KEY not configured in environment variables');
    console.error('[fetchFromNewsAPI] Please set NEWS_API_KEY in your Lambda environment variables');
    return [];
  }

  try {
    console.log(`[fetchFromNewsAPI] Starting fetch with options:`, { 
      query: options.query?.substring(0, 100), 
      category: options.category, 
      pageSize: options.pageSize 
    });
    // Fetch more articles than requested since we filter to only those with entities
    const { query, category, pageSize = 20, page = 1, daysBack = 14 } = options;
    const fetchSize = Math.min(100, pageSize * 3); // Fetch 3x to ensure enough after filtering
    const dateRange = getDateRange(daysBack);
    
    // Build search query with entity-focused terms
    let searchQuery = query;
    if (!searchQuery) {
      // Default query focuses on entities we can match from MOCK_ENTITIES
      // Include a mix of high-profile entities across categories
      searchQuery = '(Taylor Swift OR MrBeast OR Drake OR Kanye West OR Bad Bunny OR Travis Scott) OR (Donald Trump OR Joe Biden OR Kamala Harris) OR (Perplexity OR Cursor OR Replit OR Character.AI) OR (Logan Paul OR Jake Paul OR Charli D\'Amelio OR Alix Earle) OR (Olivia Rodrigo OR The Weeknd OR Doja Cat OR Playboi Carti)';
    }

    const params = new URLSearchParams({
      q: searchQuery,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: fetchSize.toString(),
      page: page.toString(),
      from: dateRange.from,
      to: dateRange.to,
      apiKey: NEWS_API_KEY,
    });

    const response = await fetch(`${NEWS_API_BASE_URL}/everything?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[fetchFromNewsAPI] NewsAPI HTTP error ${response.status}:`, errorText);
      
      // Try to parse as JSON for better error message
      try {
        const errorJson = JSON.parse(errorText);
        console.error('[fetchFromNewsAPI] NewsAPI error details:', errorJson);
        if (errorJson.code === 'rateLimited') {
          console.error('[fetchFromNewsAPI] Rate limit exceeded. Free tier allows 100 requests/day.');
        }
      } catch (e) {
        // Not JSON, already logged as text
      }
      
      return [];
    }

    const data = await response.json() as NewsAPIResponse;
    
    if (data.status !== 'ok') {
      console.error(`[fetchFromNewsAPI] NewsAPI returned error status: ${data.status}`);
      if ((data as any).code) {
        console.error('[fetchFromNewsAPI] Error code:', (data as any).code);
        console.error('[fetchFromNewsAPI] Error message:', (data as any).message);
      }
      return [];
    }
    
    if (!data.articles || data.articles.length === 0) {
      console.warn(`[fetchFromNewsAPI] NewsAPI returned 0 articles. Total results: ${data.totalResults || 0}`);
      return [];
    }

    console.log(`NewsAPI returned ${data.articles.length} articles, filtering and matching...`);

    // Transform to our NewsArticle format with entity matching
    const allArticles: NewsArticle[] = data.articles
      .filter(a => a.title && a.title !== '[Removed]' && a.description)
      .map(article => {
        const publishedAt = new Date(article.publishedAt);
        const entityMatch = matchToEntities(article.title, article.description || '');
        const sentiment = analyzeSentiment(article.title, article.description || '');
        
        return {
          articleId: uuidv4(),
          title: article.title,
          summary: article.description || article.title,
          content: article.content || article.description || article.title,
          source: article.source?.name || 'Unknown',
          sourceUrl: article.url,
          imageUrl: article.urlToImage || undefined,
          author: article.author || undefined,
          publishedAt: article.publishedAt,
          category: categorizeArticle(article, entityMatch),
          entityId: entityMatch?.entityId,
          entityTicker: entityMatch?.ticker,
          entityName: entityMatch?.name,
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
          impactLevel: determineImpactLevel(article, sentiment.score),
          tags: extractTags(article.title, entityMatch),
          viewCount: 0,
          isBreaking: isBreakingNews(article, publishedAt),
          createdAt: new Date().toISOString(),
        };
      });

    // Separate articles with and without entity matches
    const articlesWithEntities = allArticles.filter(a => a.entityTicker);
    const articlesWithoutEntities = allArticles.filter(a => !a.entityTicker);

    console.log(`Matched ${articlesWithEntities.length} articles to entities, ${articlesWithoutEntities.length} without matches`);

    // Prioritize articles with entity matches, but include some without if we don't have enough
    const sortedWithEntities = articlesWithEntities
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    const sortedWithoutEntities = articlesWithoutEntities
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, Math.max(0, pageSize - sortedWithEntities.length)); // Fill remaining slots

    const finalArticles = [...sortedWithEntities, ...sortedWithoutEntities].slice(0, pageSize);
    
    console.log(`Returning ${finalArticles.length} articles (${sortedWithEntities.length} with entities, ${sortedWithoutEntities.length} without)`);

    return finalArticles;
  } catch (error) {
    console.error('Error fetching from NewsAPI:', error);
    return [];
  }
}

/**
 * Fetch news for a specific entity
 */
export async function fetchNewsForEntity(entityName: string, pageSize = 10): Promise<NewsArticle[]> {
  // Find entity in our mappings to get keywords
  const entity = ENTITY_MAPPINGS.find(e => 
    e.name.toLowerCase() === entityName.toLowerCase() ||
    e.ticker.toLowerCase() === entityName.toLowerCase()
  );
  
  const searchTerm = entity ? entity.keywords.slice(0, 3).join(' OR ') : entityName;
  return fetchFromNewsAPI({ query: searchTerm, pageSize, daysBack: 14 });
}

/**
 * Fetch top headlines
 */
export async function fetchTopHeadlines(category?: string, pageSize = 20): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    console.warn('NEWS_API_KEY not configured - returning empty results');
    return [];
  }

  try {
    const params = new URLSearchParams({
      country: 'us',
      pageSize: pageSize.toString(),
      apiKey: NEWS_API_KEY,
    });

    if (category) {
      const apiCategory = category.toLowerCase() === 'tech' ? 'technology' : 
                          category.toLowerCase() === 'politics' ? 'general' : 
                          category.toLowerCase();
      params.set('category', apiCategory);
    }

    const response = await fetch(`${NEWS_API_BASE_URL}/top-headlines?${params}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('NewsAPI headlines error:', error);
      return [];
    }

    const data = await response.json() as NewsAPIResponse;
    
    if (data.status !== 'ok' || !data.articles) {
      return [];
    }

    const allArticles = data.articles
      .filter(a => a.title && a.title !== '[Removed]')
      .map(article => {
        const publishedAt = new Date(article.publishedAt);
        const entityMatch = matchToEntities(article.title, article.description || '');
        const sentiment = analyzeSentiment(article.title, article.description || '');
        
        return {
          articleId: uuidv4(),
          title: article.title,
          summary: article.description || article.title,
          content: article.content || article.description || article.title,
          source: article.source?.name || 'Unknown',
          sourceUrl: article.url,
          imageUrl: article.urlToImage || undefined,
          author: article.author || undefined,
          publishedAt: article.publishedAt,
          category: categorizeArticle(article, entityMatch),
          entityId: entityMatch?.entityId,
          entityTicker: entityMatch?.ticker,
          entityName: entityMatch?.name,
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
          impactLevel: determineImpactLevel(article, sentiment.score),
          tags: extractTags(article.title, entityMatch),
          viewCount: 0,
          isBreaking: isBreakingNews(article, publishedAt),
          createdAt: new Date().toISOString(),
        };
      });
    
    // Only return articles that have a matched entity/ticker
    return allArticles
      .filter(a => a.entityTicker)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  } catch (error) {
    console.error('Error fetching headlines:', error);
    return [];
  }
}

function extractTags(title: string, entityMatch: EntityMatch | null): string[] {
  const tags: string[] = [];
  
  // Add entity ticker as a tag
  if (entityMatch) {
    tags.push(entityMatch.ticker);
  }
  
  const lowerTitle = title.toLowerCase();
  
  // Topic tags
  if (lowerTitle.includes('ai') || lowerTitle.includes('artificial intelligence')) tags.push('AI');
  if (lowerTitle.includes('stock') || lowerTitle.includes('market')) tags.push('Markets');
  if (lowerTitle.includes('crypto') || lowerTitle.includes('bitcoin') || lowerTitle.includes('ethereum')) tags.push('Crypto');
  if (lowerTitle.includes('ipo') || lowerTitle.includes('public offering')) tags.push('IPO');
  if (lowerTitle.includes('earnings') || lowerTitle.includes('revenue')) tags.push('Earnings');
  if (lowerTitle.includes('merger') || lowerTitle.includes('acquisition')) tags.push('M&A');
  
  return tags.length > 0 ? tags : ['News'];
}

// ============================================
// SENTIMENT ANALYSIS OPTIONS (FOR FUTURE)
// ============================================

/**
 * NOTE: For better sentiment analysis, consider these options:
 * 
 * 1. OpenAI API (Best quality, ~$0.01-0.03 per article)
 *    - Use GPT-3.5-turbo with a prompt like:
 *    "Analyze the sentiment of this news headline for financial markets.
 *     Return: sentiment (bullish/bearish/neutral), confidence (0-1), reasoning.
 *     Headline: {title}"
 * 
 * 2. AWS Comprehend (Already on AWS, ~$0.0001 per unit)
 *    - Native sentiment analysis
 *    - const comprehend = new ComprehendClient({ region: 'us-east-1' });
 *    - comprehend.send(new DetectSentimentCommand({ Text: title, LanguageCode: 'en' }));
 * 
 * 3. Hugging Face Inference API (Free tier available)
 *    - Use models like "ProsusAI/finbert" for financial sentiment
 *    - POST https://api-inference.huggingface.co/models/ProsusAI/finbert
 * 
 * The current keyword-based approach is free and fast, but these AI options
 * would provide more accurate and nuanced sentiment analysis.
 */
