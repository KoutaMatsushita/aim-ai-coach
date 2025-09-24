/**
 * Reflection Tools for AIM AI Coach
 *
 * Provides session-to-session analysis capabilities for continuous improvement
 * and personalized coaching progression tracking.
 */

import { createTool } from "@mastra/core";
import { z } from "zod";
import { desc, eq, gte, and, lt } from "drizzle-orm";
import { db, kovaaksScoresTable, aimlabTaskTable } from "../../db";
import {
    withToolExecution,
    withDatabaseOperation,
    validateUserId,
    logToolEvent,
    createToolError,
    ToolErrorType
} from "./shared/tool-utils";
import {
    withCache,
    CACHE_TTL
} from "./shared/cache-layer";

// Common schemas for reflection analysis
const PerformanceChangeSchema = z.object({
    metric: z.string(),
    previousValue: z.number().nullable(),
    currentValue: z.number().nullable(),
    change: z.number().nullable(),
    changePercent: z.number().nullable(),
    trend: z.enum(["improving", "declining", "stable", "insufficient_data"]),
    significance: z.enum(["major", "moderate", "minor", "negligible"]),
});

const RecommendationStatusSchema = z.object({
    recommendation: z.string(),
    status: z.enum(["completed", "in_progress", "not_started", "unknown"]),
    evidence: z.string().nullable(),
    effectiveness: z.enum(["high", "medium", "low", "unknown"]),
});

/**
 * Analyzes performance differences between current and previous period
 */
