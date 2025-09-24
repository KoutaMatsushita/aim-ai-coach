/**
 * Specialized telemetry and monitoring for RAG operations
 *
 * Provides enhanced observability for vector search, confidence scoring,
 * and knowledge retrieval operations with performance-specific metrics.
 */

import { ToolExecutionContext, logToolEvent, recordMetrics, ToolErrorType } from './tool-utils';

// RAG-specific performance metrics
export interface RAGMetrics {
	searchLatency: number;
	resultCount: number;
	confidenceScore?: number;
	vectorDimensions?: number;
	cacheHit: boolean;
	fallbackTriggered: boolean;
	queryComplexity: 'simple' | 'medium' | 'complex';
}

// RAG operation types for categorized monitoring
export enum RAGOperationType {
	VECTOR_SEARCH = 'vector_search',
	PERSONALIZED_RECOMMENDATIONS = 'personalized_recommendations',
	CONTENT_INDEXING = 'content_indexing',
	CONFIDENCE_ASSESSMENT = 'confidence_assessment',
	FALLBACK_EXECUTION = 'fallback_execution',
}

// RAG performance thresholds
const RAG_THRESHOLDS = {
	// Latency thresholds in milliseconds
	FAST_SEARCH_MS: 200,
	ACCEPTABLE_SEARCH_MS: 1000,
	SLOW_SEARCH_MS: 3000,

	// Confidence thresholds
	HIGH_CONFIDENCE: 0.8,
	MEDIUM_CONFIDENCE: 0.6,
	LOW_CONFIDENCE: 0.4,

	// Result count thresholds
	SUFFICIENT_RESULTS: 3,
	MINIMAL_RESULTS: 1,
} as const;

/**
 * Analyzes query complexity for performance baseline adjustment
 */
export function analyzeQueryComplexity(query: string): 'simple' | 'medium' | 'complex' {
	const words = query.trim().split(/\s+/).length;
	const hasSpecialTerms = /\b(and|or|not|advanced|specific|detailed|comprehensive)\b/i.test(query);
	const hasMultipleTopics = query.includes(',') || query.includes(';');

	if (words <= 3 && !hasSpecialTerms) return 'simple';
	if (words <= 8 && !hasMultipleTopics) return 'medium';
	return 'complex';
}

/**
 * Records RAG-specific performance metrics with contextual analysis
 */
export function recordRAGMetrics(
	ctx: ToolExecutionContext,
	operationType: RAGOperationType,
	metrics: RAGMetrics,
	success: boolean,
	error?: ToolErrorType
): void {
	const { searchLatency, resultCount, confidenceScore, cacheHit, fallbackTriggered, queryComplexity } = metrics;

	// Performance classification
	const isSlowSearch = searchLatency > RAG_THRESHOLDS.SLOW_SEARCH_MS;
	const isFastSearch = searchLatency < RAG_THRESHOLDS.FAST_SEARCH_MS;
	const hasLowConfidence = confidenceScore && confidenceScore < RAG_THRESHOLDS.LOW_CONFIDENCE;
	const hasInsufficientResults = resultCount < RAG_THRESHOLDS.MINIMAL_RESULTS;

	// Log performance characteristics
	const performanceLevel = isFastSearch ? 'excellent' :
		searchLatency < RAG_THRESHOLDS.ACCEPTABLE_SEARCH_MS ? 'good' :
		isSlowSearch ? 'poor' : 'acceptable';

	logToolEvent(
		isSlowSearch || hasLowConfidence ? 'warn' : 'debug',
		ctx,
		`RAG operation ${operationType} completed`,
		{
			operationType,
			performance: performanceLevel,
			searchLatency: `${searchLatency}ms`,
			resultCount,
			confidenceScore: confidenceScore ? `${Math.round(confidenceScore * 100)}%` : undefined,
			cacheHit,
			fallbackTriggered,
			queryComplexity,
			flags: {
				slowSearch: isSlowSearch,
				lowConfidence: hasLowConfidence,
				insufficientResults: hasInsufficientResults,
			}
		}
	);

	// Record standard metrics with RAG-specific metadata
	recordMetrics(ctx, success, {
		errorType: error,
		cacheHit,
		dataPoints: resultCount,
		metadata: {
			operationType,
			searchLatency,
			confidenceScore,
			fallbackTriggered,
			queryComplexity,
			performanceLevel,
		}
	});

	// Alert on performance issues
	if (isSlowSearch && queryComplexity === 'simple') {
		logToolEvent('warn', ctx, 'Unexpectedly slow RAG operation for simple query', {
			expectedLatency: `<${RAG_THRESHOLDS.FAST_SEARCH_MS}ms`,
			actualLatency: `${searchLatency}ms`,
			potentialCause: 'vector_index_issue_or_resource_contention'
		});
	}

	if (hasLowConfidence && !fallbackTriggered) {
		logToolEvent('warn', ctx, 'Low confidence results without fallback', {
			confidenceScore,
			threshold: RAG_THRESHOLDS.LOW_CONFIDENCE,
			recommendation: 'consider_enabling_fallback_mechanisms'
		});
	}
}

