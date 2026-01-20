/**
 * Category utilities
 */

// All valid category names in the app
export const ALL_CATEGORIES = [
  'People',
  'Teams',
  'Actors',
  'NBA Players',
  'NFL Players',
  'Soccer Players',
  'Influencers',
  'Political Figures',
  'NFL Teams',
  'NBA Teams',
  'College Basketball Teams',
  'Rap Music',
  'Country Music',
  'Pop Music',
] as const;

export type CategoryName = typeof ALL_CATEGORIES[number];

/**
 * Get all category names
 */
export function getAllCategories(): string[] {
  return [...ALL_CATEGORIES];
}

/**
 * Get category by mention name (case-insensitive, handles spaces)
 * Converts "@Influencers" or "@influencers" to "Influencers"
 */
export function getCategoryByMention(mentionName: string): string | undefined {
  const cleanedMention = mentionName.trim();
  return ALL_CATEGORIES.find(category => {
    // Remove spaces for comparison: "NBA Players" matches "@NBAPlayers"
    const categoryMention = category.replace(/\s+/g, '');
    return categoryMention.toLowerCase() === cleanedMention.toLowerCase();
  });
}

/**
 * Extract category mentions from text
 * Returns array of category names that are mentioned
 */
export function extractCategoryMentions(text: string): string[] {
  const mentionedCategories: string[] = [];
  const mentionRegex = /@([\p{L}\p{N}.'-]+)/gu;
  const seenCategories = new Set<string>();
  
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionName = match[1];
    const category = getCategoryByMention(mentionName);
    if (category && !seenCategories.has(category)) {
      mentionedCategories.push(category);
      seenCategories.add(category);
    }
  }
  
  return mentionedCategories;
}
