/**
 * Logging Service
 * 
 * Centralized logging service that replaces console.* calls with proper log levels.
 * In production builds, logs can be stripped using babel plugins or build-time replacement.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

class Logger {
  private currentLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    // In development, show all logs. In production, only show WARN and ERROR by default
    this.isProduction = !__DEV__;
    this.currentLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.currentLevel;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
    if (args.length === 0) {
      return `${prefix} ${message}`;
    }
    
    return `${prefix} ${message}`;
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    if (this.isProduction) {
      // In production, debug logs are completely stripped
      return;
    }
    
    const formatted = this.formatMessage('DEBUG', message, ...args);
    if (args.length > 0) {
      console.debug(formatted, ...args);
    } else {
      console.debug(formatted);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const formatted = this.formatMessage('INFO', message, ...args);
    if (args.length > 0) {
      console.info(formatted, ...args);
    } else {
      console.info(formatted);
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const formatted = this.formatMessage('WARN', message, ...args);
    if (args.length > 0) {
      console.warn(formatted, ...args);
    } else {
      console.warn(formatted);
    }
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const formatted = this.formatMessage('ERROR', message, ...args);
    
    if (error instanceof Error) {
      console.error(formatted, error, ...args);
      if (error.stack && __DEV__) {
        console.error('Stack trace:', error.stack);
      }
    } else if (error !== undefined) {
      console.error(formatted, error, ...args);
    } else if (args.length > 0) {
      console.error(formatted, ...args);
    } else {
      console.error(formatted);
    }
  }

  /**
   * Log with a specific level
   */
  log(level: LogLevel, message: string, ...args: any[]): void {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(message, ...args);
        break;
      case LogLevel.INFO:
        this.info(message, ...args);
        break;
      case LogLevel.WARN:
        this.warn(message, ...args);
        break;
      case LogLevel.ERROR:
        this.error(message, ...args);
        break;
      default:
        // NONE or unknown level - don't log
        break;
    }
  }

  /**
   * Group related logs together (development only)
   */
  group(label: string): void {
    if (__DEV__ && this.shouldLog(LogLevel.DEBUG)) {
      console.group(label);
    }
  }

  /**
   * End a log group (development only)
   */
  groupEnd(): void {
    if (__DEV__ && this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd();
    }
  }

  /**
   * Log a table (development only)
   */
  table(data: any): void {
    if (__DEV__ && this.shouldLog(LogLevel.DEBUG)) {
      console.table(data);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logDebug = (message: string, ...args: any[]) => logger.debug(message, ...args);
export const logInfo = (message: string, ...args: any[]) => logger.info(message, ...args);
export const logWarn = (message: string, ...args: any[]) => logger.warn(message, ...args);
export const logError = (message: string, error?: Error | unknown, ...args: any[]) => logger.error(message, error, ...args);

/**
 * Initialize logger with environment-specific settings
 */
export function initLogger(): void {
  // In production, you might want to set a higher log level
  // or configure remote logging
  if (__DEV__) {
    logger.setLevel(LogLevel.DEBUG);
  } else {
    // In production, only log warnings and errors
    logger.setLevel(LogLevel.WARN);
  }
}


