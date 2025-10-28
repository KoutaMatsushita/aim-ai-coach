import { createTool } from "@mastra/core";
import { asc, desc } from "drizzle-orm";
import { z } from "zod";
import {
	AimlabTaskSelectSchema,
	db,
	KovaaksScoreSelectSchema,
	UserSelectSchema,
} from "../db";

export const findUser = createTool({
	id: "find-user",
	description: "Find user by id",
	inputSchema: z.object({}),
	outputSchema: UserSelectSchema.optional(),
	execute: ({ runtimeContext }) => {
		const userId = runtimeContext.get("userId") as string | null;
		if (!userId) {
			throw new Error("runtimeContext で userId を渡してください");
		}

		return db.query.users.findFirst({
			where: (t, { eq }) => eq(t.id, userId),
		});
	},
});

export const findKovaaksScoresByUserId = createTool({
	id: "find-kovaaks-scores-user-id-tool",
	description:
		"find kovaaks scores by user id with enhanced filtering and sorting for coaching analysis",
	inputSchema: z.object({
		limit: z.number().int().min(1).max(100).default(20), // Optimized for coaching sessions
		offset: z.number().int().min(0).default(0),
		after: z.coerce.date().optional(),
		before: z.coerce.date().optional(),
		days: z.number().int().min(1).max(365).optional(),
		scenarioName: z.string().optional(),
		orderBy: z
			.enum(["runEpochSec", "accuracy", "efficiency"])
			.default("runEpochSec"),
		sortOrder: z.enum(["asc", "desc"]).default("desc"),
	}),
	outputSchema: z.array(KovaaksScoreSelectSchema),
	execute: async ({ context, runtimeContext }) => {
		const {
			limit,
			offset,
			after,
			before,
			days,
			scenarioName,
			orderBy,
			sortOrder,
		} = context;

		const userId = runtimeContext.get("userId") as string | null;
		if (!userId) {
			throw new Error("runtimeContext で userId を渡してください");
		}

		// Calculate date range if days is specified
		let startDate = after;
		let endDate = before;

		if (days) {
			const now = new Date();
			startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
			if (!endDate) endDate = now;
		}

		const orderFunc = (sortOrder: "asc" | "desc") => {
			switch (sortOrder) {
				case "asc":
					return asc;
				case "desc":
					return desc;
				default:
					return desc;
			}
		};

		return db.query.kovaaksScoresTable.findMany({
			where: (t, { and, eq, gte, lte }) =>
				and(
					eq(t.userId, userId),
					startDate
						? gte(t.runEpochSec, Math.floor(startDate.getTime() / 1000))
						: undefined,
					endDate
						? lte(t.runEpochSec, Math.floor(endDate.getTime() / 1000))
						: undefined,
					scenarioName ? eq(t.scenarioName, scenarioName) : undefined,
				),
			limit,
			offset,
			orderBy:
				orderBy === "runEpochSec"
					? (t) => orderFunc(sortOrder)(t.runEpochSec)
					: orderBy === "accuracy"
						? (t) => orderFunc(sortOrder)(t.accuracy)
						: (t) => orderFunc(sortOrder)(t.efficiency),
		});
	},
});

