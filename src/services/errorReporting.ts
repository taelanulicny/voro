/**
 * Error Reporting Service
 *
 * Centralized error reporting integrated with Sentry for crash tracking.
 */

import { ErrorInfo } from 'react';
import { captureException, captureMessage, addBreadcrumb as sentryAddBreadcrumb, setUserContext as sentrySetUserContext } from '../config/sentry';

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
   * Sentry is initialized in App.tsx before this is called
   */
  init(): void {
    if (this.isInitialized) {
      return;
    }

    console.log('[ErrorReporting] Initialized');

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
    if (userId) {
      sentrySetUserContext(userId);
    }

    if (__DEV__) {
      console.log('[ErrorReporting] User context set:', { userId, userData });
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void {
    sentryAddBreadcrumb(message, category || 'app', 'info', data);

    if (__DEV__) {
      console.log('[ErrorReporting] Breadcrumb:', { message, category, data });
    }
  }

  /**
   * Send error to reporting service
   */
  private sendError(report: ErrorReport): void {
    // In development, log to console
    if (__DEV__) {
      console.error('[ErrorReporting] Error reported:', {
        message: report.error.message,
        stack: report.error.stack,
        componentStack: report.errorInfo?.componentStack,
        context: report.context,
      });
    }

    // Send to Sentry
    const context = {
      ...report.context,
      componentStack: report.errorInfo?.componentStack,
      timestamp: report.timestamp,
      userAgent: report.userAgent,
      url: report.url,
    };

    captureException(report.error, context);
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


