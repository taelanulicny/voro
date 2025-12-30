/**
 * Server-side content moderation
 * Focused on blocking slurs while allowing general profanity
 */

// Slur list - offensive slurs that target protected groups
// Add actual slurs you want to block here (using lowercase)
// Note: Using word boundaries to match whole words only
// In production, consider using AWS Comprehend or a comprehensive moderation library
const SLURS: string[] = [
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
  /(buy|sell|click|free|limited|offer)[\s\S]{0,50}(buy|sell|click|free|limited|offer)/gi, // Repetitive spam
  /[A-Z]{20,}/, // All caps spam
  /(.)\1{10,}/, // Repeated characters (e.g., "aaaaaaaaaa")
];

/**
 * Moderate content on server side
 */
export function moderateContent(content: string): {
  approved: boolean;
  reason?: string;
  filteredContent?: string;
} {
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

  // Check for slurs (using word boundaries to catch full words)
  const lowerContent = content.toLowerCase();
  for (const slur of SLURS) {
    // Use word boundary regex to match whole words, not substrings
    const slurLower = slur.toLowerCase();
    // Match slur as whole word (handles common variations)
    const regex = new RegExp(`\\b${slurLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(content)) {
      return {
        approved: false,
        reason: 'Content contains offensive slurs. Please revise your post.',
      };
    }
  }

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      return {
        approved: false,
        reason: 'Content appears to be spam',
      };
    }
  }

  // Check for excessive mentions (potential spam)
  const mentionCount = (content.match(/@\w+/g) || []).length;
  if (mentionCount > 10) {
    return {
      approved: false,
      reason: 'Too many mentions in post',
    };
  }

  // Check for excessive URLs
  const urlCount = (content.match(/https?:\/\/[^\s]+/gi) || []).length;
  if (urlCount > 3) {
    return {
      approved: false,
      reason: 'Too many links in post',
    };
  }

  return {
    approved: true,
    filteredContent: content.trim(),
  };
}

/**
 * Future: Integrate with AWS Comprehend for advanced moderation
 * This would detect:
 * - Toxicity
 * - Hate speech
 * - Harassment
 * - Personal information (PII)
 */
export async function moderateWithComprehend(content: string): Promise<{
  approved: boolean;
  reason?: string;
  scores?: {
    toxicity?: number;
    hate?: number;
    harassment?: number;
  };
}> {
  // TODO: Integrate AWS Comprehend Content Moderation
  // For now, return basic moderation result
  const basicModeration = moderateContent(content);
  return {
    approved: basicModeration.approved,
    reason: basicModeration.reason,
  };
}