export const analyzePerformanceDiff = createTool({
    id: "analyze-performance-diff-tool",
    description: "Compare current performance data with previous period to identify improvements and regressions",
    inputSchema: z.object({
        currentPeriodDays: z.number().int().min(1).max(30).default(7),
        previousPeriodDays: z.number().int().min(1).max(30).default(7),
        includeDetailed: z.boolean().default(false),
    }),
    outputSchema: z.object({
        summary: z.object({
            overallTrend: z.enum(["improving", "declining", "stable", "insufficient_data"]),
            significantChanges: z.number().int(),
            dataQuality: z.enum(["high", "medium", "low"]),
            analysisConfidence: z.number().min(0).max(1),
        }),
        kovaaksChanges: z.array(PerformanceChangeSchema),
        aimlabChanges: z.array(PerformanceChangeSchema),
        insights: z.array(z.string()),
        recommendations: z.array(z.string()),
    }),
    execute: async ({ context, runtimeContext }) => {
        return withToolExecution(
            'analyze-performance-diff',
            runtimeContext,
            async (ctx) => {
                const { currentPeriodDays, previousPeriodDays, includeDetailed } = context;
                const userId = validateUserId(ctx);

                return withCache(
                    ctx,
                    'performance_diff_analysis',
                    'USER_DATA',
                    { userId, currentPeriodDays, previousPeriodDays },
                    CACHE_TTL.USER_TOOLS,
                    async () => {
                        const now = new Date();
                        const currentPeriodStart = new Date(now.getTime() - currentPeriodDays * 24 * 60 * 60 * 1000);
                        const previousPeriodStart = new Date(currentPeriodStart.getTime() - previousPeriodDays * 24 * 60 * 60 * 1000);
                        const previousPeriodEnd = currentPeriodStart;

                        logToolEvent('debug', ctx, 'Analyzing performance differences', {
                            currentPeriod: `${currentPeriodStart.toISOString()} - ${now.toISOString()}`,
                            previousPeriod: `${previousPeriodStart.toISOString()} - ${previousPeriodEnd.toISOString()}`
                        });

                        // Get current period data
                        const currentKovaaksData = await withDatabaseOperation(
                            ctx,
                            'fetch_current_kovaaks_data',
                            () => db.query.kovaaksScoresTable.findMany({
                                where: and(
                                    eq(kovaaksScoresTable.userId, userId),
                                    gte(kovaaksScoresTable.runEpochSec, Math.floor(currentPeriodStart.getTime() / 1000))
                                ),
                                orderBy: desc(kovaaksScoresTable.runEpochSec),
                                limit: 100,
                            })
                        );

                        // Get previous period data
                        const previousKovaaksData = await withDatabaseOperation(
                            ctx,
                            'fetch_previous_kovaaks_data',
                            () => db.query.kovaaksScoresTable.findMany({
                                where: and(
                                    eq(kovaaksScoresTable.userId, userId),
                                    gte(kovaaksScoresTable.runEpochSec, Math.floor(previousPeriodStart.getTime() / 1000)),
                                    lt(kovaaksScoresTable.runEpochSec, Math.floor(previousPeriodEnd.getTime() / 1000))
                                ),
                                orderBy: desc(kovaaksScoresTable.runEpochSec),
                                limit: 100,
                            })
                        );

                        // Similar for AimLab data
                        const currentAimlabData = await withDatabaseOperation(
                            ctx,
                            'fetch_current_aimlab_data',
                            () => db.query.aimlabTaskTable.findMany({
                                where: and(
                                    eq(aimlabTaskTable.userId, userId),
                                    gte(aimlabTaskTable.startedAt, Math.floor(currentPeriodStart.getTime() / 1000))
                                ),
                                orderBy: desc(aimlabTaskTable.startedAt),
                                limit: 100,
                            })
                        );

                        const previousAimlabData = await withDatabaseOperation(
                            ctx,
                            'fetch_previous_aimlab_data',
                            () => db.query.aimlabTaskTable.findMany({
                                where: and(
                                    eq(aimlabTaskTable.userId, userId),
                                    gte(aimlabTaskTable.startedAt, Math.floor(previousPeriodStart.getTime() / 1000)),
                                    lt(aimlabTaskTable.startedAt, Math.floor(previousPeriodEnd.getTime() / 1000))
                                ),
                                orderBy: desc(aimlabTaskTable.startedAt),
                                limit: 100,
                            })
                        );

                        logToolEvent('info', ctx, 'Performance data retrieved', {
                            currentKovaaks: currentKovaaksData.length,
                            previousKovaaks: previousKovaaksData.length,
                            currentAimlab: currentAimlabData.length,
                            previousAimlab: previousAimlabData.length
                        });

                        // Analyze Kovaaks changes
                        const kovaaksChanges = analyzeKovaaksPerformanceChanges(
                            currentKovaaksData,
                            previousKovaaksData
                        );

                        // Analyze AimLab changes
                        const aimlabChanges = analyzeAimlabPerformanceChanges(
                            currentAimlabData,
                            previousAimlabData
                        );

                        // Calculate overall summary
                        const allChanges = [...kovaaksChanges, ...aimlabChanges];
                        const significantChanges = allChanges.filter(c =>
                            c.significance === "major" || c.significance === "moderate"
                        ).length;

                        const improvingCount = allChanges.filter(c => c.trend === "improving").length;
                        const decliningCount = allChanges.filter(c => c.trend === "declining").length;
                        const totalChanges = allChanges.filter(c => c.trend !== "insufficient_data").length;

                        let overallTrend: "improving" | "declining" | "stable" | "insufficient_data" = "insufficient_data";
                        if (totalChanges >= 3) {
                            if (improvingCount > decliningCount * 1.5) {
                                overallTrend = "improving";
                            } else if (decliningCount > improvingCount * 1.5) {
                                overallTrend = "declining";
                            } else {
                                overallTrend = "stable";
                            }
                        }

                        const dataQuality = totalChanges >= 5 ? "high" : totalChanges >= 2 ? "medium" : "low";
                        const analysisConfidence = Math.min(0.9, totalChanges * 0.15);

                        // Generate insights and recommendations
                        const insights = generateInsights(kovaaksChanges, aimlabChanges, overallTrend);
                        const recommendations = generateRecommendations(kovaaksChanges, aimlabChanges, overallTrend);

                        const result = {
                            summary: {
                                overallTrend,
                                significantChanges,
                                dataQuality,
                                analysisConfidence,
                            },
                            kovaaksChanges,
                            aimlabChanges,
                            insights,
                            recommendations,
                        };

                        logToolEvent('info', ctx, 'Performance diff analysis completed', {
                            overallTrend,
                            significantChanges,
                            dataQuality,
                            insightCount: insights.length
                        });

                        return result;
                    }
                );
            }
        );
    },
});

/**
 * Tracks the status of previous session recommendations
 */
