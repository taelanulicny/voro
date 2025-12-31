# Deployment Guide

## Quick Start

### Option 1: Use the Deployment Script (Recommended)

```bash
cd backend
./deploy.sh
```

This script will:
- Generate a secure JWT_SECRET automatically
- Build and bundle the code
- Deploy to AWS with approval prompts

### Option 2: Manual Deployment

1. **Set JWT_SECRET:**
   ```bash
   export JWT_SECRET=$(openssl rand -hex 32)
   ```

2. **Verify AWS credentials:**
   ```bash
   aws sts get-caller-identity
   ```

3. **Build and deploy:**
   ```bash
   npm run deploy
   ```

   Or with automatic approval (less secure):
   ```bash
   cdk deploy --require-approval never
   ```

## Environment Variables

### Required

- `JWT_SECRET`: Secret key for JWT token signing (minimum 32 characters)
  ```bash
  export JWT_SECRET=$(openssl rand -hex 32)
  ```

### Optional

- `APPLE_CLIENT_ID`: Apple bundle identifier (defaults to `com.moro.mobile`)
  ```bash
  export APPLE_CLIENT_ID=com.moro.mobile
  ```

- `NEWS_API_KEY`: News API key for news aggregation (optional)
  ```bash
  export NEWS_API_KEY=your-news-api-key
  ```

- `CDK_DEFAULT_REGION`: AWS region (defaults to `us-east-1`)
  ```bash
  export CDK_DEFAULT_REGION=us-east-1
  ```

## Deployment Process

1. **Pre-deployment checks:**
   - ✅ JWT_SECRET is set
   - ✅ AWS credentials are configured
   - ✅ Code compiles without errors

2. **Build and bundle:**
   - TypeScript compilation
   - Copy files to bundle directory
   - Install production dependencies

3. **CDK synthesis:**
   - Generate CloudFormation template
   - Validate infrastructure

4. **Deployment:**
   - Upload Lambda code to S3
   - Create/update AWS resources
   - Prompt for IAM changes approval

## Post-Deployment

### Retrieve API Key

After deployment, get your API key value:

**AWS Console:**
1. Go to API Gateway > API Keys
2. Find `moro-api-key`
3. Click "Show" to reveal the key value

**AWS CLI:**
```bash
# Get API key ID from CloudFormation outputs
API_KEY_ID=$(aws cloudformation describe-stacks \
  --stack-name MoroBackendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`moro-ApiKeyId`].OutputValue' \
  --output text)

# Get API key value
aws apigateway get-api-key \
  --api-key $API_KEY_ID \
  --include-value \
  --region us-east-1 \
  --query 'value' \
  --output text
```

### Update Mobile App Configuration

1. **API Endpoint:**
   - Get from CloudFormation output: `moro-ApiUrl`
   - Set in `src/config/api.ts` as `EXPO_PUBLIC_API_URL`

2. **API Key (optional):**
   - Add to API requests as `x-api-key` header
   - Store securely in app configuration

3. **Cognito Configuration:**
   - User Pool ID: `moro-UserPoolId`
   - Client ID: `moro-UserPoolClientId`

## Troubleshooting

### Error: JWT_SECRET not set
```bash
export JWT_SECRET=$(openssl rand -hex 32)
```

### Error: AWS credentials not configured
```bash
aws configure
```

### Error: Cannot assume role
- Check your AWS credentials have sufficient permissions
- Verify you're using the correct AWS account
- Ensure CDK bootstrap has been run: `cdk bootstrap`

### Error: Approval required
- Run with `--require-approval broadening` for automatic approval of safe changes
- Or approve manually when prompted

## Security Notes

- **Never commit JWT_SECRET to git**
- Store secrets in AWS Secrets Manager or environment variables
- Rotate JWT_SECRET periodically
- Keep API keys secure and rotate as needed

## Rollback

If deployment fails or you need to rollback:

```bash
cdk destroy
```

⚠️ **Warning:** This will delete all resources including databases. Make sure you have backups!

