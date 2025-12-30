#!/bin/bash

# Script to run seed script with proper environment setup
# This script will:
# 1. Check for required environment variables
# 2. Run the seed script
# 3. Verify endpoints

set -e

echo "=== Moro Backend Seed Script ==="
echo ""

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    echo "   Visit: https://aws.amazon.com/cli/"
    exit 1
fi

echo "✅ AWS CLI found"
echo ""

# Set default values if not provided
export AWS_REGION=${AWS_REGION:-us-east-1}
export DYNAMODB_TABLE_PREFIX=${DYNAMODB_TABLE_PREFIX:-moro}

echo "Configuration:"
echo "  AWS_REGION: $AWS_REGION"
echo "  DYNAMODB_TABLE_PREFIX: $DYNAMODB_TABLE_PREFIX"
echo ""

# Check if we can access AWS
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured or invalid"
    echo "   Run: aws configure"
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
echo "✅ AWS credentials valid"
echo "   Account: $AWS_ACCOUNT"
echo "   User: $AWS_USER"
echo ""

# Try to get stack outputs if CDK is deployed
echo "Checking for deployed CDK stack..."
STACK_NAME="MoroBackendStack"
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION &> /dev/null; then
    echo "✅ Stack found: $STACK_NAME"
    
    # Try to get outputs (these are optional for seeding, but good to verify)
    echo "Stack outputs:"
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs' \
        --output table 2>/dev/null || echo "  (Could not retrieve outputs)"
    echo ""
else
    echo "⚠️  Stack not found: $STACK_NAME"
    echo "   Make sure the backend is deployed: cd backend && cdk deploy"
    echo "   Continuing with seed script anyway (using default table names)..."
    echo ""
fi

# Verify tables exist
echo "Checking DynamoDB tables..."
TABLE_NAME="${DYNAMODB_TABLE_PREFIX}-Entities"
if aws dynamodb describe-table --table-name $TABLE_NAME --region $AWS_REGION &> /dev/null; then
    echo "✅ Table found: $TABLE_NAME"
else
    echo "❌ Table not found: $TABLE_NAME"
    echo "   Please deploy the backend first: cd backend && cdk deploy"
    exit 1
fi

TABLE_NAME="${DYNAMODB_TABLE_PREFIX}-PriceHistory"
if aws dynamodb describe-table --table-name $TABLE_NAME --region $AWS_REGION &> /dev/null; then
    echo "✅ Table found: $TABLE_NAME"
else
    echo "⚠️  Table not found: $TABLE_NAME"
    echo "   Continuing anyway..."
fi

echo ""
echo "Running seed script..."
echo ""

# Run the seed script
npm run seed

echo ""
echo "=== Seed Script Complete ==="
echo ""
echo "To verify, you can:"
echo "1. Check the entities in DynamoDB:"
echo "   aws dynamodb scan --table-name ${DYNAMODB_TABLE_PREFIX}-Entities --region $AWS_REGION --limit 5"
echo ""
echo "2. Test the API endpoint (if deployed):"
echo "   curl https://your-api-url.execute-api.$AWS_REGION.amazonaws.com/prod/api/entities"