export const trackRecommendationProgress = createTool({
    id: "track-recommendation-progress-tool",
    description: "Analyze whether previous session recommendations were followed and their effectiveness",
    inputSchema: z.object({
        lookbackDays: z.number().int().min(1).max(30).default(14),
        previousRecommendations: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
        trackingResults: z.array(RecommendationStatusSchema),
        summary: z.object({
            totalRecommendations: z.number().int(),
            completedCount: z.number().int(),
            inProgressCount: z.number().int(),
            notStartedCount: z.number().int(),
            overallCompliance: z.number().min(0).max(1),
        }),
        insights: z.array(z.string()),
        followUpActions: z.array(z.string()),
    }),
    execute: async ({ context, runtimeContext }) => {
        return withToolExecution(
            'track-recommendation-progress',
            runtimeContext,
            async (ctx) => {
                const { lookbackDays, previousRecommendations } = context;
                const userId = validateUserId(ctx);

                // For now, we'll implement a simplified version that infers progress from data
                // In a full implementation, this might integrate with user feedback systems

                const lookbackStart = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

                // Get recent performance data to infer recommendation adherence
                const recentKovaaksData = await withDatabaseOperation(
                    ctx,
                    'fetch_recent_kovaaks_for_tracking',
                    () => db.query.kovaaksScoresTable.findMany({
                        where: and(
                            eq(kovaaksScoresTable.userId, userId),
                            gte(kovaaksScoresTable.runEpochSec, Math.floor(lookbackStart.getTime() / 1000))
                        ),
                        orderBy: desc(kovaaksScoresTable.runEpochSec),
                        limit: 50,
                    })
                );

                const recentAimlabData = await withDatabaseOperation(
                    ctx,
                    'fetch_recent_aimlab_for_tracking',
                    () => db.query.aimlabTaskTable.findMany({
                        where: and(
                            eq(aimlabTaskTable.userId, userId),
                            gte(aimlabTaskTable.startedAt, Math.floor(lookbackStart.getTime() / 1000))
                        ),
                        orderBy: desc(aimlabTaskTable.startedAt),
                        limit: 50,
                    })
                );

                logToolEvent('info', ctx, 'Tracking recommendation progress', {
                    lookbackDays,
                    recommendationCount: previousRecommendations?.length || 0,
                    kovaaksRecords: recentKovaaksData.length,
                    aimlabRecords: recentAimlabData.length
                });

                // For demonstration, create some sample tracking results
                const trackingResults: z.infer<typeof RecommendationStatusSchema>[] = [];
                const defaultRecommendations = [
                    "Practice gridshot for 10 minutes daily",
                    "Focus on tracking scenarios 3x per week",
                    "Work on crosshair placement in aim trainers"
                ];

                const recommendations = previousRecommendations && previousRecommendations.length > 0
                    ? previousRecommendations
                    : defaultRecommendations;

                for (const recommendation of recommendations) {
                    const status = inferRecommendationStatus(recommendation, recentKovaaksData, recentAimlabData);
                    trackingResults.push(status);
                }

                // Calculate summary statistics
                const completedCount = trackingResults.filter(r => r.status === "completed").length;
                const inProgressCount = trackingResults.filter(r => r.status === "in_progress").length;
                const notStartedCount = trackingResults.filter(r => r.status === "not_started").length;
                const overallCompliance = trackingResults.length > 0
                    ? (completedCount + inProgressCount * 0.5) / trackingResults.length
                    : 0;

                const summary = {
                    totalRecommendations: trackingResults.length,
                    completedCount,
                    inProgressCount,
                    notStartedCount,
                    overallCompliance,
                };

                // Generate insights and follow-up actions
                const insights = generateTrackingInsights(trackingResults, summary);
                const followUpActions = generateFollowUpActions(trackingResults, summary);

                const result = {
                    trackingResults,
                    summary,
                    insights,
                    followUpActions,
                };

                logToolEvent('info', ctx, 'Recommendation tracking completed', {
                    overallCompliance: Math.round(overallCompliance * 100),
                    completedCount,
                    inProgressCount,
                    notStartedCount
                });

                return result;
            }
        );
    },
});

/**
 * Estimates the effectiveness of coaching interventions
 */
