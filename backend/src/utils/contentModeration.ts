/**
 * Server-side content moderation
 * Focused on blocking slurs while allowing general profanity
 */

import { ComprehendClient, DetectToxicContentCommand } from '@aws-sdk/client-comprehend';
import { logger } from './logger';

// Initialize Comprehend client
const comprehendClient = new ComprehendClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Slur list - offensive slurs that target protected groups
// IMPORTANT: Add actual slurs you want to block here (using lowercase)
// Note: Using word boundaries to match whole words only
// This list should be populated based on your content policy
// Categories to populate:
// - Racial/ethnic slurs
// - Homophobic slurs
// - Transphobic slurs
// - Ableist slurs
// - Religious slurs
// - Gender-based slurs
const SLURS: string[] = [
  // Populate with actual offensive terms per your content policy
  // Example structure (replace with actual terms):
  // 'term1',
  // 'term2',
  // Add terms here following your content moderation policy
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

