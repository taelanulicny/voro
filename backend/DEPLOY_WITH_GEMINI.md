# Deploy with Gemini API Key

## Quick Deploy

Set the environment variable and deploy:

```bash
cd backend
export GEMINI_API_KEY=AIzaSyACY9QEnVzWDzYK3YuBmHRJ_1uCGBbxVqc
export JWT_SECRET=$(openssl rand -hex 32)  # If not already set
npm run deploy
```

## One-Line Deploy

```bash
cd backend && GEMINI_API_KEY=AIzaSyACY9QEnVzWDzYK3YuBmHRJ_1uCGBbxVqc npm run deploy
```

## Using .env File (Recommended)

Create a `.env` file in the `backend` directory:

```bash
# backend/.env
GEMINI_API_KEY=AIzaSyACY9QEnVzWDzYK3YuBmHRJ_1uCGBbxVqc
JWT_SECRET=your_jwt_secret_here
NEWS_API_KEY=your_news_api_key_here  # If you have one
```

Then load it before deploying:

```bash
cd backend
export $(cat .env | xargs)
npm run deploy
```

## Verify Deployment

After deployment, check CloudWatch logs to verify Gemini is working:

1. Go to AWS Console → Lambda → Your function
2. Check Environment variables → Should see `GEMINI_API_KEY`
3. Check CloudWatch logs when processing news articles
4. Look for Gemini analysis results in the logs

## Security Note

⚠️ **Important**: Never commit your API key to git!

Add to `.gitignore`:
```
backend/.env
```

The CDK stack is already configured to read `GEMINI_API_KEY` from environment variables and pass it to the Lambda function.

