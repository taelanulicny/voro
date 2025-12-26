# Quick Deploy Guide

## Prerequisites Check

```bash
# Check AWS CLI
aws --version

# Check CDK
cdk --version

# Check Node.js
node --version  # Should be 20+
```

## One-Time Setup

```bash
# 1. Configure AWS credentials (if not done)
aws configure

# 2. Bootstrap CDK (first time only)
cdk bootstrap
```

## Deploy Steps

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Deploy to AWS
cdk deploy

# 4. Save the outputs (you'll see these after deployment):
#    - UserPoolId
#    - UserPoolClientId  
#    - ApiUrl
#    - AssetsBucketName

# 5. Seed the database
export AWS_REGION=us-east-1  # or your region
export DYNAMODB_TABLE_PREFIX=moro
export COGNITO_USER_POOL_ID=<from-output>
export COGNITO_CLIENT_ID=<from-output>
npm run seed
```

## Configure Frontend

Create `.env` in project root:

```env
EXPO_PUBLIC_API_URL=<ApiUrl-from-output>
EXPO_PUBLIC_COGNITO_USER_POOL_ID=<UserPoolId-from-output>
EXPO_PUBLIC_COGNITO_CLIENT_ID=<UserPoolClientId-from-output>
EXPO_PUBLIC_REGION=us-east-1
```

**Important**: The `ApiUrl` from CDK output already includes `/prod` - use it as-is in `EXPO_PUBLIC_API_URL`.

## Test

```bash
# Test API (replace with your API URL)
curl https://your-api-url.execute-api.us-east-1.amazonaws.com/prod/api/entities
```

## Update After Code Changes

```bash
npm run build
cdk deploy
```

## Destroy (Remove All Resources)

```bash
cdk destroy
```

