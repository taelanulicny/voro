#!/bin/bash

# Script to delete conflicting DynamoDB tables from previous deployment attempts
# WARNING: This will delete tables and all their data!

set -e

echo "⚠️  WARNING: This will delete DynamoDB tables that conflict with CDK deployment"
echo ""
echo "Tables that may be deleted:"
echo "  - moro-Notifications"
echo "  - moro-Groups"
echo "  - moro-GroupMembers"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

REGION="us-east-1"

# List of tables that might conflict
TABLES=(
  "moro-Notifications"
  "moro-Groups"
  "moro-GroupMembers"
)

for table in "${TABLES[@]}"; do
  echo ""
  echo "Checking table: $table"
  
  # Check if table exists
  if aws dynamodb describe-table --table-name "$table" --region "$REGION" &>/dev/null; then
    ITEM_COUNT=$(aws dynamodb describe-table --table-name "$table" --region "$REGION" \
      --query 'Table.ItemCount' --output text)
    
    echo "  Status: EXISTS (Item count: $ITEM_COUNT)"
    
    if [ "$ITEM_COUNT" -eq 0 ]; then
      echo "  ✅ Table is empty, safe to delete"
      echo "  Deleting table: $table"
      aws dynamodb delete-table --table-name "$table" --region "$REGION" > /dev/null
      echo "  ✅ Deleted successfully"
    else
      echo "  ⚠️  WARNING: Table has $ITEM_COUNT items!"
      read -p "  Delete anyway? (yes/no): " delete_confirm
      if [ "$delete_confirm" == "yes" ]; then
        echo "  Deleting table: $table"
        aws dynamodb delete-table --table-name "$table" --region "$REGION" > /dev/null
        echo "  ✅ Deleted successfully"
      else
        echo "  ⏭️  Skipped"
      fi
    fi
  else
    echo "  ℹ️  Table does not exist, skipping"
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "You can now run: npm run deploy"

