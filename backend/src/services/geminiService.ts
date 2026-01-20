/**
 * Gemini API Service for News Analysis
 * 
 * Uses Google's Gemini API to analyze news articles and determine:
 * - Sentiment (bullish/bearish/neutral)
 * - Price impact (tokens up/down)
 * - Breaking news status
 * - Entity/token assignment
 */

import { NewsArticle } from '../models/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export interface GeminiAnalysisResult {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  priceImpact: {
    tokensUp: number;      // Number of tokens to increase price
    tokensDown: number;   // Number of tokens to decrease price
  };
  isBreaking: boolean;
  assignedEntities: Array<{
    entityId: number;
    name: string;
    name: string;
    confidence: number;   // 0-1, how confident the assignment is
  }>;
  reasoning?: string;     // Brief explanation of the analysis
}

/**
 * Available entities for assignment
 * This should match your MOCK_ENTITIES in the frontend
 */
export const AVAILABLE_ENTITIES = [
  // Politics
  { entityId: 10, name: 'Donald Trump', category: 'Politics' },
  { entityId: 31, name: 'Joe Biden', category: 'Politics' },
  { entityId: 32, name: 'Kamala Harris', category: 'Politics' },
  
  // People/Influencers
  { entityId: 11, name: 'Alix Earle', category: 'People' },
  { entityId: 12, name: 'MrBeast', category: 'People' },
  { entityId: 14, name: 'Kai Cenat', category: 'People' },
  { entityId: 15, name: 'Logan Paul', category: 'People' },
  { entityId: 19, name: 'Jake Paul', category: 'People' },
  { entityId: 20, name: 'Charli D\'Amelio', category: 'People' },
  
  // Music Artists
  { entityId: 21, name: 'Taylor Swift', category: 'People' },
  { entityId: 22, name: 'Drake', category: 'People' },
  { entityId: 23, name: 'Kanye West', category: 'People' },
  { entityId: 24, name: 'Bad Bunny', category: 'People' },
  { entityId: 25, name: 'Travis Scott', category: 'People' },
  { entityId: 26, name: 'Olivia Rodrigo', category: 'People' },
  { entityId: 27, name: 'Playboi Carti', category: 'People' },
  { entityId: 28, name: 'Ice Spice', category: 'People' },
  { entityId: 29, name: 'The Weeknd', category: 'People' },
  { entityId: 30, name: 'Doja Cat', category: 'People' },
  
  // Tech Startups
  { entityId: 40, name: 'Cluely', category: 'Tech' },
  { entityId: 41, name: 'Perplexity', category: 'Tech' },
  { entityId: 42, name: 'Abridge', category: 'Tech' },
  { entityId: 43, name: 'Replit', category: 'Tech' },
  { entityId: 44, name: 'Mercury', category: 'Tech' },
  { entityId: 45, name: 'Character.AI', category: 'Tech' },
  { entityId: 46, name: 'Luma AI', category: 'Tech' },
  { entityId: 47, name: 'Cursor', category: 'Tech' },
];

/**
 * Detailed prompt for Gemini API to analyze news articles
 */
function createAnalysisPrompt(article: {
  title: string;
  description: string | null;
  content: string | null;
  source: string;
  publishedAt: string;
}): string {
  const entitiesList = AVAILABLE_ENTITIES.map(e => 
    `- ${e.name} - ${e.category}`
  ).join('\n');

  return `You are a financial news analyst for a tokenized social trading platform. Analyze the following news article and provide a structured JSON response.

NEWS ARTICLE:
Title: ${article.title}
Description: ${article.description || 'N/A'}
Content: ${article.content || article.description || 'N/A'}
Source: ${article.source}
Published: ${article.publishedAt}

AVAILABLE ENTITIES/TOKENS:
${entitiesList}

ANALYSIS REQUIREMENTS:

1. SENTIMENT ANALYSIS:
   - Determine if the news is BULLISH (positive, growth, success, gains), BEARISH (negative, decline, failure, losses), or NEUTRAL (informational, no clear direction)
   - Consider the overall tone, implications, and market impact
   - Be conservative: only mark as bullish/bearish if there's clear positive/negative impact

2. PRICE IMPACT:
   - Estimate how many tokens the price should move UP (positive impact) or DOWN (negative impact)
   - Range: 0-100 tokens per direction
   - Guidelines:
     * Minor news: 1-5 tokens
     * Moderate news: 5-15 tokens
     * Significant news: 15-30 tokens
     * Major news: 30-50 tokens
     * Breaking/critical news: 50-100 tokens
   - If bullish: set tokensUp (1-100), tokensDown = 0
   - If bearish: set tokensUp = 0, tokensDown (1-100)
   - If neutral: set both to 0 or minimal values (0-2)

3. BREAKING NEWS DETECTION:
   - Mark as breaking if:
     * Very recent (within last 2 hours)
     * Contains urgent/time-sensitive information
     * Major announcement, scandal, crisis, or significant event
     * High-impact news that would cause immediate market reaction
   - Examples: major product launches, scandals, legal issues, major partnerships, earnings surprises, regulatory changes

4. ENTITY/TOKEN ASSIGNMENT:
   - Identify which entity/token(s) this news is most relevant to
   - Can assign to multiple entities if the news affects multiple people/companies
   - For each assigned entity, provide:
     * entityId: The numeric ID from the list above
     * name: The entity name
     * name: The entity name
     * confidence: 0.0-1.0 (how confident you are this news relates to this entity)
   - Only assign entities with confidence >= 0.6
   - If no clear entity match, return empty array

5. REASONING (optional):
   - Provide a brief 1-2 sentence explanation of your analysis

RESPONSE FORMAT (JSON only, no markdown):
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "priceImpact": {
    "tokensUp": 0-100,
    "tokensDown": 0-100
  },
  "isBreaking": true | false,
  "assignedEntities": [
    {
      "entityId": number,
      "ticker": "string",
      "name": "string",
      "confidence": 0.0-1.0
    }
  ],
  "reasoning": "Brief explanation"
}

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting, no code blocks
- Ensure all numbers are actual numbers, not strings
- If unsure about sentiment, default to "neutral"
- Be conservative with price impact - don't overestimate
- Only mark as breaking for truly urgent/time-sensitive news
- Only assign entities with high confidence (>= 0.6)`;
}

