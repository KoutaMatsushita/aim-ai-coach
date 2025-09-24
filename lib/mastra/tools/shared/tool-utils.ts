/**
 * Shared utilities for Mastra tools - Error handling, telemetry, and common patterns
 *
 * Provides consistent error handling, performance monitoring, and correlation tracking
 * across all AIM AI Coach tools for better observability and reliability.
 */

import {z} from "zod";
import {logger} from "../../logger";

// Tool execution context for correlation and tracing
export interface ToolExecutionContext {
    correlationId: string;
    userId: string | null;
    toolName: string;
    startTime: number;
}

// Standard error types for consistent handling
export enum ToolErrorType {
    USER_ERROR = "user_error",           // Missing userId, invalid input
    DATA_ERROR = "data_error",           // Database/external service issues
    BUSINESS_ERROR = "business_error",   // Insufficient data, confidence too low
    SYSTEM_ERROR = "system_error",       // Unexpected technical failures
}

export interface ToolError extends Error {
    type: ToolErrorType;
    correlationId: string;
    retryable: boolean;
    userMessage: string;
    metadata?: Record<string, any>;
}

// Performance metrics tracking
export interface ToolMetrics {
    correlationId: string;
    toolName: string;
    userId: string | null;
    startTime: number;
    endTime: number;
    duration: number;
    success: boolean;
    errorType?: ToolErrorType;
    cacheHit?: boolean;
    cacheKey?: string;
    dataPoints?: number;
    metadata?: Record<string, any>;
}

// Configuration for telemetry
const TELEMETRY_CONFIG = {
    ENABLE_LOGGING: true,
    ENABLE_METRICS: true,
    LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    SLOW_QUERY_THRESHOLD_MS: 1000,
} as const;

/**
 * Creates a standardized tool error with proper typing and metadata
 */
export function createToolError(
    type: ToolErrorType,
    message: string,
    userMessage: string,
    correlationId: string,
    retryable = false,
    metadata?: Record<string, any>
): ToolError {
    const error = new Error(message) as ToolError;
    error.type = type;
    error.correlationId = correlationId;
    error.retryable = retryable;
    error.userMessage = userMessage;
    error.metadata = metadata;
    return error;
}

/**
 * Generates correlation ID for request tracking
 */
