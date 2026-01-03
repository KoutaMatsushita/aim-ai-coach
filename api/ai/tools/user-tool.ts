import { tool } from "ai";
import { asc, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";

export const createUserTools = (userId: string) => ({
	findUser: tool({
		description: "Find user by id",
		inputSchema: z.object({}),
		execute: async () => {
			return db.query.users.findFirst({
				where: (t, { eq }) => eq(t.id, userId),
			});
		},
	}),

	findKovaaksScoresByUserId: tool({
		description:
			"find kovaaks scores by user id with enhanced filtering and sorting for coaching analysis",
		inputSchema: z.object({
			limit: z.number().int().min(1).max(100).default(20), // Optimized for coaching sessions
			offset: z.number().int().min(0).default(0),
			after: z.coerce.date().optional(),
			before: z.coerce.date().optional(),
			days: z.number().int().min(1).max(365).default(365),
			scenarioName: z.string().optional(),
			orderBy: z
				.enum(["runEpochSec", "accuracy", "efficiency"])
				.default("runEpochSec"),
			sortOrder: z.enum(["asc", "desc"]).default("desc"),
		}),
		execute: async (args: {
			limit: number;
			offset: number;
			after?: Date;
			before?: Date;
			days: number;
			scenarioName?: string;
			orderBy: "runEpochSec" | "accuracy" | "efficiency";
			sortOrder: "asc" | "desc";
		}) => {
			const {
				limit,
				offset,
				after,
				before,
				days,
				scenarioName,
				orderBy,
				sortOrder,
			} = args;

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
	}),

	findAimlabTasksByUserId: tool({
		description:
			"find aimlab tasks by user id with enhanced filtering and sorting for coaching analysis",
		inputSchema: z.object({
			limit: z.number().int().min(1).max(100).default(20), // Optimized for coaching sessions
			offset: z.number().int().min(0).default(0),
			after: z.coerce.date().optional(),
			before: z.coerce.date().optional(),
			days: z.number().int().min(1).max(365).default(365),
			taskName: z.string().optional(),
			minScore: z.number().optional(),
			maxScore: z.number().optional(),
			orderBy: z.enum(["startedAt", "score", "taskName"]).default("startedAt"),
			sortOrder: z.enum(["asc", "desc"]).default("desc"),
		}),
		execute: async (args: {
			limit: number;
			offset: number;
			after?: Date;
			before?: Date;
			days: number;
			taskName?: string;
			minScore?: number;
			maxScore?: number;
			orderBy: "startedAt" | "score" | "taskName";
			sortOrder: "asc" | "desc";
		}) => {
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
			} = args;

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
						startDate ? gte(t.startedAt, startDate.toISOString()) : undefined,
						endDate ? lte(t.startedAt, endDate.toISOString()) : undefined,
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
	}),

	getKovaaksStatsByUserId: tool({
		description:
			"Get statistical analysis of kovaaks scores for coaching analysis",
		inputSchema: z.object({
			days: z.number().int().min(1).max(90).default(14),
			scenarioName: z.string().optional(),
			groupBy: z.enum(["day", "week", "scenario"]).optional(),
		}),
		execute: async ({
			days,
			scenarioName,
		}: {
			days?: number;
			scenarioName?: string;
		}) => {
			const startDate = new Date(
				Date.now() - (days || 14) * 24 * 60 * 60 * 1000,
			);

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
						trend: "stable",
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
			const trend =
				diff > 0.02 ? "improving" : diff < -0.02 ? "declining" : "stable";

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
	}),

	getAimlabStatsByUserId: tool({
		description:
			"Get statistical analysis of aimlab tasks for coaching analysis",
		inputSchema: z.object({
			days: z.number().int().min(1).max(90).default(14),
			taskName: z.string().optional(),
		}),
		execute: async ({
			days,
			taskName,
		}: {
			days?: number;
			taskName?: string;
		}) => {
			const startDate = new Date(
				Date.now() - (days || 14) * 24 * 60 * 60 * 1000,
			);

			const tasks = await db.query.aimlabTaskTable.findMany({
				where: (t, { and, eq, gte }) =>
					and(
						eq(t.userId, userId),
						gte(t.startedAt, startDate.toISOString()),
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
						trend: "stable",
						consistencyIndex: 0,
						totalTasks: 0,
					},
					recentData: [],
				};
			}

			// Calculate statistics
			const scores = tasks.map((t) => t.score || 0);
			const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

			const sortedScores = [...scores].sort((a, b) => a - b);
			const medianScore = sortedScores[Math.floor(sortedScores.length / 2)];
			const maxScore = Math.max(...scores);
			const minScore = Math.min(...scores);

			// Consistency
			const stdScore = Math.sqrt(
				scores.reduce((acc, val) => acc + (val - avgScore) ** 2, 0) /
					scores.length,
			);
			const consistencyIndex = Math.max(0, 1 - stdScore / (avgScore || 1));

			// Trend
			const midpoint = Math.floor(tasks.length / 2);
			const firstHalf = tasks.slice(midpoint).map((t) => t.score || 0);
			const secondHalf = tasks.slice(0, midpoint).map((t) => t.score || 0);

			const firstHalfAvg =
				firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
			const secondHalfAvg =
				secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

			const diff = secondHalfAvg - firstHalfAvg;
			const trend =
				diff > avgScore * 0.05
					? "improving"
					: diff < -(avgScore * 0.05)
						? "declining"
						: "stable";

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
				recentData: tasks.slice(0, 10),
			};
		},
	}),
});
