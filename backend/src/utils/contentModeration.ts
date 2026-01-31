/**
 * Server-side content moderation
 *
 * This module provides two-tier content moderation:
 *
 * 1. Basic keyword filtering (moderateContent) - Fast, no API cost
 *    - Checks for explicit slurs from a keyword list
 *    - Validates length, spam patterns, excessive mentions/URLs
 *    - Used as a first pass before Comprehend
 *
 * 2. AI-powered moderation (moderateWithComprehend) - Comprehensive, AWS cost
 *    - Uses AWS Comprehend Toxicity Detection
 *    - Detects: toxicity, hate speech, harassment, threats, profanity
 *    - Provides confidence scores for each category
 *    - Recommended for production use
 *
 * USAGE:
 * - For new posts/comments: Use moderateWithComprehend() for comprehensive protection
 * - For high-volume scenarios: Use moderateContent() for basic filtering
 *
 * CUSTOMIZATION:
 * To add custom keyword filtering, populate the SLURS array below with terms from:
 * - https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
 * - Or other community-maintained profanity lists
 * - Or your own community guidelines
 */

import { ComprehendClient, DetectToxicContentCommand } from '@aws-sdk/client-comprehend';
import { logger } from './logger';

// Initialize Comprehend client for AI-powered moderation
const comprehendClient = new ComprehendClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Keyword-based filter (optional supplement to AI moderation)
 *
 * This list is intentionally minimal because AWS Comprehend provides
 * comprehensive AI-powered toxicity detection. Populate this only if:
 * 1. You have specific terms not caught by Comprehend
 * 2. You want instant blocking without API calls
 * 3. You need offline moderation capability
 *
 * Categories to consider:
 * - Racial/ethnic slurs
 * - Homophobic/transphobic slurs
 * - Ableist slurs
 * - Religious slurs
 * - Gender-based slurs
 * - Platform-specific banned terms
 */
const SLURS: string[] = [
  // Add terms here based on your content policy
  // Format: lowercase words
  // Example: 'term1', 'term2', etc.
  //
  // Note: AWS Comprehend (used in moderateWithComprehend) provides
  // comprehensive detection, so this list can be minimal
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
 * Moderate content using AWS Comprehend for advanced toxicity detection
 * This detects:
 * - Toxicity
 * - Hate speech
 * - Harassment
 * - Threats
 * - Profanity
 */
export async function moderateWithComprehend(content: string): Promise<{
  approved: boolean;
  reason?: string;
  scores?: {
    toxicity?: number;
    hate?: number;
    harassment?: number;
    threats?: number;
    profanity?: number;
  };
}> {
  // First, run basic word list moderation (fast, no API cost)
  const basicModeration = moderateContent(content);
  if (!basicModeration.approved) {
    return {
      approved: false,
      reason: basicModeration.reason,
    };
  }

  // Then, use AWS Comprehend for advanced detection
  try {
    // Comprehend has a 1KB limit per text segment, so we may need to chunk longer content
    const maxLength = 1000;
    const textToAnalyze = content.length > maxLength ? content.substring(0, maxLength) : content;

    const command = new DetectToxicContentCommand({
      TextSegments: [{ Text: textToAnalyze }],
      LanguageCode: 'en',
    });

    const result = await comprehendClient.send(command);

    // Check if any toxic labels exceed threshold (0.7 = 70% confidence)
    const TOXICITY_THRESHOLD = 0.7;
    const toxicLabels = result.ResultList?.[0]?.Labels || [];
    
    const scores: {
      toxicity?: number;
      hate?: number;
      harassment?: number;
      threats?: number;
      profanity?: number;
    } = {};

    let isToxic = false;
    let highestScore = 0;
    let toxicReason = '';

    for (const label of toxicLabels) {
      const score = label.Score || 0;
      const labelName = label.Name?.toLowerCase() || '';

      // Map Comprehend labels to our score structure
      if (labelName.includes('toxic')) {
        scores.toxicity = score;
      } else if (labelName.includes('hate')) {
        scores.hate = score;
      } else if (labelName.includes('harassment')) {
        scores.harassment = score;
      } else if (labelName.includes('threat')) {
        scores.threats = score;
      } else if (labelName.includes('profanity')) {
        scores.profanity = score;
      }

      // Check if any label exceeds threshold
      if (score > TOXICITY_THRESHOLD) {
        isToxic = true;
        if (score > highestScore) {
          highestScore = score;
          toxicReason = labelName;
        }
      }
    }

    if (isToxic) {
      return {
        approved: false,
        reason: `Content detected as ${toxicReason} (${(highestScore * 100).toFixed(1)}% confidence). Please revise your post.`,
        scores,
      };
    }

    return {
      approved: true,
      scores,
    };
  } catch (error: any) {
    // If Comprehend fails, fall back to basic moderation result
    // Log error but don't block content (fail open for availability)
    logger.error('AWS Comprehend moderation error', error);
    
    // Return basic moderation result as fallback
    return {
      approved: basicModeration.approved,
      reason: basicModeration.reason,
    };
  }
}

