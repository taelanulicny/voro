/**
 * Error Reporting Service
 * 
 * Centralized error reporting integrated with Sentry for production.
 * Falls back to console logging in development.
 */

import { ErrorInfo } from 'react';

// Try to import Sentry (will be undefined if not installed)
let Sentry: any;
try {
  Sentry = require('@sentry/react-native');
} catch (e) {
  // Sentry not installed - will use console logging
}

export interface ErrorReport {
  error: Error;
  errorInfo?: ErrorInfo;
  context?: Record<string, any>;
  timestamp: number;
  userId?: string;
  userAgent?: string;
  url?: string;
}

class ErrorReportingService {
  private isInitialized = false;
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 50;

  /**
   * Initialize the error reporting service
   * Initializes Sentry in production if DSN is configured
   */
  init(): void {
    if (this.isInitialized) {
      return;
    }

    // Initialize Sentry if available and DSN is configured
    if (Sentry && process.env.EXPO_PUBLIC_SENTRY_DSN) {
      try {
        Sentry.init({
          dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
          environment: __DEV__ ? 'development' : 'production',
          enableInExpoDevelopment: false, // Disable in Expo Go
          debug: __DEV__,
          tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in prod
          beforeSend(event) {
            // Filter out sensitive data
            if (event.request) {
              delete event.request.cookies;
              if (event.request.headers) {
                delete event.request.headers.Authorization;
              }
            }
            return event;
          },
        });
        console.log('[ErrorReporting] Sentry initialized');
      } catch (error) {
        console.error('[ErrorReporting] Failed to initialize Sentry:', error);
      }
    } else if (__DEV__) {
      console.log('[ErrorReporting] Initialized (development mode - console only)');
    }

    this.isInitialized = true;
    this.flushQueue();
  }

  /**
   * Report an error
   */
  reportError(
    error: Error,
    errorInfo?: ErrorInfo,
    context?: Record<string, any>
  ): void {
    const report: ErrorReport = {
      error,
      errorInfo,
      context,
      timestamp: Date.now(),
      userAgent: this.getUserAgent(),
      url: this.getCurrentUrl(),
    };

    // Add to queue if not initialized yet
    if (!this.isInitialized) {
      this.errorQueue.push(report);
      if (this.errorQueue.length > this.maxQueueSize) {
        this.errorQueue.shift(); // Remove oldest
      }
      return;
    }

    this.sendError(report);
  }

  /**
   * Report an error with user context
   */
  setUserContext(userId?: string, userData?: Record<string, any>): void {
    if (Sentry && this.isInitialized) {
      try {
        Sentry.setUser({
          id: userId,
          ...userData,
        });
      } catch (error) {
        console.error('[ErrorReporting] Failed to set user context:', error);
      }
    }
    
    if (__DEV__) {
      console.log('[ErrorReporting] User context set:', { userId, userData });
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void {
    if (Sentry && this.isInitialized) {
      try {
        Sentry.addBreadcrumb({
          message,
          category: category || 'default',
          data,
          level: 'info',
        });
      } catch (error) {
        console.error('[ErrorReporting] Failed to add breadcrumb:', error);
      }
    }
    
    if (__DEV__) {
      console.log('[ErrorReporting] Breadcrumb:', { message, category, data });
    }
  }

  /**
   * Send error to reporting service
   */
  private sendError(report: ErrorReport): void {
    // Send to Sentry if available
    if (Sentry && this.isInitialized) {
      try {
        Sentry.captureException(report.error, {
          contexts: {
            react: report.errorInfo ? {
              componentStack: report.errorInfo.componentStack,
            } : undefined,
          },
          extra: report.context,
          tags: {
            source: report.errorInfo ? 'react' : 'javascript',
          },
        });
      } catch (error) {
        console.error('[ErrorReporting] Failed to send error to Sentry:', error);
      }
    }

    // Always log to console in development
    if (__DEV__) {
      console.error('[ErrorReporting] Error reported:', {
        message: report.error.message,
        stack: report.error.stack,
        componentStack: report.errorInfo?.componentStack,
        context: report.context,
      });
    }
  }

  /**
   * Flush queued errors
   */
  private flushQueue(): void {
    while (this.errorQueue.length > 0) {
      const report = this.errorQueue.shift();
      if (report) {
        this.sendError(report);
      }
    }
  }

  /**
   * Get user agent string
   */
  private getUserAgent(): string {
    // In React Native, you might want to use DeviceInfo
    return 'React Native';
  }

  /**
   * Get current URL/screen
   */
  private getCurrentUrl(): string | undefined {
    // In React Native, you might track the current screen/route
    return undefined;
  }
}

// Export singleton instance
export const errorReporting = new ErrorReportingService();

/**
 * Initialize error reporting on app startup
 */
export function initErrorReporting(): void {
  errorReporting.init();
}

/**
 * Helper function to report React component errors
 */
export function reportReactError(
  error: Error,
  errorInfo: ErrorInfo,
  context?: Record<string, any>
): void {
  errorReporting.reportError(error, errorInfo, context);
}

/**
 * Helper function to report non-React errors
 */
export function reportError(
  error: Error,
  context?: Record<string, any>
): void {
  errorReporting.reportError(error, undefined, context);
}


