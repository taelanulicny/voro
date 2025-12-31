/**
 * Validate ID Uniqueness Script
 * Checks that all existing entities and users have unique IDs
 */

import { validateEntityIdsUniqueness, validateUserIdsUniqueness } from '../src/utils/idGenerator';

async function main() {
  console.log('🔍 Validating ID uniqueness...\n');

  try {
    // Validate entity IDs
    console.log('Checking entity IDs...');
    const entityValidation = await validateEntityIdsUniqueness();
    if (entityValidation.isValid) {
      console.log('✅ All entity IDs are unique');
    } else {
      console.error('❌ ERROR: Duplicate entity IDs found:', entityValidation.duplicates);
      process.exit(1);
    }

    // Validate user IDs
    console.log('\nChecking user IDs...');
    const userValidation = await validateUserIdsUniqueness();
    if (userValidation.isValid) {
      console.log('✅ All user IDs are unique');
    } else {
      console.error('❌ ERROR: Duplicate user IDs found:', userValidation.duplicates);
      process.exit(1);
    }

    console.log('\n✅ All IDs validated successfully!');
  } catch (error: any) {
    console.error('❌ Error validating IDs:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}