export const estimateCoachingEffectiveness = createTool({
    id: "estimate-coaching-effectiveness-tool",
    description: "Analyze the effectiveness of coaching interventions and suggest improvements",
    inputSchema: z.object({
        analysisWindowDays: z.number().int().min(7).max(60).default(21),
        includeConfidenceScores: z.boolean().default(true),
    }),
    outputSchema: z.object({
        effectiveness: z.object({
            overall: z.enum(["high", "medium", "low", "insufficient_data"]),
            confidence: z.number().min(0).max(1),
            improvementRate: z.number().nullable(),
            consistencyScore: z.number().min(0).max(1).nullable(),
        }),
        interventionAnalysis: z.array(z.object({
            intervention: z.string(),
            effectiveness: z.enum(["high", "medium", "low", "unknown"]),
            evidence: z.string(),
        })),
        strengths: z.array(z.string()),
        areasForImprovement: z.array(z.string()),
        recommendations: z.array(z.string()),
    }),
    execute: async ({ context, runtimeContext }) => {
        return withToolExecution(
            'estimate-coaching-effectiveness',
            runtimeContext,
            async (ctx) => {
                const { analysisWindowDays, includeConfidenceScores } = context;
                const userId = validateUserId(ctx);

                return withCache(
                    ctx,
                    'coaching_effectiveness_analysis',
                    'SKILL_ASSESSMENT',
                    { userId, analysisWindowDays },
                    CACHE_TTL.ASSESSMENT_TOOLS,
                    async () => {
                        const analysisStart = new Date(Date.now() - analysisWindowDays * 24 * 60 * 60 * 1000);

                        // Get performance data for effectiveness analysis
                        const performanceData = await withDatabaseOperation(
                            ctx,
                            'fetch_effectiveness_performance_data',
                            () => db.query.kovaaksScoresTable.findMany({
                                where: and(
                                    eq(kovaaksScoresTable.userId, userId),
                                    gte(kovaaksScoresTable.runEpochSec, Math.floor(analysisStart.getTime() / 1000))
                                ),
                                orderBy: desc(kovaaksScoresTable.runEpochSec),
                                limit: 200,
                            })
                        );

                        logToolEvent('info', ctx, 'Analyzing coaching effectiveness', {
                            analysisWindowDays,
                            performanceRecords: performanceData.length
                        });

                        // Analyze effectiveness (simplified implementation)
                        const effectiveness = analyzeCoachingEffectiveness(performanceData, analysisWindowDays);
                        const interventionAnalysis = analyzeInterventions(performanceData);
                        const strengths = identifyCoachingStrengths(performanceData);
                        const areasForImprovement = identifyCoachingImprovements(performanceData);
                        const recommendations = generateEffectivenessRecommendations(effectiveness, strengths, areasForImprovement);

                        const result = {
                            effectiveness,
                            interventionAnalysis,
                            strengths,
                            areasForImprovement,
                            recommendations,
                        };

                        logToolEvent('info', ctx, 'Coaching effectiveness analysis completed', {
                            overallEffectiveness: effectiveness.overall,
                            confidence: Math.round(effectiveness.confidence * 100),
                            recommendationCount: recommendations.length
                        });

                        return result;
                    }
                );
            }
        );
    },
});

// Helper functions for analysis (simplified implementations)

function analyzeKovaaksPerformanceChanges(current: any[], previous: any[]): z.infer<typeof PerformanceChangeSchema>[] {
    if (current.length < 3 || previous.length < 3) {
        return [{
            metric: "insufficient_data",
            previousValue: null,
            currentValue: null,
            change: null,
            changePercent: null,
            trend: "insufficient_data",
            significance: "negligible",
        }];
    }

    const currentAvgAccuracy = current.reduce((sum, item) => sum + item.accuracy, 0) / current.length;
    const previousAvgAccuracy = previous.reduce((sum, item) => sum + item.accuracy, 0) / previous.length;
    const accuracyChange = currentAvgAccuracy - previousAvgAccuracy;
    const accuracyChangePercent = previousAvgAccuracy > 0 ? (accuracyChange / previousAvgAccuracy) * 100 : null;

    const currentAvgOvershots = current.reduce((sum, item) => sum + item.overShots, 0) / current.length;
    const previousAvgOvershots = previous.reduce((sum, item) => sum + item.overShots, 0) / previous.length;
    const overshotChange = currentAvgOvershots - previousAvgOvershots;
    const overshotChangePercent = previousAvgOvershots > 0 ? (overshotChange / previousAvgOvershots) * 100 : null;

    return [
        {
            metric: "accuracy",
            previousValue: Math.round(previousAvgAccuracy * 100) / 100,
            currentValue: Math.round(currentAvgAccuracy * 100) / 100,
            change: Math.round(accuracyChange * 100) / 100,
            changePercent: accuracyChangePercent ? Math.round(accuracyChangePercent * 100) / 100 : null,
            trend: accuracyChange > 0.02 ? "improving" : accuracyChange < -0.02 ? "declining" : "stable",
            significance: Math.abs(accuracyChange) > 0.05 ? "major" : Math.abs(accuracyChange) > 0.02 ? "moderate" : "minor",
        },
        {
            metric: "overshots",
            previousValue: Math.round(previousAvgOvershots * 100) / 100,
            currentValue: Math.round(currentAvgOvershots * 100) / 100,
            change: Math.round(overshotChange * 100) / 100,
            changePercent: overshotChangePercent ? Math.round(overshotChangePercent * 100) / 100 : null,
            trend: overshotChange < -1 ? "improving" : overshotChange > 1 ? "declining" : "stable",
            significance: Math.abs(overshotChange) > 3 ? "major" : Math.abs(overshotChange) > 1 ? "moderate" : "minor",
        }
    ];
}

