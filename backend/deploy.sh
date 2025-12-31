#!/bin/bash

# Moro Backend Deployment Script
# This script sets up the JWT_SECRET and deploys the stack

set -e  # Exit on error

echo "🚀 Moro Backend Deployment Script"
echo ""

# Check if JWT_SECRET is already set
if [ -z "$JWT_SECRET" ]; then
  echo "📝 Generating JWT_SECRET..."
  export JWT_SECRET=$(openssl rand -hex 32)
  echo "✅ JWT_SECRET generated (not shown for security)"
else
  echo "✅ JWT_SECRET already set"
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &>/dev/null; then
  echo "❌ ERROR: AWS credentials not configured"
  echo "Please run: aws configure"
  exit 1
fi

echo ""
echo "🔨 Building and bundling..."
npm run bundle

echo ""
echo "☁️  Deploying to AWS..."
echo "Note: You may be prompted to approve IAM changes"
echo ""

# Deploy with approval prompt
cdk deploy --require-approval broadening

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Retrieve API key value from AWS Console (API Gateway > API Keys)"
echo "2. Update your mobile app with the API endpoint URL"
echo "3. Set the API key in your mobile app configuration"

