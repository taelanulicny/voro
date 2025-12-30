# ID Uniqueness Guide

This document explains how unique IDs are ensured for users and entities in the Moro application.

## Overview

Both users and entities must have unique IDs to prevent data conflicts and errors. This guide explains:
1. How IDs are generated for new users and entities
2. How existing IDs are validated
3. How to ensure uniqueness when adding new data

## User IDs

### Generation
User IDs are automatically generated and guaranteed to be unique:

1. **Cognito Signup** (`backend/src/services/authService.ts`):
   - Uses AWS Cognito `UserSub` (globally unique identifier)
   - Stored as `userId` in DynamoDB
   - Returned to frontend as `user.id`

2. **OAuth Signup** (Google/Apple) (`backend/src/handlers/oauth.ts`):
   - Uses `uuidv4()` (UUID version 4)
   - Collision probability: ~5.3×10^-37 for 1 UUID
   - Stored as `userId` in DynamoDB
   - Returned to frontend as `user.id`

**Result**: User IDs are automatically unique - no manual intervention needed.

### Validation
To validate existing user IDs in the database:
```bash
cd backend
npm run build
ts-node scripts/validateIds.ts
```

## Entity IDs

### Generation

Currently, entities are created via the seed script with manually assigned IDs. 

**Seed Script** (`backend/scripts/seed.ts`):
- Entities are defined with explicit `entityId` values (e.g., 10, 11, 12...)
- Validation runs before seeding to ensure uniqueness
- If duplicates are found, seeding fails with an error

**Future Entity Creation**:
If you need to create entities programmatically in the future, use:
```typescript
import { getNextEntityId } from '../utils/idGenerator';

const newEntityId = await getNextEntityId();
// Use newEntityId for the new entity
```

### Validation

**Before Seeding**:
The seed script automatically validates entity IDs before seeding:
```bash
cd backend
npm run build
npm run seed
```

If duplicate IDs are found, you'll see:
```
❌ ERROR: Duplicate entity IDs found: [13, 15, ...]
```

**Existing Database**:
To validate existing entity IDs in the database:
```bash
cd backend
npm run build
ts-node scripts/validateIds.ts
```

### Adding New Entities

When adding new entities to the seed script:

1. **Find the highest existing entityId**:
   ```typescript
   // In backend/scripts/seed.ts, find the highest entityId
   // Currently: 49
   ```

2. **Use the next available ID**:
   ```typescript
   { entityId: 50, ticker: 'NEW', name: 'New Entity', ... }
   ```

3. **Run validation**:
   The seed script will automatically validate uniqueness before seeding.

4. **If you need to check the database**:
   ```bash
   cd backend
   npm run build
   ts-node scripts/validateIds.ts
   ```

## Frontend Validation

The frontend includes validation checks to prevent API calls with invalid IDs:

### User ID Validation
- `src/utils/idValidation.ts`: `isValidUserId()` and `hasValidUserId()`
- Used in: `ProfileScreen`, `GroupDetailScreen`, `TradeModal`, `SocialContext`

### Entity ID Validation
- `src/utils/idValidation.ts`: `isValidEntityId()` and `hasValidEntityId()`
- Used in: `EntityScreen`, `TradeModal`, `NewsContext`

### Example Usage
```typescript
import { isValidUserId, isValidEntityId } from '../utils/idValidation';

// Before making API call
if (!isValidUserId(user.id)) {
  console.debug('Invalid userId');
  return;
}

if (!isValidEntityId(entityId)) {
  console.debug('Invalid entityId');
  return;
}
```

## Error Handling

The API client (`src/config/api.ts`) handles 400 Bad Request errors gracefully:
- 400 errors are returned silently (not logged as errors)
- Prevents console spam when IDs are invalid
- Frontend can handle the error response appropriately

## Summary

### Users ✅
- **Unique IDs**: Guaranteed by Cognito (UserSub) or UUID (OAuth)
- **Validation**: Automatic, no manual checks needed
- **New Users**: Automatically get unique IDs on signup

### Entities ✅
- **Unique IDs**: Validated before seeding
- **Validation**: Automatic in seed script, manual via `validateIds.ts`
- **New Entities**: Use `getNextEntityId()` or increment from highest existing ID

### Frontend ✅
- **Validation**: Checks IDs before API calls
- **Error Handling**: Graceful handling of invalid IDs
- **User Experience**: No crashes or error spam

## Troubleshooting

### "Invalid entityId" Error
1. Check that `entityId` is a positive number
2. Verify the entity exists in the database
3. Check that the validation is being called before the API request

### "Missing userId" Error
1. Check that user is logged in (`user` is not null)
2. Verify `user.id` exists and is a non-empty string
3. Check that the validation is being called before the API request

### Duplicate ID Errors
1. Run the validation script: `ts-node scripts/validateIds.ts`
2. Check the seed script for duplicate entity IDs
3. Ensure new entities use `getNextEntityId()` or increment from highest ID