export const findAimlabTasksByUserId = createTool({
	id: "find-aimlab-tasks-by-user-id-tool",
	description:
		"find aimlab tasks by user id with enhanced filtering and sorting for coaching analysis",
	inputSchema: z.object({
		limit: z.number().int().min(1).max(100).default(20), // Optimized for coaching sessions
		offset: z.number().int().min(0).default(0),
		after: z.coerce.date().optional(),
		before: z.coerce.date().optional(),
		days: z.number().int().min(1).max(365).optional(),
		taskName: z.string().optional(),
		minScore: z.number().optional(),
		maxScore: z.number().optional(),
		orderBy: z.enum(["startedAt", "score", "taskName"]).default("startedAt"),
		sortOrder: z.enum(["asc", "desc"]).default("desc"),
	}),
	outputSchema: z.array(AimlabTaskSelectSchema),
	execute: async ({ context, runtimeContext }) => {
		const {
			limit,
			offset,
			after,
			before,
			days,
			taskName,
			minScore,
			maxScore,
			orderBy,
			sortOrder,
		} = context;

		const userId = runtimeContext.get("userId") as string | null;
		if (!userId) {
			throw new Error("runtimeContext で userId を渡してください");
		}

		// Calculate date range if days is specified
		let startDate = after;
		let endDate = before;

		if (days) {
			const now = new Date();
			startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
			if (!endDate) endDate = now;
		}

		const orderFunc = (sortOrder: "asc" | "desc") => {
			switch (sortOrder) {
				case "asc":
					return asc;
				case "desc":
					return desc;
				default:
					return desc;
			}
		};

		return db.query.aimlabTaskTable.findMany({
			where: (t, { and, eq, gte, lte }) =>
				and(
					eq(t.userId, userId),
					startDate ? gte(t.startedAt, startDate) : undefined,
					endDate ? lte(t.startedAt, endDate) : undefined,
					taskName ? eq(t.taskName, taskName) : undefined,
					minScore ? gte(t.score, minScore) : undefined,
					maxScore ? lte(t.score, maxScore) : undefined,
				),
			limit,
			offset,
			orderBy:
				orderBy === "startedAt"
					? (t) => orderFunc(sortOrder)(t.startedAt)
					: orderBy === "score"
						? (t) => orderFunc(sortOrder)(t.score)
						: (t) => orderFunc(sortOrder)(t.taskName),
		});
	},
});

export const getKovaaksStatsByUserId = createTool({
	id: "get-kovaaks-stats-by-user-id-tool",
	description:
		"Get statistical analysis of kovaaks scores for coaching analysis",
	inputSchema: z.object({
		days: z.number().int().min(1).max(90).default(14),
		scenarioName: z.string().optional(),
		groupBy: z.enum(["day", "week", "scenario"]).optional(),
	}),
	outputSchema: z.object({
		stats: z.object({
			avgAccuracy: z.number(),
			medianAccuracy: z.number(),
			avgOvershots: z.number(),
			avgEfficiency: z.number(),
			trend: z.enum(["improving", "stable", "declining"]),
			consistencyIndex: z.number(),
			totalSessions: z.number(),
		}),
		recentData: z.array(KovaaksScoreSelectSchema),
	}),
	execute: async ({ context, runtimeContext }) => {
		const { days, scenarioName } = context;
		const userId = runtimeContext.get("userId") as string | null;
		if (!userId) {
			throw new Error("runtimeContext で userId を渡してください");
		}

		const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		const scores = await db.query.kovaaksScoresTable.findMany({
			where: (t, { and, eq, gte }) =>
				and(
					eq(t.userId, userId),
					gte(t.runEpochSec, Math.floor(startDate.getTime() / 1000)),
					scenarioName ? eq(t.scenarioName, scenarioName) : undefined,
				),
			orderBy: (t) => desc(t.runEpochSec),
			limit: 100,
		});

		if (scores.length === 0) {
			return {
				stats: {
					avgAccuracy: 0,
					medianAccuracy: 0,
					avgOvershots: 0,
					avgEfficiency: 0,
					trend: "stable" as const,
					consistencyIndex: 0,
					totalSessions: 0,
				},
				recentData: [],
			};
		}

		// Calculate statistics
		const accuracies = scores.map((s) => s.accuracy);
		const overshots = scores.map((s) => s.overShots);
		const efficiencies = scores.map((s) => s.efficiency);

		const avgAccuracy =
			accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
		const avgOvershots =
			overshots.reduce((a, b) => a + b, 0) / overshots.length;
		const avgEfficiency =
			efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;

		// Median accuracy
		const sortedAccuracy = [...accuracies].sort((a, b) => a - b);
		const medianAccuracy =
			sortedAccuracy[Math.floor(sortedAccuracy.length / 2)];

		// Consistency Index (1 - CV where CV = std/mean)
		const stdAccuracy = Math.sqrt(
			accuracies.reduce((acc, val) => acc + (val - avgAccuracy) ** 2, 0) /
				accuracies.length,
		);
		const consistencyIndex = Math.max(0, 1 - stdAccuracy / avgAccuracy);

		// Trend analysis (compare first half vs second half)
		const midpoint = Math.floor(scores.length / 2);
		const firstHalf = scores.slice(midpoint).map((s) => s.accuracy);
		const secondHalf = scores.slice(0, midpoint).map((s) => s.accuracy);

		const firstHalfAvg =
			firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
		const secondHalfAvg =
			secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

		const diff = secondHalfAvg - firstHalfAvg;
		const trend = z
			.enum(["improving", "stable", "declining"])
			.parse(diff > 0.02 ? "improving" : diff < -0.02 ? "declining" : "stable");

		return {
			stats: {
				avgAccuracy,
				medianAccuracy,
				avgOvershots,
				avgEfficiency,
				trend,
				consistencyIndex,
				totalSessions: scores.length,
			},
			recentData: scores.slice(0, 10), // Return latest 10 sessions
		};
	},
});