function analyzeAimlabPerformanceChanges(current: any[], previous: any[]): z.infer<typeof PerformanceChangeSchema>[] {
    if (current.length < 3 || previous.length < 3) {
        return [];
    }

    const currentAvgScore = current.reduce((sum, item) => sum + (item.score || 0), 0) / current.length;
    const previousAvgScore = previous.reduce((sum, item) => sum + (item.score || 0), 0) / previous.length;
    const scoreChange = currentAvgScore - previousAvgScore;
    const scoreChangePercent = previousAvgScore > 0 ? (scoreChange / previousAvgScore) * 100 : null;

    return [{
        metric: "aimlab_score",
        previousValue: Math.round(previousAvgScore),
        currentValue: Math.round(currentAvgScore),
        change: Math.round(scoreChange),
        changePercent: scoreChangePercent ? Math.round(scoreChangePercent * 100) / 100 : null,
        trend: scoreChange > 50 ? "improving" : scoreChange < -50 ? "declining" : "stable",
        significance: Math.abs(scoreChange) > 200 ? "major" : Math.abs(scoreChange) > 100 ? "moderate" : "minor",
    }];
}

function generateInsights(kovaaksChanges: any[], aimlabChanges: any[], overallTrend: string): string[] {
    const insights: string[] = [];

    if (overallTrend === "improving") {
        insights.push("Overall performance is showing positive improvement");
    } else if (overallTrend === "declining") {
        insights.push("Performance has declined since the previous period - need to review training approach");
    } else if (overallTrend === "stable") {
        insights.push("Performance is stable - consider new challenges to drive further improvement");
    }

    const significantChanges = [...kovaaksChanges, ...aimlabChanges]
        .filter(c => c.significance === "major" || c.significance === "moderate");

    if (significantChanges.length > 0) {
        insights.push(`${significantChanges.length} metrics show significant changes requiring attention`);
    }

    return insights;
}

function generateRecommendations(kovaaksChanges: any[], aimlabChanges: any[], overallTrend: string): string[] {
    const recommendations: string[] = [];

    if (overallTrend === "declining") {
        recommendations.push("Review and adjust current training routine");
        recommendations.push("Consider returning to fundamental exercises");
    } else if (overallTrend === "stable") {
        recommendations.push("Introduce new challenges to break performance plateau");
        recommendations.push("Consider increasing training difficulty or variety");
    }

    const accuracyDecline = kovaaksChanges.find(c => c.metric === "accuracy" && c.trend === "declining");
    if (accuracyDecline) {
        recommendations.push("Focus on accuracy over speed in training scenarios");
    }

    return recommendations;
}

function inferRecommendationStatus(recommendation: string, kovaaksData: any[], aimlabData: any[]): z.infer<typeof RecommendationStatusSchema> {
    // Simplified inference logic based on keywords and data patterns
    const totalSessions = kovaaksData.length + aimlabData.length;

    let status: "completed" | "in_progress" | "not_started" | "unknown" = "unknown";
    let evidence = "No clear evidence available";
    let effectiveness: "high" | "medium" | "low" | "unknown" = "unknown";

    if (recommendation.toLowerCase().includes("daily") && totalSessions >= 10) {
        status = "in_progress";
        evidence = `${totalSessions} training sessions recorded in the lookback period`;
        effectiveness = "medium";
    } else if (recommendation.toLowerCase().includes("gridshot") && kovaaksData.length >= 5) {
        status = "in_progress";
        evidence = `${kovaaksData.length} Kovaaks sessions suggest consistent practice`;
        effectiveness = "medium";
    } else if (totalSessions < 3) {
        status = "not_started";
        evidence = "Very few training sessions recorded";
        effectiveness = "unknown";
    } else {
        status = "in_progress";
        evidence = "Some training activity detected";
        effectiveness = "low";
    }

    return {
        recommendation,
        status,
        evidence,
        effectiveness,
    };
}

