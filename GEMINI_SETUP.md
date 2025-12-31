# Gemini API Setup Guide

This guide explains how to set up and use Google's Gemini API for intelligent news analysis in the Moro backend.

## Overview

The Gemini API integration provides:
- **Sentiment Analysis**: Determines if news is bullish, bearish, or neutral
- **Price Impact**: Calculates how many tokens the price should move up/down (0-100)
- **Breaking News Detection**: Identifies urgent/time-sensitive news
- **Entity Assignment**: Automatically assigns news to relevant tokens/entities

## Setup

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Environment Variable

Add the API key to your Lambda function's environment variables:

**Option A: Via AWS Console**
1. Go to AWS Console → Lambda → Your function
2. Configuration → Environment variables
3. Add: `GEMINI_API_KEY` = `your_api_key_here`

**Option B: Via CDK (Recommended)**

Update `backend/infrastructure/stack.ts`:

```typescript
// In your Lambda function definition
environment: {
  // ... existing env vars
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '', // Set via CDK context or secrets
}
```

Then deploy:
```bash
cd backend
GEMINI_API_KEY=your_key_here npx cdk deploy
```

**Option C: Via AWS Secrets Manager (Most Secure)**

1. Store key in AWS Secrets Manager
2. Grant Lambda permission to read it
3. Load in Lambda code:

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({});
const secret = await secretsClient.send(
  new GetSecretValueCommand({ SecretId: 'gemini-api-key' })
);
const GEMINI_API_KEY = JSON.parse(secret.SecretString!).apiKey;
```

### 3. Deploy Backend

After setting the environment variable, redeploy:

```bash
cd backend
npm run deploy
```

## How It Works

### Automatic Integration

When `GEMINI_API_KEY` is configured, the news processing automatically uses Gemini for:

1. **Sentiment Analysis**: More accurate than keyword-based analysis
2. **Entity Assignment**: Better entity matching using AI understanding
3. **Breaking News**: Context-aware breaking news detection
4. **Price Impact**: Intelligent calculation of price movement

### Fallback Behavior

If Gemini API is:
- **Not configured**: Falls back to keyword-based analysis
- **Rate limited**: Falls back to keyword-based analysis
- **Returns error**: Falls back to keyword-based analysis

The system gracefully degrades, so news processing continues even if Gemini fails.

## API Usage

### Direct Usage

You can also use Gemini analysis directly in your code:

```typescript
import { analyzeNewsWithGemini } from './services/geminiService';

const analysis = await analyzeNewsWithGemini({
  title: 'MrBeast announces new charity initiative',
  description: 'YouTube star MrBeast launches...',
  content: 'Full article content...',
  source: 'TechCrunch',
  publishedAt: new Date().toISOString(),
});

if (analysis) {
  console.log('Sentiment:', analysis.sentiment); // 'bullish' | 'bearish' | 'neutral'
  console.log('Price Impact:', analysis.priceImpact); // { tokensUp: 15, tokensDown: 0 }
  console.log('Is Breaking:', analysis.isBreaking); // true | false
  console.log('Assigned Entities:', analysis.assignedEntities); // Array of entities
}
```

### Response Format

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

## Price Impact Application

To apply price updates based on Gemini analysis:

```typescript
import { applyPriceImpact } from './services/priceImpactService';

const result = await applyPriceImpact(entityId, analysis);
// Updates entity price based on tokensUp/tokensDown
```

## Prompt Engineering

The Gemini prompt is defined in `backend/src/services/geminiService.ts`. Key features:

- **Sentiment Guidelines**: Conservative approach - only bullish/bearish if clear impact
- **Price Impact Scale**: 
  - Minor: 1-5 tokens
  - Moderate: 5-15 tokens
  - Significant: 15-30 tokens
  - Major: 30-50 tokens
  - Breaking/Critical: 50-100 tokens
- **Entity Assignment**: Only assigns with confidence >= 0.6
- **Breaking News**: Time-sensitive, urgent, high-impact news

You can customize the prompt in `createAnalysisPrompt()` function.

## Cost Considerations

- **Free Tier**: 60 requests/minute, 1,500 requests/day
- **Paid Tier**: Higher limits available
- **Current Usage**: ~1 request per news article processed

Monitor usage in [Google AI Studio Dashboard](https://makersuite.google.com/app/apikey)

## Troubleshooting

### "GEMINI_API_KEY not configured"
- Check Lambda environment variables
- Verify key is set correctly
- Redeploy after adding environment variable

### "Gemini API error 429"
- Rate limit exceeded
- Wait or upgrade plan
- System will fall back to keyword-based analysis

### "Failed to parse JSON response"
- Gemini sometimes returns markdown-wrapped JSON
- Code handles this automatically
- Check logs for actual response format

### Entity Assignment Not Working
- Verify entities list in `geminiService.ts` matches your entities
- Check confidence threshold (default: 0.6)
- Review prompt for entity matching instructions

## Testing

Test Gemini integration:

```bash
# Test with a sample article
curl -X POST https://your-api-url/api/news/test-gemini \
  -H "Content-Type: application/json" \
  -d '{
    "title": "MrBeast announces new charity initiative",
    "description": "YouTube star launches major charity campaign",
    "content": "Full article content..."
  }'
```

Or check CloudWatch logs when processing news to see Gemini analysis results.

## Best Practices

1. **Monitor Costs**: Track API usage in Google AI Studio
2. **Error Handling**: Always handle Gemini failures gracefully
3. **Rate Limiting**: Implement rate limiting if processing many articles
4. **Caching**: Consider caching analysis results for duplicate articles
5. **Prompt Tuning**: Adjust prompt based on your specific needs

## Next Steps

1. ✅ Get Gemini API key
2. ✅ Add to Lambda environment variables
3. ✅ Redeploy backend
4. ✅ Test with sample news articles
5. ✅ Monitor CloudWatch logs for analysis results
6. ✅ Adjust prompt if needed for your use case

