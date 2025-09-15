/**
 * Structured logging utility
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

interface LogEntry {
    timestamp: string;
    level: keyof typeof LogLevel;
    message: string;
    data?: Record<string, any>;
}

class Logger {
    private currentLevel: LogLevel;

    constructor(level: LogLevel = LogLevel.INFO) {
        this.currentLevel = level;
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.currentLevel;
    }

    private formatLog(level: keyof typeof LogLevel, message: string, data?: Record<string, any>): string {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...(data && { data })
        };

        return JSON.stringify(entry);
    }

    private log(level: LogLevel, levelName: keyof typeof LogLevel, message: string, data?: Record<string, any>): void {
        if (!this.shouldLog(level)) return;

        const logMessage = this.formatLog(levelName, message, data);

        switch (level) {
            case LogLevel.ERROR:
                console.error(logMessage);
                break;
            case LogLevel.WARN:
                console.warn(logMessage);
                break;
            case LogLevel.DEBUG:
                console.debug(logMessage);
                break;
            default:
                console.log(logMessage);
        }
    }

    debug(message: string, data?: Record<string, any>): void {
        this.log(LogLevel.DEBUG, 'DEBUG', message, data);
    }

    info(message: string, data?: Record<string, any>): void {
        this.log(LogLevel.INFO, 'INFO', message, data);
    }

    warn(message: string, data?: Record<string, any>): void {
        this.log(LogLevel.WARN, 'WARN', message, data);
    }

    error(message: string, error?: Error | Record<string, any>): void {
        const data = error instanceof Error
            ? { error: error.message, stack: error.stack }
            : error;
        this.log(LogLevel.ERROR, 'ERROR', message, data);
    }

    setLevel(level: LogLevel): void {
        this.currentLevel = level;
    }
}

// Export singleton logger instance
export const logger = new Logger(
    process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);