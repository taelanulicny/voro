import { containsSlurs, containsSpam, moderateContent, sanitizeContent } from '../../utils/contentModeration';

describe('Content Moderation Utils', () => {
  describe('containsSlurs', () => {
    it('should return false for clean content', () => {
      expect(containsSlurs('Hello world')).toBe(false);
      expect(containsSlurs('This is a normal post')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(containsSlurs('')).toBe(false);
    });

    // Note: Actual slur testing would require adding slurs to the list
    // This test verifies the function works correctly
  });

  describe('containsSpam', () => {
    it('should detect multiple URLs', () => {
      const spam = 'Check out https://example.com and https://spam.com and https://ads.com';
      expect(containsSpam(spam)).toBe(true);
    });

    it('should detect repetitive spam words', () => {
      const spam = 'Buy now! Click here! Free offer! Limited time!';
      expect(containsSpam(spam)).toBe(true);
    });

    it('should detect all caps spam', () => {
      const spam = 'THIS IS ALL CAPS SPAM MESSAGE WITH MANY CHARACTERS';
      expect(containsSpam(spam)).toBe(true);
    });

    it('should return false for normal content', () => {
      expect(containsSpam('This is a normal post')).toBe(false);
      expect(containsSpam('Check out https://example.com')).toBe(false);
    });
  });

  describe('moderateContent', () => {
    it('should approve clean content', () => {
      const result = moderateContent('This is a clean post');
      expect(result.approved).toBe(true);
      expect(result.filteredContent).toBe('This is a clean post');
    });

    it('should reject empty content', () => {
      const result = moderateContent('');
      expect(result.approved).toBe(false);
      expect(result.reason).toBe('Content cannot be empty');
    });

    it('should reject whitespace-only content', () => {
      const result = moderateContent('   ');
      expect(result.approved).toBe(false);
      expect(result.reason).toBe('Content cannot be empty');
    });

    it('should reject content exceeding length limit', () => {
      const longContent = 'a'.repeat(5001);
      const result = moderateContent(longContent);
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('exceeds maximum length');
    });

    it('should trim content', () => {
      const result = moderateContent('  Hello World  ');
      expect(result.approved).toBe(true);
      expect(result.filteredContent).toBe('Hello World');
    });
  });

  describe('sanitizeContent', () => {
    it('should remove excessive whitespace', () => {
      const result = sanitizeContent('Hello    World');
      expect(result).toBe('Hello World');
    });

    it('should limit consecutive line breaks', () => {
      const result = sanitizeContent('Line 1\n\n\n\nLine 2');
      expect(result).toBe('Line 1\n\nLine 2');
    });

    it('should trim content', () => {
      const result = sanitizeContent('  Hello World  ');
      expect(result).toBe('Hello World');
    });

    it('should handle normal content', () => {
      const result = sanitizeContent('This is normal content');
      expect(result).toBe('This is normal content');
    });
  });
});

