# Gemini API Integration Summary

## What Was Added

### 1. Gemini Service (`backend/src/services/geminiService.ts`)

A complete service for analyzing news articles using Google's Gemini API. It provides:

- **Sentiment Analysis**: Determines if news is bullish, bearish, or neutral
- **Price Impact Calculation**: Returns tokens up/down (0-100) for price movement
- **Breaking News Detection**: Identifies urgent/time-sensitive news
- **Entity Assignment**: Automatically assigns news to relevant tokens/entities with confidence scores

### 2. Price Impact Service (`backend/src/services/priceImpactService.ts`)

Helper functions to apply price updates based on Gemini analysis:

- `applyPriceImpact()`: Updates a single entity's price
- `applyPriceImpactToMultiple()`: Updates multiple entities from one news article

### 3. Integration with News Processing

Updated `backend/src/services/newsApiService.ts` to:
- Automatically use Gemini when `GEMINI_API_KEY` is configured
- Gracefully fall back to keyword-based analysis if Gemini fails
- Store Gemini analysis results in news articles for price updates

## How to Use

### Step 1: Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in and create an API key
3. Copy the key

### Step 2: Configure Environment Variable

Add to your Lambda function's environment variables:
```
GEMINI_API_KEY=your_api_key_here
```

### Step 3: Deploy

```bash
cd backend
npm run deploy
```

That's it! The system will automatically use Gemini for news analysis.

## The Prompt

The detailed prompt in `geminiService.ts` instructs Gemini to:

1. **Analyze Sentiment**: Bullish (positive impact), Bearish (negative impact), or Neutral
2. **Calculate Price Impact**: 
   - Minor news: 1-5 tokens
   - Moderate: 5-15 tokens
   - Significant: 15-30 tokens
   - Major: 30-50 tokens
   - Breaking/Critical: 50-100 tokens
3. **Detect Breaking News**: Urgent, time-sensitive, high-impact news
4. **Assign Entities**: Match news to relevant tokens with confidence scores (>= 0.6)

## Response Format

```typescript
{
  sentiment: 'bullish' | 'bearish' | 'neutral',
  priceImpact: {
    tokensUp: 0-100,      // Tokens to increase price
    tokensDown: 0-100     // Tokens to decrease price
  },
  isBreaking: boolean,
  assignedEntities: [
    {
      entityId: number,
      ticker: string,
      name: string,
      confidence: 0.0-1.0
    }
  ],
  reasoning?: string
}
```

## Applying Price Updates

To apply price changes based on analysis:

```typescript
import { applyPriceImpact } from './services/priceImpactService';

// After getting Gemini analysis
const result = await applyPriceImpact(entityId, geminiAnalysis);
// Price is updated: currentPrice + (tokensUp * 0.1%) - (tokensDown * 0.1%)
```

## Fallback Behavior

- If `GEMINI_API_KEY` is not set → Uses keyword-based analysis
- If Gemini API fails → Falls back to keyword-based analysis
- If rate limited → Falls back to keyword-based analysis

News processing continues even if Gemini is unavailable.

## Files Modified/Created

1. ✅ `backend/src/services/geminiService.ts` - New Gemini API service
2. ✅ `backend/src/services/priceImpactService.ts` - New price update service
3. ✅ `backend/src/services/newsApiService.ts` - Integrated Gemini analysis
4. ✅ `backend/src/models/types.ts` - Added optional `geminiAnalysis` field
5. ✅ `GEMINI_SETUP.md` - Complete setup guide
6. ✅ `GEMINI_INTEGRATION_SUMMARY.md` - This file

## Next Steps

1. Get Gemini API key from Google AI Studio
2. Add `GEMINI_API_KEY` to Lambda environment variables
3. Redeploy backend
4. Test with news articles - check CloudWatch logs for analysis results
5. Optionally customize the prompt in `geminiService.ts` for your needs

## Customization

You can customize:
- **Price impact scale**: Adjust token ranges in the prompt
- **Entity list**: Update `AVAILABLE_ENTITIES` in `geminiService.ts`
- **Confidence threshold**: Change minimum confidence (default: 0.6)
- **Breaking news criteria**: Modify breaking news detection logic
- **Price change ratio**: Adjust `TOKEN_PRICE_RATIO` in `priceImpactService.ts`

See `GEMINI_SETUP.md` for detailed documentation.

