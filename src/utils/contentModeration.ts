/**
 * Content moderation utilities
 * Focused on blocking slurs while allowing general profanity
 */

// Slur list - offensive slurs that target protected groups
// Add actual slurs you want to block here (using lowercase)
// Note: Using word boundaries to match whole words only
// In production, consider using AWS Comprehend or a comprehensive moderation library
const SLURS = [
  // TODO: Add racial/ethnic slurs
  // TODO: Add homophobic slurs
  // TODO: Add transphobic slurs
  // TODO: Add ableist slurs
  // TODO: Add religious slurs
  // Example format (DO NOT include actual slurs in comments):
  // 'slur1',
  // 'slur2',
];

// Spam patterns
const SPAM_PATTERNS = [
  /(https?:\/\/[^\s]+){3,}/gi, // Multiple URLs
  /(buy|sell|click|free|limited|offer)[\s\S]{0,50}(buy|sell|click|free|limited|offer)/gi, // Repetitive spam words
  /[A-Z]{20,}/, // All caps spam
];

/**
 * Check if content contains slurs
 */
export function containsSlurs(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check against slur list (using word boundaries)
  for (const slur of SLURS) {
    const slurLower = slur.toLowerCase();
    // Match slur as whole word to avoid false positives
    const regex = new RegExp(`\\b${slurLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      return true;
    }
  }
  
  // Spam patterns are checked separately, not here
  return false;
}

/**
 * Check if content contains spam patterns
 */
export function containsSpam(text: string): boolean {
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Moderate content and return result
 */
export function moderateContent(content: string): {
  approved: boolean;
  reason?: string;
  filteredContent?: string;
} {
  // Check for empty content
  if (!content || content.trim().length === 0) {
    return {
      approved: false,
      reason: 'Content cannot be empty',
    };
  }

  // Check length
  if (content.length > 5000) {
    return {
      approved: false,
      reason: 'Content exceeds maximum length (5000 characters)',
    };
  }

  // Check for slurs
  if (containsSlurs(content)) {
    return {
      approved: false,
      reason: 'Content contains offensive slurs. Please revise your post.',
    };
  }

  // Check for spam patterns
  if (containsSpam(content)) {
    return {
      approved: false,
      reason: 'Content appears to be spam. Please revise your post.',
    };
  }

  // Additional checks can be added here
  // - Check for personal information (SSN, credit cards, etc.)
  // - Check for excessive mentions/spam
  // - Check for hate speech indicators

  return {
    approved: true,
    filteredContent: content.trim(),
  };
}

/**
 * Sanitize content while preserving valid formatting
 */
export function sanitizeContent(content: string): string {
  let sanitized = content;

  // Remove excessive whitespace but preserve intentional line breaks
  sanitized = sanitized.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n'); // More than 2 line breaks to 2

  // Trim
  return sanitized.trim();
}

