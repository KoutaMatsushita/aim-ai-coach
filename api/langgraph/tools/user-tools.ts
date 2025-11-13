/**
 * LangChain Tools for User Data Access
 * Kovaaks/Aimlab scores and user profile retrieval
 */

import { tool } from "@langchain/core/tools";
import { asc, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../mastra/db";

/**
 * ユーザー情報取得ツール
 */
export const findUserTool = tool(
	async ({ userId }: { userId: string }) => {
		const user = await db.query.users.findFirst({
			where: (t, { eq }) => eq(t.id, userId),
		});

		if (!user) {
			return { error: "User not found" };
		}

		return {
			id: user.id,
			name: user.name,
			email: user.email,
			createdAt: user.createdAt,
		};
	},
	{
		name: "find_user",
		description: "Find user by id and return basic profile information",
		schema: z.object({
			userId: z.string().describe("User ID to search for"),
		}),
	},
);

/**
 * Kovaaksスコア取得ツール
 * コーチング分析用の拡張フィルタリング機能付き
 */
export const findKovaaksScoresTool = tool(
	async ({
		userId,
		limit = 20,
		offset = 0,
		after,
		before,
		days,
		scenarioName,
		orderBy = "runEpochSec",
		sortOrder = "desc",
	}: {
		userId: string;
		limit?: number;
		offset?: number;
		after?: Date;
		before?: Date;
		days?: number;
		scenarioName?: string;
		orderBy?: "runEpochSec" | "accuracy" | "efficiency";
		sortOrder?: "asc" | "desc";
	}) => {
		// Calculate date range if days is specified
		let startDate = after;
		let endDate = before;

		if (days) {
			const now = new Date();
			startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
			if (!endDate) endDate = now;
		}

		const orderFunc = sortOrder === "asc" ? asc : desc;

		const scores = await db.query.kovaaksScoresTable.findMany({
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
					? (t) => orderFunc(t.runEpochSec)
					: orderBy === "accuracy"
						? (t) => orderFunc(t.accuracy)
						: (t) => orderFunc(t.efficiency),
		});

		return scores;
	},
	{
		name: "find_kovaaks_scores",
		description:
			"Find Kovaaks scores by user ID with enhanced filtering and sorting for coaching analysis. Returns detailed performance metrics including accuracy, efficiency, and overshots.",
		schema: z.object({
			userId: z.string().describe("User ID to search scores for"),
			limit: z
				.number()
				.int()
				.min(1)
				.max(100)
				.default(20)
				.describe("Maximum number of scores to return"),
			offset: z
				.number()
				.int()
				.min(0)
				.default(0)
				.describe("Number of scores to skip"),
			after: z
				.date()
				.optional()
				.describe("Filter scores after this date (inclusive)"),
			before: z
				.date()
				.optional()
				.describe("Filter scores before this date (inclusive)"),
			days: z
				.number()
				.int()
				.min(1)
				.max(365)
				.optional()
				.describe("Filter scores from last N days"),
			scenarioName: z
				.string()
				.optional()
				.describe("Filter by specific scenario name"),
			orderBy: z
				.enum(["runEpochSec", "accuracy", "efficiency"])
				.default("runEpochSec")
				.describe("Field to sort by"),
			sortOrder: z.enum(["asc", "desc"]).default("desc").describe("Sort order"),
		}),
	},
);

/**
 * Aimlabタスク取得ツール
 */
export const findAimlabTasksTool = tool(
	async ({
		userId,
		limit = 20,
		offset = 0,
		after,
		before,
		days,
		taskName,
		minScore,
		maxScore,
		orderBy = "startedAt",
		sortOrder = "desc",
	}: {
		userId: string;
		limit?: number;
		offset?: number;
		after?: Date;
		before?: Date;
		days?: number;
		taskName?: string;
		minScore?: number;
		maxScore?: number;
		orderBy?: "startedAt" | "score" | "taskName";
		sortOrder?: "asc" | "desc";
	}) => {
		// Calculate date range if days is specified
		let startDate = after;
		let endDate = before;

		if (days) {
			const now = new Date();
			startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
			if (!endDate) endDate = now;
		}

		const orderFunc = sortOrder === "asc" ? asc : desc;

		const tasks = await db.query.aimlabTaskTable.findMany({
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
					? (t) => orderFunc(t.startedAt)
					: orderBy === "score"
						? (t) => orderFunc(t.score)
						: (t) => orderFunc(t.taskName),
		});

		return tasks;
	},
	{
		name: "find_aimlab_tasks",
		description:
			"Find Aimlab tasks by user ID with enhanced filtering and sorting for coaching analysis. Returns detailed task performance including scores and task metadata.",
		schema: z.object({
			userId: z.string().describe("User ID to search tasks for"),
			limit: z
				.number()
				.int()
				.min(1)
				.max(100)
				.default(20)
				.describe("Maximum number of tasks to return"),
			offset: z
				.number()
				.int()
				.min(0)
				.default(0)
				.describe("Number of tasks to skip"),
			after: z
				.date()
				.optional()
				.describe("Filter tasks after this date (inclusive)"),
			before: z
				.date()
				.optional()
				.describe("Filter tasks before this date (inclusive)"),
			days: z
				.number()
				.int()
				.min(1)
				.max(365)
				.optional()
				.describe("Filter tasks from last N days"),
			taskName: z.string().optional().describe("Filter by specific task name"),
			minScore: z.number().optional().describe("Minimum score filter"),
			maxScore: z.number().optional().describe("Maximum score filter"),
			orderBy: z
				.enum(["startedAt", "score", "taskName"])
				.default("startedAt")
				.describe("Field to sort by"),
			sortOrder: z.enum(["asc", "desc"]).default("desc").describe("Sort order"),
		}),
	},
);

/**
 * ユーザーのスコア統計を計算するツール
 */
export const calculateUserStatsTool = tool(
	async ({
		userId,
		days = 14,
		platform,
	}: {
		userId: string;
		days?: number;
		platform: "kovaaks" | "aimlab";
	}) => {
		const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		if (platform === "kovaaks") {
			const scores = await db.query.kovaaksScoresTable.findMany({
				where: (t, { and, eq, gte }) =>
					and(
						eq(t.userId, userId),
						gte(t.runEpochSec, Math.floor(startDate.getTime() / 1000)),
					),
				orderBy: (t) => desc(t.runEpochSec),
				limit: 100,
			});

			if (scores.length === 0) {
				return {
					platform: "kovaaks",
					totalSessions: 0,
					message: "No scores found in the specified period",
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

			// Consistency Index
			const stdAccuracy = Math.sqrt(
				accuracies.reduce((acc, val) => acc + (val - avgAccuracy) ** 2, 0) /
					accuracies.length,
			);
			const consistencyIndex = Math.max(0, 1 - stdAccuracy / avgAccuracy);

			return {
				platform: "kovaaks",
				totalSessions: scores.length,
				avgAccuracy,
				medianAccuracy,
				avgOvershots,
				avgEfficiency,
				consistencyIndex,
			};
		}

		// Aimlab stats
		const tasks = await db.query.aimlabTaskTable.findMany({
			where: (t, { and, eq, gte }) =>
				and(eq(t.userId, userId), gte(t.startedAt, startDate.toISOString())),
			orderBy: (t) => desc(t.startedAt),
			limit: 100,
		});

		if (tasks.length === 0) {
			return {
				platform: "aimlab",
				totalTasks: 0,
				message: "No tasks found in the specified period",
			};
		}

		const scores = tasks.map((t) => t.score || 0);
		const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
		const maxScore = Math.max(...scores);
		const minScore = Math.min(...scores);

		return {
			platform: "aimlab",
			totalTasks: tasks.length,
			avgScore,
			maxScore,
			minScore,
		};
	},
	{
		name: "calculate_user_stats",
		description:
			"Calculate statistical analysis of user performance for a given platform (Kovaaks or Aimlab) over a specified time period. Returns aggregated metrics like averages, consistency, and trends.",
		schema: z.object({
			userId: z.string().describe("User ID to calculate stats for"),
			days: z
				.number()
				.int()
				.min(1)
				.max(90)
				.default(14)
				.describe("Number of days to analyze"),
			platform: z
				.enum(["kovaaks", "aimlab"])
				.describe("Platform to calculate stats for"),
		}),
	},
);

/**
 * すべてのユーザーツールをエクスポート
 */
export const userTools = [
	findUserTool,
	findKovaaksScoresTool,
	findAimlabTasksTool,
	calculateUserStatsTool,
];