/**
 * Analyze a news article using Gemini API
 */
export async function analyzeNewsWithGemini(article: {
  title: string;
  description: string | null;
  content: string | null;
  source: string;
  publishedAt: string;
}): Promise<GeminiAnalysisResult | null> {
  if (!GEMINI_API_KEY) {
    console.warn('[analyzeNewsWithGemini] GEMINI_API_KEY not configured');
    return null;
  }

  try {
    const prompt = createAnalysisPrompt(article);

    // Add timeout to prevent hanging (5 seconds max)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent, factual responses
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[analyzeNewsWithGemini] Gemini API error ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json() as any;

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('[analyzeNewsWithGemini] Invalid response structure:', data);
      return null;
    }

    const responseText = data.candidates[0].content.parts[0].text.trim();

    // Extract JSON from response (handle cases where Gemini adds markdown)
    let jsonText = responseText;
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse JSON
    const analysis = JSON.parse(jsonText) as GeminiAnalysisResult;

    // Validate and normalize the response
    if (!analysis.sentiment || !['bullish', 'bearish', 'neutral'].includes(analysis.sentiment)) {
      console.warn('[analyzeNewsWithGemini] Invalid sentiment, defaulting to neutral');
      analysis.sentiment = 'neutral';
    }

    if (!analysis.priceImpact) {
      analysis.priceImpact = { tokensUp: 0, tokensDown: 0 };
    } else {
      // Ensure values are within valid range
      analysis.priceImpact.tokensUp = Math.max(0, Math.min(100, analysis.priceImpact.tokensUp || 0));
      analysis.priceImpact.tokensDown = Math.max(0, Math.min(100, analysis.priceImpact.tokensDown || 0));
    }

    if (typeof analysis.isBreaking !== 'boolean') {
      analysis.isBreaking = false;
    }

    if (!Array.isArray(analysis.assignedEntities)) {
      analysis.assignedEntities = [];
    } else {
      // Filter out low-confidence assignments and validate entity IDs
      analysis.assignedEntities = analysis.assignedEntities
        .filter(e => e.confidence >= 0.6)
        .filter(e => AVAILABLE_ENTITIES.some(ae => ae.entityId === e.entityId))
        .map(e => ({
          ...e,
          confidence: Math.max(0, Math.min(1, e.confidence || 0)),
        }));
    }

    return analysis;
  } catch (error: any) {
    // Don't log errors for timeout or abort - these are expected
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.warn('[analyzeNewsWithGemini] Request timeout, falling back to keyword analysis');
    } else {
      console.error('[analyzeNewsWithGemini] Error analyzing news:', error.message || error);
      if (error.message?.includes('JSON')) {
        console.error('[analyzeNewsWithGemini] Failed to parse JSON response');
      }
    }
    return null;
  }
}

/**
 * Convert Gemini sentiment to our sentiment format
 */
export function convertGeminiSentiment(geminiSentiment: 'bullish' | 'bearish' | 'neutral'): 'positive' | 'negative' | 'neutral' {
  switch (geminiSentiment) {
    case 'bullish':
      return 'positive';
    case 'bearish':
      return 'negative';
    case 'neutral':
      return 'neutral';
    default:
      return 'neutral';
  }
}