export const getAimlabStatsByUserId = createTool({
	id: "get-aimlab-stats-by-user-id-tool",
	description: "Get statistical analysis of aimlab tasks for coaching analysis",
	inputSchema: z.object({
		days: z.number().int().min(1).max(90).default(14),
		taskName: z.string().optional(),
	}),
	outputSchema: z.object({
		stats: z.object({
			avgScore: z.number(),
			medianScore: z.number(),
			maxScore: z.number(),
			minScore: z.number(),
			trend: z.enum(["improving", "stable", "declining"]),
			consistencyIndex: z.number(),
			totalTasks: z.number(),
		}),
		recentData: z.array(AimlabTaskSelectSchema),
	}),
	execute: async ({ context, runtimeContext }) => {
		const { days, taskName } = context;
		const userId = runtimeContext.get("userId") as string | null;
		if (!userId) {
			throw new Error("runtimeContext で userId を渡してください");
		}

		const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		const tasks = await db.query.aimlabTaskTable.findMany({
			where: (t, { and, eq, gte }) =>
				and(
					eq(t.userId, userId),
					gte(t.startedAt, startDate),
					taskName ? eq(t.taskName, taskName) : undefined,
				),
			orderBy: (t) => desc(t.startedAt),
			limit: 100,
		});

		if (tasks.length === 0) {
			return {
				stats: {
					avgScore: 0,
					medianScore: 0,
					maxScore: 0,
					minScore: 0,
					trend: "stable" as const,
					consistencyIndex: 0,
					totalTasks: 0,
				},
				recentData: [],
			};
		}

		// Calculate statistics
		const scores = tasks.map((t) => t.score || 0);
		const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
		const maxScore = Math.max(...scores);
		const minScore = Math.min(...scores);

		// Median score
		const sortedScores = [...scores].sort((a, b) => a - b);
		const medianScore = sortedScores[Math.floor(sortedScores.length / 2)];

		// Consistency Index
		const stdScore = Math.sqrt(
			scores.reduce((acc, val) => acc + (val - avgScore) ** 2, 0) /
				scores.length,
		);
		const consistencyIndex =
			avgScore > 0 ? Math.max(0, 1 - stdScore / avgScore) : 0;

		// Trend analysis
		const midpoint = Math.floor(tasks.length / 2);
		const firstHalf = tasks.slice(midpoint).map((t) => t.score || 0);
		const secondHalf = tasks.slice(0, midpoint).map((t) => t.score || 0);

		const firstHalfAvg =
			firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
		const secondHalfAvg =
			secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

		const diff = secondHalfAvg - firstHalfAvg;
		const trend = z
			.enum(["improving", "stable", "declining"])
			.parse(
				diff > avgScore * 0.05
					? "improving"
					: diff < -avgScore * 0.05
						? "declining"
						: "stable",
			);

		return {
			stats: {
				avgScore,
				medianScore,
				maxScore,
				minScore,
				trend,
				consistencyIndex,
				totalTasks: tasks.length,
			},
			recentData: tasks.slice(0, 10), // Return latest 10 tasks
		};
	},
});

