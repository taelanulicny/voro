# News Not Loading - Troubleshooting Guide

If news articles are not loading, check the following:

## 1. Check Backend Configuration

### Verify NEWS_API_KEY is Set

The backend needs a NewsAPI key to fetch news. Check if it's configured:

1. **Check Lambda Environment Variables:**
   - Go to AWS Console → Lambda → Your function
   - Check if `NEWS_API_KEY` is set in Environment Variables
   - If not set, add it with your NewsAPI key

2. **Get a NewsAPI Key:**
   - Sign up at https://newsapi.org/register (free tier: 100 requests/day)
   - Copy your API key
   - Add it to Lambda environment variables

### Verify Backend is Deployed

Make sure your backend is deployed and accessible:

```bash
cd backend
npx cdk deploy
```

Check the API Gateway URL is correct in your frontend config.

## 2. Check Backend Logs

View CloudWatch logs to see what's happening:

1. Go to AWS Console → CloudWatch → Log Groups
2. Find your Lambda function's log group
3. Check for errors like:
   - `NEWS_API_KEY not configured`
   - `NewsAPI HTTP error`
   - `Rate limit exceeded`

## 3. Common Issues

### Issue: "NewsAPI returned 0 articles"

**Possible causes:**
- NewsAPI rate limit exceeded (free tier: 100 requests/day)
- NewsAPI key is invalid
- No articles match the search query

**Solution:**
- Check NewsAPI dashboard for rate limit status
- Verify API key is correct
- The backend will fall back to cache if NewsAPI fails

### Issue: "Backend not configured"

**Solution:**
- Make sure `EXPO_PUBLIC_API_URL` is set in your `.env` file
- Verify the backend URL is correct
- Check that the backend is deployed

### Issue: Empty Cache

If NewsAPI fails and the cache is empty, you'll get no news.

**Solution:**
- First successful NewsAPI fetch will populate the cache
- Or manually seed news articles in DynamoDB

## 4. Test the Endpoint Directly

Test the news endpoint directly:

```bash
# Replace with your API Gateway URL
curl "https://your-api-url.execute-api.us-east-1.amazonaws.com/prod/api/news?limit=10"
```

Expected response:
```json
{
  "success": true,
  "data": [...],
  "source": "newsapi" // or "cache"
}
```

## 5. Frontend Debugging

Check the browser/React Native console for:
- Network errors
- API response format issues
- Validation errors

The frontend expects:
- `response.success === true`
- `response.data` to be an array (can be empty)

## 6. Quick Fixes

### If NewsAPI is rate-limited:
- Wait for the rate limit to reset (daily)
- Upgrade to a paid NewsAPI plan
- Use cached news: `?source=cache`

### If NEWS_API_KEY is missing:
1. Get a key from https://newsapi.org
2. Add to Lambda environment variables
3. Redeploy: `cd backend && npx cdk deploy`

### If backend is not accessible:
1. Check API Gateway is deployed
2. Verify CORS is configured
3. Check API Gateway URL in frontend config

## 7. Verify NewsAPI Key

Test your NewsAPI key directly:

```bash
curl "https://newsapi.org/v2/everything?q=tech&apiKey=YOUR_API_KEY"
```

If this returns an error, your key is invalid or rate-limited.

## 8. Check DynamoDB Cache

If NewsAPI fails, the backend falls back to DynamoDB cache:

1. Go to AWS Console → DynamoDB
2. Find the `NewsArticles` table
3. Check if it has any items
4. If empty, the cache won't help

## Next Steps

1. ✅ Check NEWS_API_KEY is set in Lambda
2. ✅ Verify backend is deployed
3. ✅ Check CloudWatch logs for errors
4. ✅ Test API endpoint directly
5. ✅ Verify NewsAPI key is valid
6. ✅ Check DynamoDB cache has data

If all else fails, check the backend logs for specific error messages.

