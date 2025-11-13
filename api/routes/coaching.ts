/**
 * Coaching Endpoints
 * Task 10: Task API エンドポイントの実装
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/require-user";
import type { Variables } from "../variables";

export const coachingApp = new Hono<{ Variables: Variables }>()
	.use("*", requireUser)

	/**
	 * Task 10.1: POST /api/coaching/report - Daily Report
	 */
	.post(
		"/report",
		zValidator(
			"json",
			z.object({
				userId: z.string(),
			}),
		),
		async (c) => {
			const { userId } = c.req.valid("json");
			const langGraph = c.var.langGraph;

			try {
				// Task Graph Service を取得
				const taskGraphService = langGraph.taskGraphService;

				// Task Graph を実行
				const result = await taskGraphService.invoke({
					userId,
					taskType: "daily_report",
				});

				// タスク実行失敗
				if (result.metadata.status === "failure") {
					return c.json(
						{
							error: "Task execution failed",
							message: result.metadata.errorMessage,
						},
						500,
					);
				}

				// 成功レスポンス
				return c.json({
					taskResult: result.taskResult,
					metadata: result.metadata,
				});
			} catch (error) {
				console.error("Daily report error:", error);
				return c.json(
					{
						error: "Failed to generate daily report",
						message: error instanceof Error ? error.message : "Unknown error",
					},
					500,
				);
			}
		},
	)

	/**
	 * Task 10.2: POST /api/coaching/analysis - Score Analysis
	 */
	.post(
		"/analysis",
		zValidator(
			"json",
			z.object({
				userId: z.string(),
			}),
		),
		async (c) => {
			const { userId } = c.req.valid("json");
			const langGraph = c.var.langGraph;

			try {
				const taskGraphService = langGraph.taskGraphService;

				const result = await taskGraphService.invoke({
					userId,
					taskType: "score_analysis",
				});

				if (result.metadata.status === "failure") {
					return c.json(
						{
							error: "Task execution failed",
							message: result.metadata.errorMessage,
						},
						500,
					);
				}

				// ScoreAnalysis 型に変換
				const taskResult = result.taskResult;
				if (taskResult?.type === "analysis") {
					// Task Graph の返り値を ScoreAnalysis 型に変換
					const analysisData = taskResult.data as any;

					// period の変換処理
					let periodStart: Date;
					let periodEnd: Date = new Date();

					if (analysisData.period === "last_24h") {
						periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
					} else if (analysisData.period === "last_7d") {
						periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
					} else if (
						analysisData.period &&
						analysisData.period.includes(" - ")
					) {
						// "YYYY-MM-DD - YYYY-MM-DD" 形式
						const [startStr, endStr] = analysisData.period.split(" - ");
						periodStart = new Date(startStr);
						periodEnd = new Date(endStr);
					} else {
						// デフォルト: 過去7日間
						periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
					}

					const scoreAnalysis = {
						userId,
						period: {
							start: periodStart,
							end: periodEnd,
						},
						trend: analysisData.trend || "stable",
						strengths: analysisData.strengths || [],
						challenges:
							analysisData.weaknesses || analysisData.challenges || [],
						milestones: analysisData.recommendations || [],
						chartData: {
							labels: [],
							datasets: [],
						},
						createdAt: new Date(),
					};

					return c.json(scoreAnalysis);
				}

				return c.json(
					{
						error: "Invalid task result type",
						message: "Expected analysis type",
					},
					500,
				);
			} catch (error) {
				console.error("Score analysis error:", error);
				return c.json(
					{
						error: "Failed to analyze scores",
						message: error instanceof Error ? error.message : "Unknown error",
					},
					500,
				);
			}
		},
	)

	/**
	 * Task 10.3: POST /api/coaching/playlist - Playlist Building
	 */
	.post(
		"/playlist",
		zValidator(
			"json",
			z.object({
				userId: z.string(),
			}),
		),
		async (c) => {
			const { userId } = c.req.valid("json");
			const langGraph = c.var.langGraph;

			try {
				const taskGraphService = langGraph.taskGraphService;

				const result = await taskGraphService.invoke({
					userId,
					taskType: "playlist_building",
				});

				if (result.metadata.status === "failure") {
					return c.json(
						{
							error: "Task execution failed",
							message: result.metadata.errorMessage,
						},
						500,
					);
				}

				return c.json({
					taskResult: result.taskResult,
					metadata: result.metadata,
				});
			} catch (error) {
				console.error("Playlist building error:", error);
				return c.json(
					{
						error: "Failed to build playlist",
						message: error instanceof Error ? error.message : "Unknown error",
					},
					500,
				);
			}
		},
	)

	/**
	 * Task 10.4: POST /api/coaching/review - Progress Review
	 */
	.post(
		"/review",
		zValidator(
			"json",
			z.object({
				userId: z.string(),
			}),
		),
		async (c) => {
			const { userId } = c.req.valid("json");
			const langGraph = c.var.langGraph;

			try {
				const taskGraphService = langGraph.taskGraphService;

				const result = await taskGraphService.invoke({
					userId,
					taskType: "progress_review",
				});

				if (result.metadata.status === "failure") {
					return c.json(
						{
							error: "Task execution failed",
							message: result.metadata.errorMessage,
						},
						500,
					);
				}

				return c.json({
					taskResult: result.taskResult,
					metadata: result.metadata,
				});
			} catch (error) {
				console.error("Progress review error:", error);
				return c.json(
					{
						error: "Failed to generate progress review",
						message: error instanceof Error ? error.message : "Unknown error",
					},
					500,
				);
			}
		},
	)

	/**
	 * Task 11.1: GET /api/coaching/status - Coaching Status
	 */
	.get("/status", async (c) => {
		const userId = c.req.query("userId");

		if (!userId) {
			return c.json({ error: "userId query parameter is required" }, 400);
		}

		const db = c.var.db;

		try {
			// 1. ユーザーコンテキストを検出（シンプルなロジック）
			// スコアデータに基づいてコンテキストを判定
			const allScores = await db.query.kovaaksScoresTable.findMany({
				where: (t, { eq }) => eq(t.userId, userId),
				limit: 1,
				orderBy: (t, { desc }) => desc(t.runEpochSec),
			});

			let contextType = "active_user";

			if (allScores.length === 0) {
				contextType = "new_user";
			} else {
				const lastActivity = allScores[0];
				const daysSinceLastActivity = Math.floor(
					(Date.now() - lastActivity.runEpochSec * 1000) /
						(1000 * 60 * 60 * 24),
				);

				if (daysSinceLastActivity > 7) {
					contextType = "returning_user";
				} else {
					// Check if playlist is recommended
					const hasActivePlaylist = await db.query.playlistsTable.findFirst({
						where: (t, { and, eq }) =>
							and(eq(t.userId, userId), eq(t.isActive, true)),
					});

					if (!hasActivePlaylist) {
						contextType = "playlist_recommended";
					}
				}
			}

			const userContext = {
				contextType,
			};

			// 2. 直近7日間のスコアを取得してトレンドを分析
			const sevenDaysAgo = Math.floor(
				(Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000,
			);
			const recentScores = await db.query.kovaaksScoresTable.findMany({
				where: (t, { and, eq, gte }) =>
					and(eq(t.userId, userId), gte(t.runEpochSec, sevenDaysAgo)),
				orderBy: (t, { desc }) => desc(t.runEpochSec),
			});

			// スコアトレンド分析
			const sessionsCount = recentScores.length;
			let overallTrend = "stable";
			const improvingSkills: string[] = [];
			const challengingSkills: string[] = [];

			if (sessionsCount > 0) {
				// 簡易的なトレンド分析
				const avgAccuracy =
					recentScores.reduce((sum, s) => sum + s.accuracy, 0) / sessionsCount;

				if (avgAccuracy > 0.8) {
					overallTrend = "improving";
					improvingSkills.push("tracking", "precision");
				} else if (avgAccuracy < 0.6) {
					overallTrend = "declining";
					challengingSkills.push("accuracy", "consistency");
				} else {
					challengingSkills.push("speed");
				}
			}

			const recentTrends = {
				overallTrend,
				improvingSkills,
				challengingSkills,
				sessionsCount,
			};

			// 3. 今日の方針を生成
			const todaysFocus = {
				focusSkills:
					challengingSkills.length > 0
						? challengingSkills
						: ["tracking", "flick"],
				recommendedDuration: 30,
				recommendedScenarios:
					sessionsCount > 0
						? recentScores.slice(0, 3).map((s) => s.scenarioName)
						: ["Tile Frenzy", "1wall 6targets"],
			};

			// 4. アクティブなプレイリストを取得
			const activePlaylist = await db.query.playlistsTable.findFirst({
				where: (t, { and, eq }) =>
					and(eq(t.userId, userId), eq(t.isActive, true)),
				orderBy: (t, { desc }) => desc(t.createdAt),
			});

			const activePlaylistInfo = activePlaylist
				? {
						hasPlaylist: true,
						playlistId: activePlaylist.id,
						title: activePlaylist.title,
						scenariosCount: Array.isArray(activePlaylist.scenarios)
							? activePlaylist.scenarios.length
							: 0,
					}
				: {
						hasPlaylist: false,
					};

			// 5. 最新のデイリーレポートを取得
			const latestReport = await db.query.dailyReportsTable.findFirst({
				where: (t, { eq }) => eq(t.userId, userId),
				orderBy: (t, { desc }) => desc(t.createdAt),
			});

			const latestReportInfo = latestReport
				? {
						hasReport: true,
						reportId: latestReport.id,
						generatedAt: latestReport.createdAt,
						performanceRating: latestReport.performanceRating,
					}
				: {
						hasReport: false,
					};

			// 6. ステータスレスポンスを返却
			return c.json({
				userId,
				userContext: userContext.contextType,
				todaysFocus,
				recentTrends,
				activePlaylist: activePlaylistInfo,
				latestReport: latestReportInfo,
			});
		} catch (error) {
			console.error("Status API error:", error);
			return c.json(
				{
					error: "Failed to get coaching status",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	})

	/**
	 * Explicitly trigger playlist generation
	 */
	.post(
		"/playlist/generate",
		zValidator(
			"json",
			z.object({
				targetGame: z.string().optional(),
				weakAreas: z.array(z.string()).optional(),
			}),
		),
		async (c) => {
			const user = c.var.user;
			const { targetGame, weakAreas } = c.req.valid("json");
			const langGraph = c.var.langGraph;

			try {
				// Task Graph Service を取得
				const taskGraphService = langGraph.taskGraphService;

				// Task Graph を実行
				const result = await taskGraphService.invoke({
					userId: user.id,
					taskType: "playlist_building",
				});

				// タスク実行失敗
				if (result.metadata.status === "failure") {
					return c.json(
						{
							error: "Task execution failed",
							message: result.metadata.errorMessage,
						},
						500,
					);
				}

				// Playlist 型を返す
				const taskResult = result.taskResult;
				if (taskResult?.type === "playlist") {
					return c.json(taskResult.data);
				}

				return c.json(
					{
						error: "Invalid task result type",
						message: "Expected playlist type",
					},
					500,
				);
			} catch (error) {
				console.error("Playlist generation error:", error);
				return c.json(
					{
						error: "Failed to generate playlist",
						message: error instanceof Error ? error.message : "Unknown error",
					},
					500,
				);
			}
		},
	)

	/**
	 * Get progress review
	 */
	.get("/progress/review", async (c) => {
		const user = c.var.user;
		const days = Number.parseInt(c.req.query("days") || "7");
		const langGraph = c.var.langGraph;

		try {
			// Task Graph Service を取得
			const taskGraphService = langGraph.taskGraphService;

			// Task Graph を実行
			const result = await taskGraphService.invoke({
				userId: user.id,
				taskType: "progress_review",
			});

			// タスク実行失敗
			if (result.metadata.status === "failure") {
				return c.json(
					{
						error: "Task execution failed",
						message: result.metadata.errorMessage,
					},
					500,
				);
			}

			// ProgressReport 型に変換
			const taskResult = result.taskResult;
			if (taskResult?.type === "review") {
				// Task Graph の返り値を ProgressReport 型に変換
				const reviewData = taskResult.data as any;
				const progressReport = {
					userId: user.id,
					reviewPeriod: {
						start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
						end: new Date(),
						days,
					},
					daysInactive: reviewData.daysInactive || 0,
					beforePausePerformance: {
						avgScore: 0,
						strongSkills: [],
						activityFrequency: 0,
					},
					goalProgress: [],
					rehabilitationPlan: reviewData.nextGoals || [],
					motivationalMessage:
						reviewData.progressSummary ||
						"お帰りなさい！一緒に頑張りましょう。",
					generatedAt: new Date(),
				};

				return c.json(progressReport);
			}

			return c.json(
				{
					error: "Invalid task result type",
					message: "Expected review type",
				},
				500,
			);
		} catch (error) {
			console.error("Progress review error:", error);
			return c.json(
				{
					error: "Failed to generate progress review",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	})

	/**
	 * Trigger score analysis
	 */
	.post("/analysis/scores", async (c) => {
		const user = c.var.user;
		const langGraph = c.var.langGraph;

		try {
			// Task Graph Service を取得
			const taskGraphService = langGraph.taskGraphService;

			// Task Graph を実行
			const result = await taskGraphService.invoke({
				userId: user.id,
				taskType: "score_analysis",
			});

			// タスク実行失敗
			if (result.metadata.status === "failure") {
				return c.json(
					{
						error: "Task execution failed",
						message: result.metadata.errorMessage,
					},
					500,
				);
			}

			// ScoreAnalysis 型に変換
			const taskResult = result.taskResult;
			if (taskResult?.type === "analysis") {
				// Task Graph の返り値を ScoreAnalysis 型に変換
				const analysisData = taskResult.data as any;

				// period の変換処理
				let periodStart: Date;
				let periodEnd: Date = new Date();

				if (analysisData.period === "last_24h") {
					periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
				} else if (analysisData.period === "last_7d") {
					periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
				} else if (analysisData.period && analysisData.period.includes(" - ")) {
					// "YYYY-MM-DD - YYYY-MM-DD" 形式
					const [startStr, endStr] = analysisData.period.split(" - ");
					periodStart = new Date(startStr);
					periodEnd = new Date(endStr);
				} else {
					// デフォルト: 過去7日間
					periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
				}

				const scoreAnalysis = {
					userId: user.id,
					period: {
						start: periodStart,
						end: periodEnd,
					},
					trend: analysisData.trend || "stable",
					strengths: analysisData.strengths || [],
					challenges: analysisData.weaknesses || analysisData.challenges || [],
					milestones: analysisData.recommendations || [],
					chartData: {
						labels: [],
						datasets: [],
					},
					createdAt: new Date(),
				};

				return c.json(scoreAnalysis);
			}

			return c.json(
				{
					error: "Invalid task result type",
					message: "Expected analysis type",
				},
				500,
			);
		} catch (error) {
			console.error("Score analysis error:", error);
			return c.json(
				{
					error: "Failed to analyze scores",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	})

	/**
	 * Get daily report
	 */
	.get("/daily-report", async (c) => {
		const user = c.var.user;
		const date = c.req.query("date") || new Date().toISOString().split("T")[0];
		const langGraph = c.var.langGraph;

		try {
			// Task Graph Service を取得
			const taskGraphService = langGraph.taskGraphService;

			// Task Graph を実行
			const result = await taskGraphService.invoke({
				userId: user.id,
				taskType: "daily_report",
			});

			// タスク実行失敗
			if (result.metadata.status === "failure") {
				return c.json(
					{
						error: "Task execution failed",
						message: result.metadata.errorMessage,
					},
					500,
				);
			}

			// DailyReport 型に変換
			const taskResult = result.taskResult;
			if (taskResult?.type === "report") {
				// Task Graph の返り値を DailyReport 型に変換
				const reportData = taskResult.data as any;
				const dailyReport = {
					id: `daily_${user.id}_${date}`,
					userId: user.id,
					date: new Date(date),
					sessionsCount: reportData.sessionsToday || 0,
					totalDuration: reportData.totalPracticeTime || 0,
					performanceRating: (reportData.performance === "良好"
						? "good"
						: "normal") as "good" | "normal" | "needs_improvement",
					achievements: reportData.achievements || [],
					challenges: reportData.challenges || [],
					tomorrowRecommendations: {
						focusSkills: reportData.tomorrowGoals || [],
						recommendedScenarios: [],
						recommendedDuration: 30,
					},
					createdAt: new Date(),
				};

				return c.json(dailyReport);
			}

			return c.json(
				{
					error: "Invalid task result type",
					message: "Expected report type",
				},
				500,
			);
		} catch (error) {
			console.error("Daily report error:", error);
			return c.json(
				{
					error: "Failed to generate daily report",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	})

	/**
	 * Get current coaching context
	 */
	.get("/context", async (c) => {
		const user = c.var.user;
		const langGraph = c.var.langGraph;

		try {
			const result = await langGraph.invoke(user.id, [], {
				threadId: user.id,
			});

			return c.json({
				success: true,
				context: {
					userId: user.id,
					currentPhase: result.currentPhase,
					daysInactive: result.daysInactive,
					newScoresCount: result.newScoresCount,
					hasPlaylist: result.hasPlaylist,
					isNewUser: result.isNewUser,
				},
			});
		} catch (error) {
			console.error("Context fetch error:", error);
			return c.json(
				{
					error: "Failed to get coaching context",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	});
