import { escapeHtml, stripHtmlTags, sanitizeInput, sanitizeContentForSubmission } from '../../utils/sanitize';

describe('Sanitize Utils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtml('Hello & World')).toBe('Hello &amp; World');
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escapeHtml("It's a test")).toBe('It&#039;s a test');
    });

    it('should handle text without special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('stripHtmlTags', () => {
    it('should strip HTML tags', () => {
      expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello');
      expect(stripHtmlTags('<div>Test</div>')).toBe('Test');
      expect(stripHtmlTags('<a href="#">Link</a>')).toBe('Link');
    });

    it('should handle nested tags', () => {
      expect(stripHtmlTags('<div><p>Nested</p></div>')).toBe('Nested');
    });

    it('should handle text without tags', () => {
      expect(stripHtmlTags('Plain text')).toBe('Plain text');
    });

    it('should handle empty string', () => {
      expect(stripHtmlTags('')).toBe('');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize input by stripping tags and escaping', () => {
      const result = sanitizeInput('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle plain text', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
    });

    it('should handle text with special characters', () => {
      expect(sanitizeInput('Price: $100 & <50%')).toBe('Price: $100 &amp; &lt;50%');
    });
  });

  describe('sanitizeContentForSubmission', () => {
    it('should remove script tags', () => {
      const result = sanitizeContentForSubmission('<script>alert("xss")</script>Hello');
      expect(result).toBe('Hello');
    });

    it('should remove event handlers', () => {
      const result = sanitizeContentForSubmission('<div onclick="alert(1)">Test</div>');
      expect(result).not.toContain('onclick');
    });

    it('should remove iframe tags', () => {
      const result = sanitizeContentForSubmission('<iframe src="evil.com"></iframe>Content');
      expect(result).toBe('Content');
    });

    it('should remove object tags', () => {
      const result = sanitizeContentForSubmission('<object data="evil.swf"></object>Content');
      expect(result).toBe('Content');
    });

    it('should remove embed tags', () => {
      const result = sanitizeContentForSubmission('<embed src="evil.swf"></embed>Content');
      expect(result).toBe('Content');
    });

    it('should trim whitespace', () => {
      expect(sanitizeContentForSubmission('  Hello World  ')).toBe('Hello World');
    });

    it('should preserve basic formatting', () => {
      const result = sanitizeContentForSubmission('<p>Hello</p><br>World');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });
  });
});

