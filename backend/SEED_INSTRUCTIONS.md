# Running the Seed Script

This guide will help you seed the database with entities and verify the backend endpoints.

## Prerequisites

1. **AWS CLI configured** with valid credentials
2. **Backend deployed** to AWS (run `cdk deploy` first)
3. **Node.js dependencies installed** (`npm install` in backend directory)

## Quick Start

### Option 1: Using the Helper Script (Recommended)

```bash
cd backend

# Set environment variables (adjust region if needed)
export AWS_REGION=us-east-1
export DYNAMODB_TABLE_PREFIX=moro

# Run the seed script
./scripts/run_seed.sh
```

### Option 2: Manual Execution

```bash
cd backend

# Set environment variables
export AWS_REGION=us-east-1  # or your deployment region
export DYNAMODB_TABLE_PREFIX=moro  # or your table prefix

# Run the seed script
npm run seed
```

## Environment Variables

The seed script requires:

- **AWS_REGION**: AWS region where your backend is deployed (default: `us-east-1`)
- **DYNAMODB_TABLE_PREFIX**: Prefix for DynamoDB table names (default: `moro`)

Optional (for verification):
- **COGNITO_USER_POOL_ID**: User Pool ID from CDK output
- **COGNITO_CLIENT_ID**: Client ID from CDK output

## What the Seed Script Does

1. **Seeds Entities Table**: Populates the `Entities` table with 40 entities (People, Politics, Tech)
2. **Seeds Price History**: Creates initial price entries for each entity in the `PriceHistory` table

## Verifying the Seed

### Check DynamoDB Tables

```bash
# List entities (first 5)
aws dynamodb scan \
  --table-name moro-Entities \
  --region us-east-1 \
  --limit 5 \
  --output json

# Count total entities
aws dynamodb scan \
  --table-name moro-Entities \
  --region us-east-1 \
  --select COUNT
```

### Test API Endpoints

If your backend is deployed, test the endpoints:

```bash
# Get all entities (no auth required)
curl https://your-api-url.execute-api.us-east-1.amazonaws.com/prod/api/entities

# Get a specific entity price (no auth required)
curl https://your-api-url.execute-api.us-east-1.amazonaws.com/prod/api/entities/10/price
```

Replace `your-api-url` with your actual API Gateway URL from CDK deployment outputs.

## Troubleshooting

### Error: "Table not found"

**Solution**: Make sure the backend is deployed first:
```bash
cd backend
cdk deploy
```

### Error: "AWS credentials not configured"

**Solution**: Configure AWS CLI:
```bash
aws configure
```

You'll need:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`)
- Default output format (e.g., `json`)

### Error: "Access Denied"

**Solution**: Make sure your AWS credentials have permissions to:
- `dynamodb:PutItem`
- `dynamodb:BatchWriteItem`
- `dynamodb:Scan` (for verification)

### Error: "Cannot find module 'node-fetch'"

**Solution**: This is a known issue with `verify_feed_live.ts`. It doesn't affect the seed script. You can ignore it or fix it by:
```bash
cd backend
npm install node-fetch@2
npm install --save-dev @types/node-fetch@2
```

## Next Steps

After seeding:

1. **Configure Frontend**: Update `.env` file in project root with API URL and Cognito IDs
2. **Test Frontend**: Start the Expo app and verify entities are loading
3. **Create Test User**: Sign up a test user through the app


