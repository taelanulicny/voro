import {
  isValidUserId,
  isValidEntityId,
  hasValidUserId,
  hasValidEntityId,
  assertValidUserId,
  assertValidEntityId,
} from '../../utils/idValidation';

describe('ID Validation Utils', () => {
  describe('isValidUserId', () => {
    it('should return true for valid user ID', () => {
      expect(isValidUserId('user-123')).toBe(true);
      expect(isValidUserId('abc123')).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidUserId(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidUserId(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidUserId('')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      expect(isValidUserId('   ')).toBe(false);
    });

    it('should return false for non-string', () => {
      expect(isValidUserId(123 as any)).toBe(false);
      expect(isValidUserId({} as any)).toBe(false);
    });
  });

  describe('isValidEntityId', () => {
    it('should return true for valid entity ID', () => {
      expect(isValidEntityId(1)).toBe(true);
      expect(isValidEntityId(100)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidEntityId(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidEntityId(undefined)).toBe(false);
    });

    it('should return false for zero', () => {
      expect(isValidEntityId(0)).toBe(false);
    });

    it('should return false for negative number', () => {
      expect(isValidEntityId(-1)).toBe(false);
    });

    it('should return false for float', () => {
      expect(isValidEntityId(1.5)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(isValidEntityId(NaN)).toBe(false);
    });
  });

  describe('hasValidUserId', () => {
    it('should return true for user with valid ID', () => {
      expect(hasValidUserId({ id: 'user-123' })).toBe(true);
    });

    it('should return false for null', () => {
      expect(hasValidUserId(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasValidUserId(undefined)).toBe(false);
    });

    it('should return false for user without ID', () => {
      expect(hasValidUserId({})).toBe(false);
    });

    it('should return false for user with invalid ID', () => {
      expect(hasValidUserId({ id: '' })).toBe(false);
      expect(hasValidUserId({ id: null as any })).toBe(false);
    });
  });

  describe('hasValidEntityId', () => {
    it('should return true for entity with valid ID', () => {
      expect(hasValidEntityId({ id: 1 })).toBe(true);
    });

    it('should return false for null', () => {
      expect(hasValidEntityId(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasValidEntityId(undefined)).toBe(false);
    });

    it('should return false for entity without ID', () => {
      expect(hasValidEntityId({})).toBe(false);
    });

    it('should return false for entity with invalid ID', () => {
      expect(hasValidEntityId({ id: 0 })).toBe(false);
      expect(hasValidEntityId({ id: -1 })).toBe(false);
    });
  });

  describe('assertValidUserId', () => {
    it('should not throw for valid user ID', () => {
      expect(() => assertValidUserId('user-123')).not.toThrow();
    });

    it('should throw for null', () => {
      expect(() => assertValidUserId(null)).toThrow('Invalid user ID');
    });

    it('should throw for undefined', () => {
      expect(() => assertValidUserId(undefined)).toThrow('Invalid user ID');
    });

    it('should include context in error message', () => {
      expect(() => assertValidUserId(null, 'test context')).toThrow('test context');
    });
  });

  describe('assertValidEntityId', () => {
    it('should not throw for valid entity ID', () => {
      expect(() => assertValidEntityId(1)).not.toThrow();
    });

    it('should throw for null', () => {
      expect(() => assertValidEntityId(null)).toThrow('Invalid entity ID');
    });

    it('should throw for undefined', () => {
      expect(() => assertValidEntityId(undefined)).toThrow('Invalid entity ID');
    });

    it('should throw for zero', () => {
      expect(() => assertValidEntityId(0)).toThrow('Invalid entity ID');
    });

    it('should include context in error message', () => {
      expect(() => assertValidEntityId(null, 'test context')).toThrow('test context');
    });
  });
});

