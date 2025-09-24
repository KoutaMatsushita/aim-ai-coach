/**
 * RAG Wrapper with Guardrails for AIM AI Coach
 *
 * Implements confidence-based and data-sufficiency checks before executing
 * LibSQLVector RAG operations to ensure reliable and appropriate responses.
 */

import { createTool } from "@mastra/core";
import { z } from "zod";
import { assessSkillLevel } from './user-tool';
import {
	searchAimContentLibSQL,
	getPersonalizedRecommendationsLibSQL,
} from './knowledge-tool-libsql';
import {
	withToolExecution,
	validateUserId,
	logToolEvent,
	createToolError,
	ToolErrorType
} from "./shared/tool-utils";
import {
	withRAGOperation,
	RAGOperationType,
	analyzeConfidenceScore,
} from "./shared/rag-telemetry";
import { logger } from "../logger";

// Guardrail configuration
const RAG_CONFIG = {
	MIN_CONFIDENCE: 0.4,
	MIN_DATA_COUNT: 5,
	ENABLE_LOGGING: true,
} as const;

export interface RAGGuardrailResult<T> {
	success: boolean;
	data?: T;
	fallback: boolean;
	reason?: 'confidence_too_low' | 'insufficient_data' | 'rag_error';
	confidence?: number;
	dataCount?: number;
}

/**
 * Logs RAG guardrail decisions for debugging and optimization
 */
function logRAGDecision(action: string, success: boolean, reason?: string, metadata?: Record<string, any>) {
	if (RAG_CONFIG.ENABLE_LOGGING) {
		const logData = {
			action,
			status: success ? 'ALLOWED' : 'BLOCKED',
			reason,
			...metadata
		};

		logger.info(`[RAG-Guardrail] ${action}: ${success ? 'ALLOWED' : 'BLOCKED'}`, logData);
	}
}

/**
 * Checks if RAG operations should be executed based on skill assessment confidence
 */
async function checkRAGEligibility(runtimeContext: any): Promise<{
	eligible: boolean;
	confidence?: number;
	reason?: string;
}> {
	try {
		// Get skill assessment with confidence score using proper tool execution
		const skillAssessment = await assessSkillLevel.execute({
			context: { days: 14 },
			runtimeContext
		});

		if (!skillAssessment || typeof skillAssessment.confidence !== 'number') {
			return {
				eligible: false,
				reason: 'skill_assessment_failed',
			};
		}

		const eligible = skillAssessment.confidence >= RAG_CONFIG.MIN_CONFIDENCE;

		return {
			eligible,
			confidence: skillAssessment.confidence,
			reason: eligible ? undefined : 'confidence_too_low',
		};
	} catch (error) {
		logger.error('[RAG-Guardrail] Skill assessment error', { error: (error as Error).message });
		return {
			eligible: false,
			reason: 'assessment_error',
		};
	}
}

/**
 * Executes searchAimContentLibSQL with guardrails
 */
export const guardedSearchAimContent = createTool({
	id: "guarded-search-aim-content-tool",
	description: "Search aim training content with confidence-based guardrails",
	inputSchema: z.object({
		query: z.string().min(1),
		difficultyLevel: z.string().optional(),
		aimElements: z.array(z.string()).optional(),
		targetGame: z.string().optional(),
		limit: z.number().int().min(1).max(20).default(5),
		minScore: z.number().min(0).max(1).optional(),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		data: z.any().optional(),
		fallback: z.boolean(),
		reason: z.enum(['confidence_too_low', 'insufficient_data', 'rag_error']).optional(),
		confidence: z.number().optional(),
		fallbackMessage: z.string().optional(),
	}),
	execute: async ({ context, runtimeContext }) => {
		return withToolExecution(
			'guarded-search-aim-content',
			runtimeContext,
			async (ctx) => {
				const userId = validateUserId(ctx);

				return withRAGOperation(
					ctx,
					RAGOperationType.VECTOR_SEARCH,
					context.query,
					async () => {
						// Check eligibility first
						const eligibility = await checkRAGEligibility(runtimeContext);

						if (!eligibility.eligible) {
							logToolEvent('warn', ctx, 'RAG search blocked by guardrails', {
								reason: eligibility.reason,
								confidence: eligibility.confidence,
								query: context.query
							});

							const result = {
								success: false,
								fallback: true,
								reason: eligibility.reason as any,
								confidence: eligibility.confidence,
								fallbackMessage: formatFallbackMessage({
									success: false,
									fallback: true,
									reason: eligibility.reason as any,
									confidence: eligibility.confidence,
								}),
							};

							return {
								result,
								metrics: {
									resultCount: 0,
									confidenceScore: eligibility.confidence,
									fallbackTriggered: true,
								}
							};
						}

						// Execute RAG search if eligible
						try {
							const {results} = await searchAimContentLibSQL.execute({
								context,
								runtimeContext
							});

							const confidenceAnalysis = analyzeConfidenceScore(
								eligibility.confidence || 0,
								RAGOperationType.VECTOR_SEARCH,
                                results?.length || 0
							);

							logToolEvent('info', ctx, 'RAG search completed successfully', {
								resultCount: results?.length || 0,
								confidence: eligibility.confidence,
								confidenceLevel: confidenceAnalysis.level,
								query: context.query
							});

							return {
								result: {
									success: true,
									data: results,
									fallback: false,
									confidence: eligibility.confidence,
								},
								metrics: {
									resultCount: results?.length || 0,
									confidenceScore: eligibility.confidence,
									fallbackTriggered: false,
								}
							};

						} catch (error: any) {
							logToolEvent('error', ctx, 'RAG search operation failed', {
								error: error.message,
								confidence: eligibility.confidence
							});

							throw createToolError(
								ToolErrorType.SYSTEM_ERROR,
								`RAG search failed: ${error.message}`,
								'検索機能で一時的な問題が発生しました。基本分析で継続します。',
								ctx.correlationId,
								true,
								{ originalError: error.message }
							);
						}
					}
				);
			},
			{
				onError: async (error, ctx) => {
					// Fallback handling for RAG errors
					return {
						success: false,
						fallback: true,
						reason: 'rag_error' as const,
						confidence: undefined,
						fallbackMessage: formatFallbackMessage({
							success: false,
							fallback: true,
							reason: 'rag_error',
							confidence: undefined,
						}),
					};
				}
			}
		);
	},
});;

