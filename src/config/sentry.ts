/**
 * Sentry Crash Reporting Configuration
 *
 * Initializes Sentry for error tracking and crash reporting in production/beta builds.
 */

import * as Sentry from '@sentry/react-native';
import { isFeatureEnabled } from './featureFlags';

// Environment configuration
// In production, set SENTRY_DSN in your environment variables or EAS secrets
const SENTRY_DSN = process.env.SENTRY_DSN || '';

// Check if Sentry should be initialized
const shouldInitializeSentry = (): boolean => {
  // Don't initialize in development
  if (__DEV__) {
    console.log('[Sentry] Disabled in development mode');
    return false;
  }

  // Check if DSN is configured
  if (!SENTRY_DSN || SENTRY_DSN === '') {
    console.warn('[Sentry] No DSN configured. Crash reporting is disabled.');
    return false;
  }

  return true;
};

/**
 * Initialize Sentry
 * Call this on app startup
 */
export const initializeSentry = async (): Promise<void> => {
  if (!shouldInitializeSentry()) {
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,

      // Set sample rate for performance monitoring
      // 1.0 = 100% of transactions are sent
      // Reduce this in production to save quota
      tracesSampleRate: __DEV__ ? 0 : 0.2,

      // Enable automatic session tracking
      enableAutoSessionTracking: true,

      // Session timeout in milliseconds (default: 30 seconds)
      sessionTrackingIntervalMillis: 30000,

      // Environment tag
      environment: __DEV__ ? 'development' : 'production',

      // App version (get from package.json or app.json)
      // You can update this dynamically
      // release: 'moro-mobile@1.0.0',

      // Breadcrumbs for debugging context
      maxBreadcrumbs: 50,

      // Attach stack trace to messages
      attachStacktrace: true,

      // Enable native crash handling
      enableNative: true,

      // Enable auto performance monitoring
      enableAutoPerformanceTracing: true,

      // Before send hook - filter out sensitive data
      beforeSend(event, hint) {
        // Filter out personal information
        if (event.user) {
          delete event.user.email;
          delete event.user.username;
        }

        // Filter out sensitive request data
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers['Authorization'];
            delete event.request.headers['Cookie'];
          }
        }

        return event;
      },

      // Before breadcrumb hook - filter sensitive breadcrumbs
      beforeBreadcrumb(breadcrumb, hint) {
        // Don't log console.log breadcrumbs in production
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null;
        }

        // Filter sensitive data from breadcrumbs
        if (breadcrumb.data) {
          delete breadcrumb.data.password;
          delete breadcrumb.data.token;
          delete breadcrumb.data.apiKey;
        }

        return breadcrumb;
      },
    });

    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
};

/**
 * Capture an exception manually
 */
export const captureException = (error: Error, context?: Record<string, any>): void => {
  if (!shouldInitializeSentry()) {
    console.error('[Sentry] Exception (not sent):', error, context);
    return;
  }

  if (context) {
    Sentry.captureException(error, { extra: context });
  } else {
    Sentry.captureException(error);
  }
};

/**
 * Capture a message manually
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void => {
  if (!shouldInitializeSentry()) {
    console.log('[Sentry] Message (not sent):', message, context);
    return;
  }

  if (context) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } else {
    Sentry.captureMessage(message, level);
  }
};

/**
 * Set user context for error tracking
 */
export const setUserContext = (userId: string): void => {
  if (!shouldInitializeSentry()) {
    return;
  }

  Sentry.setUser({
    id: userId,
    // Don't include PII like email or username
  });
};

/**
 * Clear user context (on logout)
 */
export const clearUserContext = (): void => {
  if (!shouldInitializeSentry()) {
    return;
  }

  Sentry.setUser(null);
};

/**
 * Add breadcrumb manually
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
): void => {
  if (!shouldInitializeSentry()) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
};

/**
 * Wrap a function to catch errors
 */
export const wrapErrorHandler = <T extends (...args: any[]) => any>(
  fn: T,
  errorMessage?: string
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureException(error, {
            context: errorMessage || 'Wrapped function error',
            args,
          });
          throw error;
        });
      }
      return result;
    } catch (error) {
      captureException(error as Error, {
        context: errorMessage || 'Wrapped function error',
        args,
      });
      throw error;
    }
  }) as T;
};

// Export Sentry for advanced usage
export { Sentry };