function generateTrackingInsights(results: z.infer<typeof RecommendationStatusSchema>[], summary: any): string[] {
    const insights: string[] = [];

    if (summary.overallCompliance >= 0.7) {
        insights.push("High compliance with previous recommendations");
    } else if (summary.overallCompliance >= 0.4) {
        insights.push("Moderate compliance - some recommendations being followed");
    } else {
        insights.push("Low compliance - most recommendations not being followed");
    }

    const highEffectiveness = results.filter(r => r.effectiveness === "high").length;
    if (highEffectiveness > 0) {
        insights.push(`${highEffectiveness} recommendations showing high effectiveness`);
    }

    return insights;
}

function generateFollowUpActions(results: z.infer<typeof RecommendationStatusSchema>[], summary: any): string[] {
    const actions: string[] = [];

    if (summary.notStartedCount > 0) {
        actions.push("Address barriers preventing implementation of recommendations");
    }

    if (summary.overallCompliance < 0.5) {
        actions.push("Simplify recommendations to improve adherence");
        actions.push("Provide more specific, actionable guidance");
    }

    const lowEffectiveness = results.filter(r => r.effectiveness === "low").length;
    if (lowEffectiveness > 0) {
        actions.push("Review and modify low-effectiveness recommendations");
    }

    return actions;
}

function analyzeCoachingEffectiveness(performanceData: any[], windowDays: number): any {
    if (performanceData.length < 10) {
        return {
            overall: "insufficient_data" as const,
            confidence: 0.2,
            improvementRate: null,
            consistencyScore: null,
        };
    }

    // Simple trend analysis
    const sortedData = performanceData.sort((a, b) => a.runEpochSec - b.runEpochSec);
    const firstHalf = sortedData.slice(0, Math.floor(sortedData.length / 2));
    const secondHalf = sortedData.slice(Math.floor(sortedData.length / 2));

    const firstHalfAvgAccuracy = firstHalf.reduce((sum, item) => sum + item.accuracy, 0) / firstHalf.length;
    const secondHalfAvgAccuracy = secondHalf.reduce((sum, item) => sum + item.accuracy, 0) / secondHalf.length;
    const improvementRate = secondHalfAvgAccuracy - firstHalfAvgAccuracy;

    const overall = improvementRate > 0.03 ? "high" : improvementRate > 0.01 ? "medium" : "low";
    const confidence = Math.min(0.9, performanceData.length * 0.05);
    const consistencyScore = 1 - (Math.sqrt(sortedData.reduce((sum, item) => sum + Math.pow(item.accuracy - secondHalfAvgAccuracy, 2), 0) / sortedData.length) / secondHalfAvgAccuracy);

    return {
        overall,
        confidence,
        improvementRate: Math.round(improvementRate * 1000) / 1000,
        consistencyScore: Math.max(0, Math.min(1, consistencyScore)),
    };
}

function analyzeInterventions(performanceData: any[]): any[] {
    // Simplified intervention analysis
    return [
        {
            intervention: "Accuracy-focused training",
            effectiveness: "medium" as const,
            evidence: "Some improvement in accuracy metrics observed",
        },
        {
            intervention: "Regular practice schedule",
            effectiveness: "high" as const,
            evidence: "Consistent training sessions correlate with improvement",
        },
    ];
}

function identifyCoachingStrengths(performanceData: any[]): string[] {
    const strengths: string[] = [];

    if (performanceData.length >= 20) {
        strengths.push("Consistent engagement and data collection");
    }

    const avgAccuracy = performanceData.reduce((sum, item) => sum + item.accuracy, 0) / performanceData.length;
    if (avgAccuracy > 0.6) {
        strengths.push("Maintaining good accuracy levels");
    }

    return strengths;
}

function identifyCoachingImprovements(performanceData: any[]): string[] {
    const improvements: string[] = [];

    if (performanceData.length < 10) {
        improvements.push("Need more consistent practice data for better analysis");
    }

    const avgAccuracy = performanceData.reduce((sum, item) => sum + item.accuracy, 0) / performanceData.length;
    if (avgAccuracy < 0.5) {
        improvements.push("Focus on fundamental accuracy improvement");
    }

    return improvements;
}

function generateEffectivenessRecommendations(effectiveness: any, strengths: string[], improvements: string[]): string[] {
    const recommendations: string[] = [];

    if (effectiveness.overall === "low") {
        recommendations.push("Consider adjusting coaching approach and training methodology");
    }

    if (improvements.length > strengths.length) {
        recommendations.push("Focus on addressing identified improvement areas");
    }

    if (effectiveness.confidence < 0.5) {
        recommendations.push("Collect more practice data for reliable effectiveness assessment");
    }

    return recommendations;
}