export function generateCorrelationId(): string {
    return `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates execution context from runtimeContext
 */
export function createExecutionContext(
    toolName: string,
    runtimeContext: any,
    correlationId?: string
): ToolExecutionContext {
    return {
        correlationId: correlationId || generateCorrelationId(),
        userId: runtimeContext.get("userId") as string | null,
        toolName,
        startTime: Date.now(),
    };
}

/**
 * Validates userId from runtime context
 */
export function validateUserId(ctx: ToolExecutionContext): string {
    if (!ctx.userId) {
        throw createToolError(
            ToolErrorType.USER_ERROR,
            "Missing userId in runtimeContext",
            "認証が必要です。ログインしてから再度お試しください。",
            ctx.correlationId,
            false
        );
    }
    return ctx.userId;
}

/**
 * Logs tool execution events with structured format
 */
export function logToolEvent(
    level: 'debug' | 'info' | 'warn' | 'error',
    ctx: ToolExecutionContext,
    message: string,
    metadata?: Record<string, any>
) {
    if (!TELEMETRY_CONFIG.ENABLE_LOGGING) return;

    // Check if this log level should be output based on configuration
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const configLevel = TELEMETRY_CONFIG.LOG_LEVEL;
    const currentLevelIndex = logLevels.indexOf(level);
    const configLevelIndex = logLevels.indexOf(configLevel);

    if (currentLevelIndex < configLevelIndex) {
        return; // Skip logging if level is below configured threshold
    }

    const logData = {
        correlationId: ctx.correlationId,
        toolName: ctx.toolName,
        userId: ctx.userId,
        message,
        ...metadata,
    };

    // Use Mastra logger with appropriate level
    switch (level) {
        case 'debug':
            logger.debug(`[Tool] ${message}`, logData);
            break;
        case 'info':
            logger.info(`[Tool] ${message}`, logData);
            break;
        case 'warn':
            logger.warn(`[Tool] ${message}`, logData);
            break;
        case 'error':
            logger.error(`[Tool] ${message}`, logData);
            break;
        default:
            logger.info(`[Tool] ${message}`, logData);
    }
}

/**
 * Records performance metrics for tool execution
 */
export function recordMetrics(ctx: ToolExecutionContext, success: boolean, options?: {
    errorType?: ToolErrorType;
    cacheHit?: boolean;
    cacheKey?: string;
    dataPoints?: number;
    metadata?: Record<string, any>;
}): ToolMetrics {
    const endTime = Date.now();
    const duration = endTime - ctx.startTime;

    const metrics: ToolMetrics = {
        correlationId: ctx.correlationId,
        toolName: ctx.toolName,
        userId: ctx.userId,
        startTime: ctx.startTime,
        endTime,
        duration,
        success,
        ...options,
    };

    if (TELEMETRY_CONFIG.ENABLE_METRICS) {
        // Log performance metrics
        logToolEvent(
            duration > TELEMETRY_CONFIG.SLOW_QUERY_THRESHOLD_MS ? 'warn' : 'debug',
            ctx,
            success ? 'Tool execution completed' : 'Tool execution failed',
            {
                duration: `${duration}ms`,
                success,
                errorType: options?.errorType,
                cacheHit: options?.cacheHit,
                cacheKey: options?.cacheKey,
                dataPoints: options?.dataPoints,
                slow: duration > TELEMETRY_CONFIG.SLOW_QUERY_THRESHOLD_MS,
                cachePerformance: options?.cacheHit ? 'hit' : options?.cacheKey ? 'miss' : 'no-cache',
            }
        );
    }

    return metrics;
}

/**
 * Wrapper function for consistent tool execution with error handling and metrics
 */
export async function withToolExecution<T>(
    toolName: string,
    runtimeContext: any,
    handler: (ctx: ToolExecutionContext) => Promise<T>,
    options?: {
        requireAuth?: boolean;
        retryCount?: number;
        onError?: (error: ToolError, ctx: ToolExecutionContext) => Promise<T | null>;
    }
): Promise<T> {
    const ctx = createExecutionContext(toolName, runtimeContext);
    const {requireAuth = true, retryCount = 0, onError} = options || {};

    logToolEvent('debug', ctx, 'Tool execution started');

    try {
        // Validate authentication if required
        if (requireAuth) {
            validateUserId(ctx);
        }

        const result = await handler(ctx);
        recordMetrics(ctx, true);

        logToolEvent('debug', ctx, 'Tool execution completed successfully');
        return result;

    } catch (error: any) {
        const toolError = error as ToolError;

        // Convert generic errors to ToolError format
        if (!toolError.type) {
            const convertedError = createToolError(
                ToolErrorType.SYSTEM_ERROR,
                error.message || 'Unknown error occurred',
                'システムエラーが発生しました。しばらく待ってから再度お試しください。',
                ctx.correlationId,
                true,
                {originalError: error.message}
            );
            recordMetrics(ctx, false, {errorType: convertedError.type});
            logToolEvent('error', ctx, 'Tool execution failed', {error: convertedError.message});

            // Try error handler if provided
            if (onError) {
                const fallbackResult = await onError(convertedError, ctx);
                if (fallbackResult !== null) return fallbackResult;
            }

            throw convertedError;
        }

        // Handle ToolError with potential retry logic
        recordMetrics(ctx, false, {errorType: toolError.type});
        logToolEvent('error', ctx, 'Tool execution failed', {
            errorType: toolError.type,
            retryable: toolError.retryable,
            error: toolError.message
        });

        // Try error handler if provided
        if (onError) {
            const fallbackResult = await onError(toolError, ctx);
            if (fallbackResult !== null) return fallbackResult;
        }

        throw toolError;
    }
}

/**
 * Common input validation schema helpers
 */
export const commonSchemas = {
    userId: z.string().min(1, "User ID is required"),
    days: z.number().int().min(1).max(365),
    limit: z.number().int().min(1).max(100).default(10),
    offset: z.number().int().min(0).default(0),
    query: z.string().min(1, "Query is required"),
} as const;

/**
 * Database operation wrapper with consistent error handling
 */
export async function withDatabaseOperation<T>(
    ctx: ToolExecutionContext,
    operation: string,
    handler: () => Promise<T>
): Promise<T> {
    try {
        logToolEvent('debug', ctx, `Database operation: ${operation}`);
        const result = await handler();
        logToolEvent('debug', ctx, `Database operation completed: ${operation}`);
        return result;
    } catch (error: any) {
        logToolEvent('error', ctx, `Database operation failed: ${operation}`, {error: error.message});
        throw createToolError(
            ToolErrorType.DATA_ERROR,
            `Database operation failed: ${error.message}`,
            'データの取得中にエラーが発生しました。しばらく待ってから再度お試しください。',
            ctx.correlationId,
            true,
            {operation, originalError: error.message}
        );
    }
}

/**
 * Export configuration for testing and debugging
 */
export const TOOL_UTILS_CONFIG = TELEMETRY_CONFIG;