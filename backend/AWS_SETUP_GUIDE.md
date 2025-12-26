# AWS Backend Setup Guide

This guide will walk you through deploying the Moro backend to AWS.

## Prerequisites

1. **AWS Account**: Sign up at https://aws.amazon.com/
2. **AWS CLI**: Install and configure
   ```bash
   # Install AWS CLI (if not already installed)
   brew install awscli  # macOS
   # or download from https://aws.amazon.com/cli/
   
   # Configure AWS credentials
   aws configure
   # You'll need:
   # - AWS Access Key ID
   # - AWS Secret Access Key
   # - Default region (e.g., us-east-1)
   # - Default output format (json)
   ```

3. **Node.js 20+**: Already installed
4. **AWS CDK**: Install globally
   ```bash
   npm install -g aws-cdk
   cdk --version  # Verify installation
   ```

## Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

## Step 2: Build the Backend

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Step 3: Bootstrap CDK (First Time Only)

If this is your first time using CDK in this AWS account/region:

```bash
cdk bootstrap
```

This creates the necessary S3 bucket and IAM roles for CDK deployments.

## Step 4: Deploy the Stack

```bash
cdk deploy
```

This will:
- Create all DynamoDB tables
- Create Cognito User Pool
- Create Lambda functions
- Create API Gateway
- Create S3 bucket for assets
- Set up EventBridge rules

**Note**: The first deployment takes 10-15 minutes. Subsequent deployments are faster.

After deployment, CDK will output:
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito Client ID
- `ApiUrl` - API Gateway URL (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)
- `AssetsBucketName` - S3 bucket name

**Save these values!** You'll need them for the frontend configuration.

## Step 5: Seed the Database

After deployment, seed the entities table:

```bash
# Set environment variables (from CDK outputs)
export AWS_REGION=us-east-1
export DYNAMODB_TABLE_PREFIX=moro
export COGNITO_USER_POOL_ID=<your-pool-id>
export COGNITO_CLIENT_ID=<your-client-id>

# Run seed script
npm run seed
```

## Step 6: Configure Frontend

Create a `.env` file in the project root (not in backend):

```bash
# .env (in project root)
EXPO_PUBLIC_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
EXPO_PUBLIC_COGNITO_USER_POOL_ID=<your-pool-id>
EXPO_PUBLIC_COGNITO_CLIENT_ID=<your-client-id>
EXPO_PUBLIC_REGION=us-east-1
```

**Important**: 
- Replace `https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod` with your actual API Gateway URL from CDK output
- Replace the Cognito IDs with your actual values
- The API URL should NOT have `/api` at the end (it's already included in the endpoints)

## Step 7: API Gateway Routes (Already Configured!)

The CDK stack automatically creates all API Gateway routes using a proxy integration. All requests to `/api/*` are routed to the Lambda function, which handles routing internally. No manual setup needed!

## Step 8: Test the Backend

```bash
# Test API endpoint (replace with your API URL)
curl https://your-api-url.execute-api.us-east-1.amazonaws.com/prod/api/entities
```

## Step 9: Restart Expo

After setting up `.env`:

```bash
# Stop current Expo server (Ctrl+C)
# Restart with new environment variables
npm start
```

## Troubleshooting

### Issue: CDK deploy fails with "Stack already exists"
**Solution**: The stack might be partially created. Check AWS CloudFormation console and delete the stack if needed, or use `cdk destroy` first.

### Issue: Lambda function not found
**Solution**: Make sure you ran `npm run build` before deploying.

### Issue: API Gateway returns 403
**Solution**: 
- Check CORS configuration
- Verify API Gateway is deployed to a stage
- Check Lambda function permissions

### Issue: Cognito errors
**Solution**: 
- Verify User Pool ID and Client ID in `.env`
- Check that the client allows the auth flows you're using

### Issue: DynamoDB access denied
**Solution**: Check Lambda execution role has permissions to access DynamoDB tables.

## Cost Estimation

Approximate monthly costs (varies by usage):
- **Lambda**: $0.20 per 1M requests (first 1M free)
- **DynamoDB**: Pay-per-request, ~$1.25 per million reads/writes
- **API Gateway**: $3.50 per million requests (first 1M free)
- **Cognito**: Free for up to 50,000 MAU
- **S3**: ~$0.023 per GB storage
- **EventBridge**: $1.00 per million events

**Estimated total for low usage**: $5-10/month
**Estimated total for moderate usage**: $20-50/month

## Next Steps

1. Set up API Gateway routes (Option A or B above)
2. Test authentication flow
3. Test trading functionality
4. Monitor CloudWatch logs for errors
5. Set up alerts for errors

## Useful Commands

```bash
# View stack outputs
cdk outputs

# View CloudFormation stack
aws cloudformation describe-stacks --stack-name MoroBackendStack

# View Lambda logs
aws logs tail /aws/lambda/MoroBackendStack-TradingHandler --follow

# Update stack
cdk deploy

# Destroy stack (removes all resources)
cdk destroy
```

## Security Notes

- Never commit `.env` files to git
- Rotate AWS credentials regularly
- Use IAM roles with least privilege
- Enable CloudTrail for audit logging
- Set up VPC if handling sensitive data

