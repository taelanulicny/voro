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
const ENTITY_MAPPINGS: EntityMatch[] = [
  // Tech Companies & Products
  { entityId: 10, ticker: 'OPENAI', name: 'OpenAI', keywords: ['openai', 'chatgpt', 'gpt-4', 'gpt-5', 'sam altman', 'dall-e', 'sora'], category: 'Tech' },
  { entityId: 11, ticker: 'TSLA', name: 'Tesla', keywords: ['tesla', 'model s', 'model 3', 'model x', 'model y', 'cybertruck', 'supercharger', 'fsd'], category: 'Tech' },
  { entityId: 12, ticker: 'AAPL', name: 'Apple', keywords: ['apple inc', 'iphone', 'ipad', 'macbook', 'tim cook', 'ios 18', 'macos', 'vision pro', 'apple watch', 'airpods', 'app store'], category: 'Tech' },
  { entityId: 13, ticker: 'GOOGL', name: 'Google', keywords: ['google', 'alphabet', 'android', 'youtube', 'sundar pichai', 'gemini ai', 'pixel', 'chrome', 'google cloud'], category: 'Tech' },
  { entityId: 14, ticker: 'MSFT', name: 'Microsoft', keywords: ['microsoft', 'windows 11', 'azure', 'xbox', 'satya nadella', 'copilot', 'bing', 'office 365', 'github'], category: 'Tech' },
  { entityId: 15, ticker: 'META', name: 'Meta', keywords: ['meta platforms', 'facebook', 'instagram', 'whatsapp', 'mark zuckerberg', 'threads app', 'metaverse', 'ray-ban meta', 'quest'], category: 'Tech' },
  { entityId: 16, ticker: 'AMZN', name: 'Amazon', keywords: ['amazon', 'aws', 'prime video', 'alexa', 'jeff bezos', 'andy jassy', 'kindle', 'whole foods', 'ring'], category: 'Tech' },
  { entityId: 17, ticker: 'NVDA', name: 'Nvidia', keywords: ['nvidia', 'geforce', 'rtx 50', 'jensen huang', 'cuda', 'h100', 'blackwell', 'ai chip'], category: 'Tech' },
  { entityId: 18, ticker: 'NFLX', name: 'Netflix', keywords: ['netflix', 'streaming war', 'reed hastings', 'squid game', 'wednesday'], category: 'Tech' },
  { entityId: 19, ticker: 'SPOT', name: 'Spotify', keywords: ['spotify', 'daniel ek', 'spotify wrapped', 'podcast'], category: 'Tech' },
  { entityId: 50, ticker: 'TSMC', name: 'TSMC', keywords: ['tsmc', 'taiwan semiconductor', 'chip manufacturing'], category: 'Tech' },
  { entityId: 51, ticker: 'AMD', name: 'AMD', keywords: ['amd', 'ryzen', 'radeon', 'lisa su'], category: 'Tech' },
  { entityId: 52, ticker: 'UBER', name: 'Uber', keywords: ['uber', 'uber eats', 'rideshare', 'dara khosrowshahi'], category: 'Tech' },
  { entityId: 53, ticker: 'ABNB', name: 'Airbnb', keywords: ['airbnb', 'vacation rental', 'brian chesky'], category: 'Tech' },
  
  // Crypto
  { entityId: 20, ticker: 'BTC', name: 'Bitcoin', keywords: ['bitcoin', 'btc price', 'satoshi', 'cryptocurrency', 'bitcoin etf'], category: 'Tech' },
  { entityId: 21, ticker: 'ETH', name: 'Ethereum', keywords: ['ethereum', 'eth price', 'vitalik buterin', 'defi', 'smart contract'], category: 'Tech' },
  { entityId: 54, ticker: 'SOL', name: 'Solana', keywords: ['solana', 'sol crypto'], category: 'Tech' },
  { entityId: 55, ticker: 'XRP', name: 'Ripple', keywords: ['ripple', 'xrp', 'ripple sec'], category: 'Tech' },
  
  // People - Tech
  { entityId: 22, ticker: 'MUSK', name: 'Elon Musk', keywords: ['elon musk', 'musk twitter', 'musk tesla', 'spacex musk'], category: 'People' },
  { entityId: 23, ticker: 'BEZOS', name: 'Jeff Bezos', keywords: ['jeff bezos', 'bezos', 'blue origin'], category: 'People' },
  { entityId: 24, ticker: 'ZUCK', name: 'Mark Zuckerberg', keywords: ['mark zuckerberg', 'zuckerberg', 'zuck mma'], category: 'People' },
  { entityId: 56, ticker: 'ALTMAN', name: 'Sam Altman', keywords: ['sam altman', 'altman openai'], category: 'People' },
  { entityId: 57, ticker: 'HUANG', name: 'Jensen Huang', keywords: ['jensen huang', 'nvidia ceo'], category: 'People' },
  
  // People - Entertainment
  { entityId: 25, ticker: 'TSWIFT', name: 'Taylor Swift', keywords: ['taylor swift', 'eras tour', 'swiftie', 'travis kelce taylor'], category: 'People' },
  { entityId: 26, ticker: 'DRAKE', name: 'Drake', keywords: ['drake rapper', 'aubrey graham', 'ovo sound', 'kendrick drake'], category: 'People' },
  { entityId: 27, ticker: 'BEAST', name: 'MrBeast', keywords: ['mrbeast', 'jimmy donaldson', 'beast philanthropy', 'feastables'], category: 'People' },
  { entityId: 28, ticker: 'ROGAN', name: 'Joe Rogan', keywords: ['joe rogan experience', 'jre podcast', 'rogan spotify'], category: 'People' },
  { entityId: 58, ticker: 'TRAV', name: 'Travis Scott', keywords: ['travis scott', 'utopia', 'cactus jack'], category: 'People' },
  { entityId: 59, ticker: 'KDOT', name: 'Kendrick Lamar', keywords: ['kendrick lamar', 'gnx', 'pglan'], category: 'People' },
  { entityId: 60, ticker: 'ZENDAYA', name: 'Zendaya', keywords: ['zendaya', 'euphoria', 'challengers'], category: 'People' },
  { entityId: 61, ticker: 'CHALAMET', name: 'Timothée Chalamet', keywords: ['timothée chalamet', 'timothee chalamet', 'chalamet', 'dune'], category: 'People' },
  
  // People - Sports
  { entityId: 29, ticker: 'LEBRON', name: 'LeBron James', keywords: ['lebron james', 'lebron lakers', 'king james'], category: 'People' },
  { entityId: 30, ticker: 'MAHOMES', name: 'Patrick Mahomes', keywords: ['patrick mahomes', 'mahomes chiefs', 'mahomes super bowl'], category: 'People' },
  { entityId: 31, ticker: 'MESSI', name: 'Lionel Messi', keywords: ['lionel messi', 'messi inter miami', 'messi argentina'], category: 'People' },
  { entityId: 62, ticker: 'CURRY', name: 'Stephen Curry', keywords: ['stephen curry', 'steph curry', 'curry warriors'], category: 'People' },
  { entityId: 63, ticker: 'RONALDO', name: 'Cristiano Ronaldo', keywords: ['cristiano ronaldo', 'ronaldo', 'cr7'], category: 'People' },
  { entityId: 64, ticker: 'KELCE', name: 'Travis Kelce', keywords: ['travis kelce', 'kelce chiefs', 'kelce swift'], category: 'People' },
  
  // Politics
  { entityId: 32, ticker: 'TRUMP', name: 'Donald Trump', keywords: ['donald trump', 'trump president', 'trump administration', 'maga'], category: 'Politics' },
  { entityId: 33, ticker: 'BIDEN', name: 'Joe Biden', keywords: ['joe biden', 'president biden', 'biden administration'], category: 'Politics' },
  { entityId: 34, ticker: 'HARRIS', name: 'Kamala Harris', keywords: ['kamala harris', 'vice president harris'], category: 'Politics' },
  { entityId: 65, ticker: 'RFK', name: 'RFK Jr', keywords: ['rfk jr', 'robert kennedy jr', 'kennedy health'], category: 'Politics' },
  
  // AI/Tech Products
  { entityId: 47, ticker: 'CURSO', name: 'Cursor', keywords: ['cursor ai', 'cursor ide', 'ai code editor'], category: 'Tech' },
  { entityId: 48, ticker: 'ANTHR', name: 'Anthropic', keywords: ['anthropic', 'claude 3', 'claude ai', 'dario amodei'], category: 'Tech' },
  { entityId: 66, ticker: 'PERP', name: 'Perplexity', keywords: ['perplexity ai', 'perplexity search'], category: 'Tech' },
  { entityId: 67, ticker: 'MISTRL', name: 'Mistral', keywords: ['mistral ai', 'mistral model'], category: 'Tech' },
  
  // Media/Entertainment Companies
  { entityId: 68, ticker: 'DIS', name: 'Disney', keywords: ['disney', 'disney+', 'bob iger', 'marvel', 'star wars'], category: 'Tech' },
  { entityId: 69, ticker: 'WBD', name: 'Warner Bros', keywords: ['warner bros', 'hbo max', 'max streaming', 'dc studios'], category: 'Tech' },
  { entityId: 70, ticker: 'PARA', name: 'Paramount', keywords: ['paramount', 'paramount+', 'cbs'], category: 'Tech' },
  
  // Sports Teams/Events (high engagement)
  { entityId: 71, ticker: 'NFL', name: 'NFL', keywords: ['nfl', 'super bowl', 'nfl playoffs', 'nfl draft'], category: 'Events' },
  { entityId: 72, ticker: 'NBA', name: 'NBA', keywords: ['nba', 'nba finals', 'nba playoffs', 'all-star game'], category: 'Events' },
  { entityId: 73, ticker: 'FIFA', name: 'FIFA', keywords: ['fifa', 'world cup', 'champions league'], category: 'Events' },
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
  
  // Check for breaking keywords
  const breakingKeywords = ['breaking', 'just in', 'urgent', 'developing', 'alert', 'live:', 'update:'];
  const hasBreakingKeyword = breakingKeywords.some(keyword => text.includes(keyword));
  
  // Check if very recent (within last 3 hours)
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const isVeryRecent = publishedAt > threeHoursAgo;
  
  // Only mark as breaking if it has breaking keywords OR is very recent from major source
  const majorSources = ['reuters', 'bloomberg', 'associated press', 'bbc', 'cnn'];
  const sourceName = (article.source?.name || '').toLowerCase();
  const isMajorSource = majorSources.some(s => sourceName.includes(s));
  
  return hasBreakingKeyword || (isVeryRecent && isMajorSource);
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
    console.warn('NEWS_API_KEY not configured - returning empty results');
    return [];
  }

  try {
    // Fetch more articles than requested since we filter to only those with entities
    const { query, category, pageSize = 20, page = 1, daysBack = 14 } = options;
    const fetchSize = Math.min(100, pageSize * 3); // Fetch 3x to ensure enough after filtering
    const dateRange = getDateRange(daysBack);
    
    // Build search query with entity-focused terms
    let searchQuery = query;
    if (!searchQuery) {
      // Default query focuses on entities we can match
      searchQuery = '(Tesla OR Apple OR Google OR Microsoft OR Meta OR Amazon OR Nvidia OR OpenAI OR ChatGPT) OR (Elon Musk OR Sam Altman OR Mark Zuckerberg) OR (Taylor Swift OR MrBeast OR Drake) OR (Bitcoin OR Ethereum OR crypto) OR (Trump OR Biden) OR (AI artificial intelligence)';
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
      const error = await response.text();
      console.error('NewsAPI error:', error);
      return [];
    }

    const data = await response.json() as NewsAPIResponse;
    
    if (data.status !== 'ok' || !data.articles) {
      console.error('NewsAPI returned error status:', data);
      return [];
    }

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

    // Only return articles that have a matched entity/ticker, limited to requested size
    const articlesWithEntities = allArticles
      .filter(a => a.entityTicker)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, pageSize);

    return articlesWithEntities;
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
