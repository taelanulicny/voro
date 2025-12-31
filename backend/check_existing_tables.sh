#!/bin/bash

# Script to check which DynamoDB tables already exist
# This helps identify conflicts before deployment

echo "Checking for existing DynamoDB tables with prefix 'moro-'..."
echo ""

aws dynamodb list-tables --region us-east-1 --query "TableNames[?starts_with(@, 'moro-')]" --output table

echo ""
echo "If tables exist, you have two options:"
echo "1. Delete the existing tables (if they're empty/test data)"
echo "2. Import them into the CDK stack (if they have production data)"
echo ""
echo "To delete a table (WARNING: This deletes all data):"
echo "  aws dynamodb delete-table --table-name moro-Notifications --region us-east-1"
echo ""
echo "To import into CDK, you'll need to use 'cdk import' command (CDK v2.67.0+)"

