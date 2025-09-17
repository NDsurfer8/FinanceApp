/**
 * Centralized logging utility with proper log levels
 * Follows best practices for production logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;

    if (context) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }
    return `${prefix} ${message}`;
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage("DEBUG", `🔍 ${message}`, context));
    }
  }

  info(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage("INFO", `ℹ️ ${message}`, context));
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage("WARN", `⚠️ ${message}`, context));
    }
  }

  error(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage("ERROR", `❌ ${message}`, context));
    }
  }

  // Specialized logging for bank connections
  bankConnection(message: string, context?: any): void {
    this.debug(`[BANK] ${message}`, context);
  }

  encryption(message: string, context?: any): void {
    this.debug(`[ENCRYPTION] ${message}`, context);
  }

  webhook(message: string, context?: any): void {
    this.info(`[WEBHOOK] ${message}`, context);
  }
}

export const logger = Logger.getInstance();