/**
 * Executes getPersonalizedRecommendationsLibSQL with guardrails
 */
export const guardedPersonalizedRecommendations = createTool({
	id: "guarded-personalized-recommendations-tool",
	description: "Get personalized aim training recommendations with confidence-based guardrails",
	inputSchema: z.object({
		userSkillLevel: z.string().min(1),
		weakAreas: z.array(z.string()).min(1),
		targetGame: z.string().optional(),
		recentTopics: z.array(z.string()).optional(),
		limit: z.number().int().min(1).max(10).default(3),
		minScore: z.number().min(0).max(1).optional(),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		data: z.any().optional(),
		fallback: z.boolean(),
		reason: z.enum(['confidence_too_low', 'insufficient_data', 'rag_error']).optional(),
		confidence: z.number().optional(),
		fallbackMessage: z.string().optional(),
	}),
	execute: async ({ context, runtimeContext }) => {
		// Check eligibility first
		const eligibility = await checkRAGEligibility(runtimeContext);

		if (!eligibility.eligible) {
			logRAGDecision('recommendations', false, eligibility.reason, {
				confidence: eligibility.confidence,
				userSkillLevel: context.userSkillLevel
			});

			return {
				success: false,
				fallback: true,
				reason: eligibility.reason as any,
				confidence: eligibility.confidence,
				fallbackMessage: formatFallbackMessage({
					success: false,
					fallback: true,
					reason: eligibility.reason as any,
					confidence: eligibility.confidence,
				}),
			};
		}

		// Execute RAG recommendations if eligible
		try {
			const {recommendations} = await getPersonalizedRecommendationsLibSQL.execute({
				context,
				runtimeContext
			});

			logRAGDecision('recommendations', true, undefined, {
				confidence: eligibility.confidence,
				userSkillLevel: context.userSkillLevel,
				resultCount: recommendations?.length || 0
			});

			return {
				success: true,
				data: recommendations,
				fallback: false,
				confidence: eligibility.confidence,
			};
		} catch (error: any) {
			logger.error('[RAG-Guardrail] Recommendations error', { error: error.message, confidence: eligibility.confidence });

			logRAGDecision('recommendations', false, 'rag_error', {
				confidence: eligibility.confidence,
				error: error.message
			});

			return {
				success: false,
				fallback: true,
				reason: 'rag_error' as const,
				confidence: eligibility.confidence,
				fallbackMessage: formatFallbackMessage({
					success: false,
					fallback: true,
					reason: 'rag_error',
					confidence: eligibility.confidence,
				}),
			};
		}
	},
});

/**
 * Utility function to format fallback messages for the agent
 */
export function formatFallbackMessage(result: RAGGuardrailResult<any>): string {
	if (!result.fallback) return '';

	switch (result.reason) {
		case 'confidence_too_low':
			return `⚠️ 基本分析モード (信頼度: ${Math.round((result.confidence || 0) * 100)}% < ${RAG_CONFIG.MIN_CONFIDENCE * 100}%)`;
		case 'insufficient_data':
			return `⚠️ 限定分析モード (データ不足: ${result.dataCount}件 < ${RAG_CONFIG.MIN_DATA_COUNT}件)`;
		case 'rag_error':
			return '🔧 検索機能一時停止中 (技術的問題)';
		default:
			return '⚠️ 基本分析モード';
	}
}

/**
 * Export configuration for testing and debugging
 */
export const RAG_WRAPPER_CONFIG = RAG_CONFIG;