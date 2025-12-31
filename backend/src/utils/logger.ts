/**
 * Structured logging utility with sensitive data redaction
 * 
 * This logger automatically redacts sensitive information like:
 * - Authorization tokens
 * - Passwords
 * - API keys
 * - Other PII
 */

// Patterns to redact from logs
const REDACT_PATTERNS = [
  // Authorization headers
  /Authorization:\s*Bearer\s+[^\s"']+/gi,
  /Authorization:\s*[^\s"']+/gi,
  // Passwords in various formats
  /password["\s:]+[^,}\s"']+/gi,
  /pwd["\s:]+[^,}\s"']+/gi,
  /pass["\s:]+[^,}\s"']+/gi,
  // Tokens
  /token["\s:]+[^,}\s"']+/gi,
  /accessToken["\s:]+[^,}\s"']+/gi,
  /refreshToken["\s:]+[^,}\s"']+/gi,
  /idToken["\s:]+[^,}\s"']+/gi,
  /identityToken["\s:]+[^,}\s"']+/gi,
  // API keys
  /api[_-]?key["\s:]+[^,}\s"']+/gi,
  /apikey["\s:]+[^,}\s"']+/gi,
  // JWT tokens (standalone)
  /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
  // Secrets
  /secret["\s:]+[^,}\s"']+/gi,
  /jwt[_-]?secret["\s:]+[^,}\s"']+/gi,
  // Email addresses (optional - can be removed if needed for debugging)
  // /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
];

/**
 * Sanitize an object or string for logging by redacting sensitive patterns
 */
export function sanitizeForLogging(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // If it's a string, redact directly
  if (typeof data === 'string') {
    let sanitized = data;
    for (const pattern of REDACT_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
  }

  // If it's an Error object, sanitize the message and stack
  if (data instanceof Error) {
    let message = data.message;
    let stack = data.stack;
    
    for (const pattern of REDACT_PATTERNS) {
      message = message.replace(pattern, '[REDACTED]');
      if (stack) {
        stack = stack.replace(pattern, '[REDACTED]');
      }
    }
    
    return {
      name: data.name,
      message,
      stack,
      ...(data.cause && { cause: sanitizeForLogging(data.cause) }),
    };
  }

  // If it's an object or array, stringify, redact, then parse back
  try {
    const str = JSON.stringify(data);
    let sanitized = str;
    
    for (const pattern of REDACT_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    
    return JSON.parse(sanitized);
  } catch (error) {
    // If JSON stringify/parse fails, return string representation
    const str = String(data);
    let sanitized = str;
    for (const pattern of REDACT_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
  }
}

/**
 * Structured logger with automatic redaction
 */
export const logger = {
  /**
   * Log informational message
   */
  info: (message: string, data?: any): void => {
    if (data !== undefined) {
      console.log(`[INFO] ${message}`, sanitizeForLogging(data));
    } else {
      console.log(`[INFO] ${message}`);
    }
  },

  /**
   * Log error message
   */
  error: (message: string, error?: any): void => {
    if (error !== undefined) {
      console.error(`[ERROR] ${message}`, sanitizeForLogging(error));
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },

  /**
   * Log warning message
   */
  warn: (message: string, data?: any): void => {
    if (data !== undefined) {
      console.warn(`[WARN] ${message}`, sanitizeForLogging(data));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  /**
   * Log debug message (only in development)
   */
  debug: (message: string, data?: any): void => {
    // Only log debug messages in development
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      if (data !== undefined) {
        console.log(`[DEBUG] ${message}`, sanitizeForLogging(data));
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  },
};