// export const assessSkillLevel = createTool({
//     id: "assess-skill-level-tool",
//     description: "Assess player skill level based on recent performance data for coaching analysis",
//     inputSchema: z.object({
//         days: z.number().int().min(7).max(30).default(14),
//     }),
//     outputSchema: z.object({
//         skillLevel: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]),
//         confidence: z.number().min(0).max(1),
//         keyMetrics: z.object({
//             avgAccuracy: z.number(),
//             consistencyIndex: z.number(),
//             overshotRate: z.number(),
//             sessionsAnalyzed: z.number(),
//         }),
//         recommendations: z.array(z.string()),
//         breakdown: z.object({
//             kovaaksAnalysis: z
//                 .object({
//                     avgAccuracy: z.number(),
//                     avgOvershots: z.number(),
//                     sessionsCount: z.number(),
//                 })
//                 .optional(),
//             aimlabAnalysis: z
//                 .object({
//                     avgScore: z.number(),
//                     tasksCount: z.number(),
//                 })
//                 .optional(),
//         }),
//     }),
//     execute: async ({context, runtimeContext}) => {
//         return withToolExecution(
//             'assess-skill-level',
//             runtimeContext,
//             async (ctx) => {
//                 const {days} = context;
//                 const userId = validateUserId(ctx);
//
//                 // Execute skill assessment directly (cache removed for simplification)
//                 logToolEvent('info', ctx, 'Executing skill assessment', {days});
//
//                 const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
//
//                 // Get Kovaaks data with database operation tracking
//                 const kovaaksScores = await withDatabaseOperation(
//                     ctx,
//                     'fetch_kovaaks_scores',
//                     () => db.query.kovaaksScoresTable.findMany({
//                         where: (t, {and, eq, gte}) =>
//                             and(eq(t.userId, userId), gte(t.runEpochSec, Math.floor(startDate.getTime() / 1000))),
//                         orderBy: (t) => desc(t.runEpochSec),
//                         limit: 50,
//                     })
//                 );
//
//                 // Get Aimlab data with database operation tracking
//                 const aimlabTasks = await withDatabaseOperation(
//                     ctx,
//                     'fetch_aimlab_tasks',
//                     () => db.query.aimlabTaskTable.findMany({
//                         where: (t, {and, eq, gte}) => and(eq(t.userId, userId), gte(t.startedAt, startDate)),
//                         orderBy: (t) => desc(t.startedAt),
//                         limit: 50,
//                     })
//                 );
//
//                 logToolEvent('debug', ctx, 'Retrieved performance data', {
//                     kovaaksCount: kovaaksScores.length,
//                     aimlabCount: aimlabTasks.length,
//                     daysAnalyzed: days
//                 });
//
//                 // Analyze Kovaaks data
//                 let kovaaksAnalysis;
//                 if (kovaaksScores.length >= 5) {
//                     const accuracies = kovaaksScores.map((s) => s.accuracy);
//                     const overshots = kovaaksScores.map((s) => s.overShots);
//
//                     const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
//                     const avgOvershots = overshots.reduce((a, b) => a + b, 0) / overshots.length;
//
//                     kovaaksAnalysis = {
//                         avgAccuracy,
//                         avgOvershots,
//                         sessionsCount: kovaaksScores.length,
//                     };
//                 } else if (kovaaksScores.length > 0) {
//                     logToolEvent('warn', ctx, 'Insufficient Kovaaks data for reliable analysis', {
//                         availableScores: kovaaksScores.length,
//                         requiredMinimum: 5
//                     });
//                 }
//
//                 // Analyze Aimlab data
//                 let aimlabAnalysis;
//                 if (aimlabTasks.length >= 5) {
//                     const scores = aimlabTasks.map((t) => t.score || 0);
//                     const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
//
//                     aimlabAnalysis = {
//                         avgScore,
//                         tasksCount: aimlabTasks.length,
//                     };
//                 } else if (aimlabTasks.length > 0) {
//                     logToolEvent('warn', ctx, 'Insufficient Aimlab data for reliable analysis', {
//                         availableTasks: aimlabTasks.length,
//                         requiredMinimum: 5
//                     });
//                 }
//
//                 // Skill assessment logic
//                 let skillLevel: "Beginner" | "Intermediate" | "Advanced" | "Expert" = "Beginner";
//                 let confidence = 0.5;
//                 const recommendations: string[] = [];
//
//                 if (kovaaksAnalysis) {
//                     const {avgAccuracy, avgOvershots} = kovaaksAnalysis;
//
//                     // Skill level determination based on accuracy and overshot rate
//                     if (avgAccuracy >= 0.7 && avgOvershots <= 10) {
//                         skillLevel = "Expert";
//                         confidence = Math.min(0.9, confidence + 0.4);
//                         recommendations.push("Maintain current performance with competitive scenarios");
//                         recommendations.push("Focus on consistency and peak performance optimization");
//                     } else if (avgAccuracy >= 0.6 && avgOvershots <= 15) {
//                         skillLevel = "Advanced";
//                         confidence = Math.min(0.8, confidence + 0.3);
//                         recommendations.push("Work on precision under pressure scenarios");
//                         recommendations.push("Practice advanced tracking and micro-adjustments");
//                     } else if (avgAccuracy >= 0.45 && avgOvershots <= 25) {
//                         skillLevel = "Intermediate";
//                         confidence = Math.min(0.7, confidence + 0.2);
//                         recommendations.push("Balance flick and tracking training equally");
//                         recommendations.push("Focus on reducing overshot rate with deliberate practice");
//                     } else {
//                         skillLevel = "Beginner";
//                         confidence = Math.min(0.8, confidence + 0.3);
//                         recommendations.push("Focus on fundamental aim mechanics with larger targets");
//                         recommendations.push("Prioritize accuracy over speed in all scenarios");
//                         recommendations.push("Practice basic tracking and clicking scenarios daily");
//                     }
//
//                     logToolEvent('debug', ctx, 'Skill assessment completed', {
//                         skillLevel,
//                         confidence: Math.round(confidence * 100) / 100,
//                         avgAccuracy: Math.round(avgAccuracy * 100) / 100,
//                         avgOvershots
//                     });
//                 }
//
//                 // Adjust based on Aimlab data if available
//                 if (aimlabAnalysis && aimlabAnalysis.avgScore > 0) {
//                     confidence = Math.min(0.9, confidence + 0.1);
//                     logToolEvent('debug', ctx, 'Confidence adjusted with Aimlab data', {
//                         aimlabAvgScore: aimlabAnalysis.avgScore,
//                         adjustedConfidence: Math.round(confidence * 100) / 100
//                     });
//                 }
//
//                 // Calculate overall metrics
//                 const keyMetrics = {
//                     avgAccuracy: kovaaksAnalysis?.avgAccuracy || 0,
//                     consistencyIndex: kovaaksAnalysis ? Math.max(0, 1 - 0.2) : 0, // Simplified CI
//                     overshotRate: kovaaksAnalysis?.avgOvershots || 0,
//                     sessionsAnalyzed: kovaaksScores.length + aimlabTasks.length,
//                 };
//
//                 // Add general recommendations
//                 if (keyMetrics.sessionsAnalyzed < 10) {
//                     recommendations.unshift("Need more practice data for accurate assessment");
//                     confidence *= 0.7;
//                     logToolEvent('warn', ctx, 'Limited data affects confidence', {
//                         totalSessions: keyMetrics.sessionsAnalyzed,
//                         confidencePenalty: 0.3
//                     });
//                 }
//
//                 const result = {
//                     skillLevel,
//                     confidence: Math.round(confidence * 100) / 100,
//                     keyMetrics,
//                     recommendations,
//                     breakdown: {
//                         kovaaksAnalysis,
//                         aimlabAnalysis,
//                     },
//                 };
//
//                 logToolEvent('info', ctx, 'Skill assessment analysis completed', {
//                     result: {
//                         skillLevel: result.skillLevel,
//                         confidence: result.confidence,
//                         totalRecommendations: result.recommendations.length,
//                         dataQuality: keyMetrics.sessionsAnalyzed >= 10 ? 'sufficient' : 'limited'
//                     }
//                 });
//
//                 return result;
//             }
//         );
//     },
// });