/**
 * Wrapper for RAG operations with specialized monitoring
 */
export async function withRAGOperation<T>(
	ctx: ToolExecutionContext,
	operationType: RAGOperationType,
	query: string,
	operation: () => Promise<{ result: T; metrics: Partial<RAGMetrics> }>
): Promise<T> {
	const startTime = Date.now();
	const queryComplexity = analyzeQueryComplexity(query);

	logToolEvent('debug', ctx, `Starting RAG operation: ${operationType}`, {
		query: query.length > 100 ? `${query.substring(0, 100)}...` : query,
		queryLength: query.length,
		queryComplexity
	});

	try {
		const { result, metrics: partialMetrics } = await operation();
		const searchLatency = Date.now() - startTime;

		const fullMetrics: RAGMetrics = {
			searchLatency,
			resultCount: 0,
			cacheHit: false,
			fallbackTriggered: false,
			queryComplexity,
			...partialMetrics,
		};

		recordRAGMetrics(ctx, operationType, fullMetrics, true);
		return result;

	} catch (error: any) {
		const searchLatency = Date.now() - startTime;

		const errorMetrics: RAGMetrics = {
			searchLatency,
			resultCount: 0,
			cacheHit: false,
			fallbackTriggered: true, // Assume fallback if error occurred
			queryComplexity,
		};

		recordRAGMetrics(ctx, operationType, errorMetrics, false, ToolErrorType.SYSTEM_ERROR);
		throw error;
	}
}

/**
 * Confidence score analysis with contextual interpretation
 */
export function analyzeConfidenceScore(
	score: number,
	operationType: RAGOperationType,
	resultCount: number
): {
	level: 'high' | 'medium' | 'low' | 'insufficient';
	recommendation: string;
	shouldFallback: boolean;
} {
	const hasMinimalResults = resultCount >= RAG_THRESHOLDS.MINIMAL_RESULTS;

	if (score >= RAG_THRESHOLDS.HIGH_CONFIDENCE && hasMinimalResults) {
		return {
			level: 'high',
			recommendation: 'Use results with confidence, excellent match quality',
			shouldFallback: false,
		};
	}

	if (score >= RAG_THRESHOLDS.MEDIUM_CONFIDENCE && hasMinimalResults) {
		return {
			level: 'medium',
			recommendation: 'Results are usable but consider additional context',
			shouldFallback: false,
		};
	}

	if (score >= RAG_THRESHOLDS.LOW_CONFIDENCE && hasMinimalResults) {
		return {
			level: 'low',
			recommendation: 'Results may be relevant but verify with user context',
			shouldFallback: operationType === RAGOperationType.PERSONALIZED_RECOMMENDATIONS,
		};
	}

	return {
		level: 'insufficient',
		recommendation: 'Fallback to basic analysis, confidence too low for RAG results',
		shouldFallback: true,
	};
}

/**
 * Performance baseline adjustments based on operation type and query complexity
 */
export function getPerformanceBaseline(
	operationType: RAGOperationType,
	queryComplexity: 'simple' | 'medium' | 'complex'
): { expectedLatency: number; acceptableLatency: number } {
	const baseLatency = {
		[RAGOperationType.VECTOR_SEARCH]: { simple: 150, medium: 300, complex: 600 },
		[RAGOperationType.PERSONALIZED_RECOMMENDATIONS]: { simple: 400, medium: 800, complex: 1500 },
		[RAGOperationType.CONTENT_INDEXING]: { simple: 200, medium: 500, complex: 1000 },
		[RAGOperationType.CONFIDENCE_ASSESSMENT]: { simple: 50, medium: 100, complex: 200 },
		[RAGOperationType.FALLBACK_EXECUTION]: { simple: 100, medium: 200, complex: 400 },
	};

	const expectedLatency = baseLatency[operationType][queryComplexity];
	const acceptableLatency = expectedLatency * 2;

	return { expectedLatency, acceptableLatency };
}

/**
 * Export configuration for testing and debugging
 */
export const RAG_TELEMETRY_CONFIG = RAG_THRESHOLDS;