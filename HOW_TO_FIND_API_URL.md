# How to Find Your API Gateway URL

Your API Gateway URL is needed for:
- Setting up certificate pinning
- Configuring the frontend `.env` file
- Testing API endpoints

Here are several ways to find it:

## Method 1: CDK Deployment Output (Recommended)

After deploying your backend, the API URL is displayed in the terminal:

```bash
cd backend
npm run build
cdk deploy
```

Look for output like this at the end:

```
Outputs:
MoroBackendStack.ApiUrl = https://nrv9m5dpr1.execute-api.us-east-1.amazonaws.com/prod
MoroBackendStack.UserPoolId = us-east-1_XXXXXXXXX
MoroBackendStack.UserPoolClientId = XXXXXXXXXXXXXX
MoroBackendStack.AssetsBucketName = moro-assets-XXXXXXXXX
```

**Copy the `ApiUrl` value** - that's your API Gateway URL!

## Method 2: AWS CloudFormation Console

1. Go to [AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation/)
2. Find your stack (usually named `MoroBackendStack`)
3. Click on the stack name
4. Go to the **Outputs** tab
5. Look for `ApiUrl` - that's your API Gateway URL

## Method 3: AWS CLI Command

```bash
# Get the API URL from CloudFormation stack outputs
aws cloudformation describe-stacks \
  --stack-name MoroBackendStack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text
```

Or if your stack has a different name:

```bash
# List all stacks to find yours
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Then get outputs (replace STACK_NAME with your actual stack name)
aws cloudformation describe-stacks \
  --stack-name STACK_NAME \
  --query "Stacks[0].Outputs" \
  --output table
```

## Method 4: API Gateway Console

1. Go to [AWS API Gateway Console](https://console.aws.amazon.com/apigateway/)
2. Find your API (usually named `moro-api` or similar)
3. Click on it
4. Go to **Stages** in the left sidebar
5. Click on the `prod` stage
6. The **Invoke URL** at the top is your API Gateway URL

It will look like:
```
https://nrv9m5dpr1.execute-api.us-east-1.amazonaws.com/prod
```

## Method 5: Check Your .env File

If you've already configured your frontend, check your `.env` file in the project root:

```bash
cat .env | grep EXPO_PUBLIC_API_URL
```

The value after `=` is your API URL.

## Method 6: Check CDK Outputs File

After deployment, CDK saves outputs to a file:

```bash
# Check if outputs file exists
cat backend/cdk.out/MoroBackendStack.template.json | grep -A 5 "ApiUrl"
```

## Format of API URL

Your API URL should look like:
```
https://XXXXXXXXXX.execute-api.REGION.amazonaws.com/prod
```

Where:
- `XXXXXXXXXX` is your unique API Gateway ID
- `REGION` is your AWS region (e.g., `us-east-1`)
- `/prod` is the stage name

## Important Notes

1. **The URL already includes `/prod`** - don't add it again
2. **Don't add `/api` at the end** - endpoints already include it
3. **Use HTTPS** - always use the `https://` version
4. **The URL is region-specific** - make sure you're using the correct region

## Example Usage

Once you have your API URL, use it for:

### Certificate Pinning
```bash
./scripts/extract-certificate.sh https://nrv9m5dpr1.execute-api.us-east-1.amazonaws.com/prod
```

### Frontend Configuration
In your `.env` file:
```env
EXPO_PUBLIC_API_URL=https://nrv9m5dpr1.execute-api.us-east-1.amazonaws.com/prod
```

### Testing
```bash
curl https://nrv9m5dpr1.execute-api.us-east-1.amazonaws.com/prod/api/entities
```

## Troubleshooting

**Problem:** Can't find the stack in CloudFormation

**Solution:** 
- Make sure you're in the correct AWS region
- Check if the stack was deployed successfully
- Try listing all stacks: `aws cloudformation list-stacks`

**Problem:** API URL shows as "undefined" or empty

**Solution:**
- The stack might not have deployed successfully
- Check CloudFormation stack events for errors
- Redeploy: `cdk deploy`

**Problem:** API Gateway shows different URL format

**Solution:**
- Make sure you're looking at the REST API (not HTTP API)
- Check the stage name (should be `prod`)
- Verify you're looking at the correct API Gateway

## Next Steps

Once you have your API URL:

1. ✅ Extract certificate for pinning: `./scripts/extract-certificate.sh <API_URL>`
2. ✅ Add pins to `src/utils/security.tsx`
3. ✅ Enable certificate pinning
4. ✅ Test the API endpoint

