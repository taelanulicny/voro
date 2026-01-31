/**
 * Content moderation utilities
 * Focused on blocking slurs while allowing general profanity
 *
 * PRODUCTION RECOMMENDATION:
 * For comprehensive content moderation, integrate an external service:
 * - Google Perspective API (toxicity, profanity, threats)
 * - AWS Comprehend (toxicity detection)
 * - Azure Content Moderator
 * - OpenAI Moderation API
 */

// Slur list - offensive slurs that target protected groups
// Add actual slurs you want to block here (using lowercase)
// Note: Using word boundaries to match whole words only
// IMPORTANT: For production, populate this list or use an external moderation service
const SLURS = [
  // TODO: Populate with appropriate content filters for your use case
  // Consider using a comprehensive list from:
  // - https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
  // - Or integrate external moderation API

  // Example patterns (non-offensive placeholders for demonstration):
  // Add actual words based on your community guidelines
];

// Spam patterns
const SPAM_PATTERNS = [
  /(https?:\/\/[^\s]+){3,}/gi, // Multiple URLs
  /(buy|sell|click|free|limited|offer)[\s\S]{0,50}(buy|sell|click|free|limited|offer)/gi, // Repetitive spam words
  /[A-Z]{20,}/, // All caps spam
  /(.)\1{10,}/, // Character repeated 10+ times (e.g., "aaaaaaaaaa")
  /🚀{5,}/, // Excessive emoji spam
];

/**
 * Normalize text to handle l33t speak and obfuscation attempts
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();

  // Common l33t speak substitutions
  const leetMap: Record<string, string> = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '8': 'b',
    '@': 'a',
    '$': 's',
    '!': 'i',
    '+': 't',
    '|': 'i',
  };

  // Replace l33t characters
  for (const [leet, normal] of Object.entries(leetMap)) {
    normalized = normalized.split(leet).join(normal);
  }

  // Remove common obfuscation characters
  normalized = normalized.replace(/[\*_\-\.\s]+/g, '');

  return normalized;
}

/**
 * Check if content contains slurs
 */
export function containsSlurs(text: string): boolean {
  // Normalize text to handle l33t speak and obfuscation
  const normalizedText = normalizeText(text);
  const lowerText = text.toLowerCase();

  // Check against slur list (using word boundaries)
  for (const slur of SLURS) {
    const slurLower = slur.toLowerCase();
    // Match slur as whole word to avoid false positives
    const regex = new RegExp(`\\b${slurLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

    // Check both original and normalized text
    if (regex.test(lowerText) || normalizedText.includes(slurLower)) {
      return true;
    }
  }

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

