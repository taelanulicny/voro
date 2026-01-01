/**
 * Input sanitization utilities
 * Prevents XSS attacks and cleans user input
 */

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Strip HTML tags from text
 */
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize user input for display
 * Removes HTML tags and escapes special characters
 */
export function sanitizeInput(text: string): string {
  // First strip HTML tags
  let sanitized = stripHtmlTags(text);
  // Then escape remaining special characters
  sanitized = escapeHtml(sanitized);
  return sanitized;
}

/**
 * Sanitize content before sending to backend
 * Removes HTML but preserves mentions and basic formatting
 */
export function sanitizeContentForSubmission(text: string): string {
  // Remove script tags and event handlers
  let sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');
  
  // Remove other potentially dangerous tags but preserve basic formatting
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object[^>]*>.*?<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed[^>]*>.*?<\/embed>/gi, '');
  
  // Trim whitespace
  return sanitized.trim();
}

