/**
 * Task Graph
 * Task 6: Task Graph の実装
 *
 * タスク実行を担当する LangGraph
 * プレイリスト構築、スコア分析、進捗レビュー、デイリーレポートを実行
 */

import { StateGraph } from "@langchain/langgraph";
import type { MastraVector } from "@mastra/core/vector";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { type TaskGraphState, TaskGraphStateAnnotation } from "../types";

/**
 * Task Router
 * Task 6.2: taskType に基づいて適切なノードにルーティング
 */
function taskRouter(state: TaskGraphState): string {
	const { taskType } = state;

	const routeMap = {
		daily_report: "daily_report",
		score_analysis: "score_analysis",
		playlist_building: "playlist_builder",
		progress_review: "progress_review",
	};

	return routeMap[taskType];
}

/**
 * Playlist Builder Node
 * Task 7.1: プレイリスト構築タスク (LLM統合版 with Structured Output)
 */
async function playlistBuilderNode(
	state: TaskGraphState,
	vectorStore: MastraVector,
	db: DrizzleD1Database<any>,
): Promise<Partial<TaskGraphState>> {
	const { userId } = state;

	console.log("[Task Graph] Playlist Builder (LLM):", { userId });

	try {
		// データベースから最新スコアを取得
		const recentScores = await db.query.kovaaksScoresTable.findMany({
			where: (t, { eq }) => eq(t.userId, userId),
			limit: 30,
			orderBy: (t, { desc }) => desc(t.runEpochSec),
		});

		if (recentScores.length === 0) {
			// スコアがない場合は基本的なプレイリストを提案
			const playlist = {
				id: `playlist_${Date.now()}`,
				userId,
				title: "初心者向けエイム練習プレイリスト",
				description: "基礎的なエイムスキルを身につけるための入門プレイリスト",
				scenarios: [
					{
						name: "1w6ts reload",
						duration: 300,
						difficulty: "beginner",
						focusSkills: ["tracking", "precision"],
					},
					{
						name: "1w2ts reload",
						duration: 300,
						difficulty: "beginner",
						focusSkills: ["flicking", "target_switching"],
					},
				],
				targetWeaknesses: ["基礎スキル習得"],
				totalDuration: 600,
				reasoning: "まずは基礎的なシナリオで練習を始めましょう",
				createdAt: new Date(),
				isActive: true,
			};

			return {
				taskResult: {
					type: "playlist",
					data: playlist,
					content: `プレイリストを作成しました: ${playlist.title}`,
				},
			};
		}

		// LLM用のデータ準備
		const scoresData = recentScores.map((s) => ({
			scenario: s.scenarioName,
			score: s.score,
			accuracy: s.accuracy,
			kills: s.kills,
			deaths: s.deaths,
			damage: s.damage,
			date: new Date(s.runEpochSec * 1000).toISOString(),
		}));

		// シナリオごとの統計を計算
		const scenarioStats = new Map<
			string,
			{ scores: number[]; accuracies: number[] }
		>();
		for (const score of recentScores) {
			if (!scenarioStats.has(score.scenarioName)) {
				scenarioStats.set(score.scenarioName, { scores: [], accuracies: [] });
			}
			const stats = scenarioStats.get(score.scenarioName)!;
			stats.scores.push(score.score);
			stats.accuracies.push(score.accuracy);
		}

		const scenarioSummary = Array.from(scenarioStats.entries()).map(
			([name, stats]) => ({
				scenario: name,
				avgScore:
					Math.round(
						(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) *
							10,
					) / 10,
				avgAccuracy:
					Math.round(
						(stats.accuracies.reduce((a, b) => a + b, 0) /
							stats.accuracies.length) *
							1000,
					) / 1000,
				attempts: stats.scores.length,
			}),
		);

		// LLM呼び出し (Structured Output使用)
		const { ChatGoogleGenerativeAI } = await import(
			"@langchain/google-genai"
		);
		const { HumanMessage } = await import("@langchain/core/messages");

		const model = new ChatGoogleGenerativeAI({
			model: "gemini-2.5-flash",
			temperature: 0.7,
		}).withStructuredOutput({
			type: "object",
			properties: {
				weaknesses: {
					type: "array",
					items: { type: "string" },
					description: "弱点リスト（2-4個）",
				},
				scenarios: {
					type: "array",
					items: {
						type: "object",
						properties: {
							name: { type: "string" },
							duration: { type: "number" },
							difficulty: {
								type: "string",
								enum: ["beginner", "intermediate", "advanced"],
							},
							focusSkills: {
								type: "array",
								items: { type: "string" },
							},
						},
						required: ["name", "duration", "difficulty", "focusSkills"],
					},
				},
				title: { type: "string" },
				description: { type: "string" },
				reasoning: { type: "string" },
			},
			required: ["weaknesses", "scenarios", "title", "description", "reasoning"],
		});

		const prompt = `あなたはFPSエイムコーチの専門家です。以下のユーザーのスコアデータを分析し、最適な練習プレイリストを構築してください。

## 最近のスコアデータ
${JSON.stringify(scoresData, null, 2)}

## シナリオ別統計
${JSON.stringify(scenarioSummary, null, 2)}

## タスク
上記のデータから以下を判断し、日本語で回答してください：

1. **weaknesses**: 弱点（配列、2-4個）
   - データから明確に読み取れる改善が必要なスキルを特定

2. **scenarios**: 推奨シナリオ（配列、3-5個）
   - 各シナリオ：name (シナリオ名)、duration (秒)、difficulty、focusSkills
   - 実在するKovaaksシナリオ名を使用
   - 難易度は徐々に上がるように配置

3. **title**: プレイリストのタイトル（20文字以内）

4. **description**: プレイリストの説明（50文字以内）

5. **reasoning**: プレイリスト構築の理由（100文字程度）`;

		const response = await model.invoke([new HumanMessage(prompt)]);
		const llmResult = response.content as {
			weaknesses: string[];
			scenarios: Array<{
				name: string;
				duration: number;
				difficulty: string;
				focusSkills: string[];
			}>;
			title: string;
			description: string;
			reasoning: string;
		};

		const playlist = {
			id: `playlist_${Date.now()}`,
			userId,
			title: llmResult.title,
			description: llmResult.description,
			scenarios: llmResult.scenarios,
			targetWeaknesses: llmResult.weaknesses,
			totalDuration: llmResult.scenarios.reduce(
				(sum, s) => sum + s.duration,
				0,
			),
			reasoning: llmResult.reasoning,
			createdAt: new Date(),
			isActive: true,
		};

		console.log("[Task Graph] LLM Playlist Result:", llmResult);

		return {
			taskResult: {
				type: "playlist",
				data: playlist,
				content: `プレイリストを作成しました: ${playlist.title}`,
			},
		};
	} catch (error) {
		console.error("[Task Graph] Playlist Builder error:", error);
		throw error;
	}
}

/**
 * Score Analysis Node
 * Task 7.2: スコア分析タスク (LLM統合版 with Structured Output)
 */
async function scoreAnalysisNode(
	state: TaskGraphState,
	_vectorStore: MastraVector,
	db: DrizzleD1Database<any>,
): Promise<Partial<TaskGraphState>> {
	const { userId } = state;

	console.log("[Task Graph] Score Analysis (LLM):", { userId });

	try {
		// データベースから最新スコアを取得
		const recentScores = await db.query.kovaaksScoresTable.findMany({
			where: (t, { eq }) => eq(t.userId, userId),
			limit: 20,
			orderBy: (t, { desc }) => desc(t.runEpochSec),
		});

		if (recentScores.length === 0) {
			// スコアがない場合
			const analysisResult = {
				userId,
				period: "last_24h",
				totalSessions: 0,
				averageScore: 0,
				strengths: [],
				weaknesses: [],
				recommendations: ["まずは練習を開始してデータを蓄積しましょう"],
				trend: "stable" as const,
				analysisDate: new Date(),
			};

			return {
				taskResult: {
					type: "analysis",
					data: analysisResult,
					content: "スコアデータがありません。練習を開始してください。",
				},
			};
		}

		// LLM用のデータ準備
		const scoresData = recentScores.map((s) => ({
			scenario: s.scenarioName,
			score: s.score,
			accuracy: s.accuracy,
			kills: s.kills,
			deaths: s.deaths,
			damage: s.damage,
			date: new Date(s.runEpochSec * 1000).toISOString(),
		}));

		const totalSessions = recentScores.length;
		const averageScore =
			recentScores.reduce((sum, s) => sum + s.score, 0) / totalSessions;
		const averageAccuracy =
			recentScores.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions;

		const statistics = {
			totalSessions,
			averageScore: Math.round(averageScore * 10) / 10,
			averageAccuracy: Math.round(averageAccuracy * 1000) / 1000,
			dateRange: {
				from: new Date(
					recentScores[recentScores.length - 1].runEpochSec * 1000,
				).toISOString(),
				to: new Date(recentScores[0].runEpochSec * 1000).toISOString(),
			},
		};

		// LLM呼び出し (Structured Output使用)
		const { ChatGoogleGenerativeAI } = await import(
			"@langchain/google-genai"
		);
		const { HumanMessage } = await import("@langchain/core/messages");

		const model = new ChatGoogleGenerativeAI({
			model: "gemini-2.5-flash",
			temperature: 0.7,
		}).withStructuredOutput({
			type: "object",
			properties: {
				trend: {
					type: "string",
					enum: ["improving", "stable", "declining"],
				},
				strengths: {
					type: "array",
					items: { type: "string" },
				},
				weaknesses: {
					type: "array",
					items: { type: "string" },
				},
				recommendations: {
					type: "array",
					items: { type: "string" },
				},
			},
			required: ["trend", "strengths", "weaknesses", "recommendations"],
		});

		const prompt = `あなたはFPSエイムコーチの専門家です。以下のユーザーのスコアデータを分析してください。

## スコアデータ
${JSON.stringify(scoresData, null, 2)}

## 統計情報
${JSON.stringify(statistics, null, 2)}

## タスク
以下の観点から詳細に分析し、日本語で回答してください：

1. **trend**: パフォーマンストレンド ("improving" | "stable" | "declining")
   - 時系列でスコアが向上しているか、安定しているか、低下しているか

2. **strengths**: 強み（配列）
   - 精度、スコア、一貫性など、優れている要素

3. **weaknesses**: 弱点（配列）
   - 改善が必要な要素

4. **recommendations**: 推奨アクション（配列、3-5個）
   - 具体的で実行可能なアドバイス
   - 弱点改善と強み強化の両方を含める`;

		const response = await model.invoke([new HumanMessage(prompt)]);
		const analysis = response as {
			trend: "improving" | "stable" | "declining";
			strengths: string[];
			weaknesses: string[];
			recommendations: string[];
		};

		const analysisResult = {
			userId,
			period: "last_24h",
			totalSessions,
			averageScore: Math.round(averageScore * 10) / 10,
			strengths: analysis.strengths,
			weaknesses: analysis.weaknesses,
			recommendations: analysis.recommendations,
			trend: analysis.trend,
			analysisDate: new Date(),
		};

		console.log("[Task Graph] LLM Analysis Result:", analysis);

		return {
			taskResult: {
				type: "analysis",
				data: analysisResult,
				content: `スコア分析が完了しました。セッション数: ${analysisResult.totalSessions}`,
			},
		};
	} catch (error) {
		console.error("[Task Graph] Score Analysis error:", error);
		throw error;
	}
}

/**
 * Progress Review Node
 * Task 7.3: 進捗レビュータスク (LLM統合版 with Structured Output)
 */
async function progressReviewNode(
	state: TaskGraphState,
	_vectorStore: MastraVector,
	db: DrizzleD1Database<any>,
): Promise<Partial<TaskGraphState>> {
	const { userId } = state;

	console.log("[Task Graph] Progress Review (LLM):", { userId });

	try {
		// 過去7日間のスコアを取得
		const sevenDaysAgo = Math.floor(
			(Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000,
		);
		const weekScores = await db.query.kovaaksScoresTable.findMany({
			where: (t, { and, eq, gte }) =>
				and(eq(t.userId, userId), gte(t.runEpochSec, sevenDaysAgo)),
			orderBy: (t, { desc }) => desc(t.runEpochSec),
		});

		// 過去30日間のスコアを取得（トレンド比較用）
		const thirtyDaysAgo = Math.floor(
			(Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000,
		);
		const monthScores = await db.query.kovaaksScoresTable.findMany({
			where: (t, { and, eq, gte }) =>
				and(eq(t.userId, userId), gte(t.runEpochSec, thirtyDaysAgo)),
			orderBy: (t, { desc }) => desc(t.runEpochSec),
		});

		// 最新のアクティビティを取得
		const latestScore = weekScores[0] || monthScores[0];
		const lastActivity = latestScore
			? new Date(latestScore.runEpochSec * 1000)
			: null;
		const daysInactive = lastActivity
			? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
			: 999;

		if (weekScores.length === 0 && monthScores.length === 0) {
			// データがない場合
			const reviewResult = {
				userId,
				reviewPeriod: "last_7_days",
				daysInactive: 999,
				progressSummary: "データがありません。練習を開始しましょう！",
				achievements: [],
				areasForImprovement: ["練習の開始", "定期的な練習習慣の確立"],
				nextGoals: ["週3回の練習を目標にしましょう"],
				reviewDate: new Date(),
			};

			return {
				taskResult: {
					type: "review",
					data: reviewResult,
					content: `進捗レビューが完了しました。非アクティブ日数: 999日`,
				},
			};
		}

		// LLM用のデータ準備
		const weekData = {
			period: "last_7_days",
			sessionsCount: weekScores.length,
			scores: weekScores.map((s) => ({
				scenario: s.scenarioName,
				score: s.score,
				accuracy: s.accuracy,
				date: new Date(s.runEpochSec * 1000).toISOString(),
			})),
		};

		const monthData = {
			period: "last_30_days",
			sessionsCount: monthScores.length,
			avgScore:
				monthScores.length > 0
					? Math.round(
							(monthScores.reduce((sum, s) => sum + s.score, 0) /
								monthScores.length) *
								10,
						) / 10
					: 0,
		};

		// LLM呼び出し (Structured Output使用)
		const { ChatGoogleGenerativeAI } = await import(
			"@langchain/google-genai"
		);
		const { HumanMessage } = await import("@langchain/core/messages");

		const model = new ChatGoogleGenerativeAI({
			model: "gemini-2.5-flash",
			temperature: 0.7,
		}).withStructuredOutput({
			type: "object",
			properties: {
				progressSummary: { type: "string" },
				achievements: {
					type: "array",
					items: { type: "string" },
				},
				areasForImprovement: {
					type: "array",
					items: { type: "string" },
				},
				nextGoals: {
					type: "array",
					items: { type: "string" },
				},
			},
			required: ["progressSummary", "achievements", "areasForImprovement", "nextGoals"],
		});

		const prompt = `あなたはFPSエイムコーチの専門家です。以下のユーザーの練習データをレビューし、進捗状況を評価してください。

## 過去7日間のデータ
${JSON.stringify(weekData, null, 2)}

## 過去30日間の概要
${JSON.stringify(monthData, null, 2)}

## ユーザー情報
- 最終練習日: ${lastActivity ? lastActivity.toLocaleDateString("ja-JP") : "なし"}
- 非アクティブ日数: ${daysInactive}日

## タスク
上記のデータから以下を判断し、日本語で回答してください：

1. **progressSummary**: 進捗状況の要約（50文字程度）
   - ポジティブで具体的な表現

2. **achievements**: 達成事項（配列、2-4個）
   - この期間で達成できた具体的な成果

3. **areasForImprovement**: 改善ポイント（配列、2-3個）
   - 前向きで実行可能な表現

4. **nextGoals**: 次の目標（配列、2-3個）
   - 測定可能で達成可能な目標`;

		const response = await model.invoke([new HumanMessage(prompt)]);
		const llmResult = response.content as {
			progressSummary: string;
			achievements: string[];
			areasForImprovement: string[];
			nextGoals: string[];
		};

		const reviewResult = {
			userId,
			reviewPeriod: "last_7_days",
			daysInactive,
			progressSummary: llmResult.progressSummary,
			achievements: llmResult.achievements,
			areasForImprovement: llmResult.areasForImprovement,
			nextGoals: llmResult.nextGoals,
			reviewDate: new Date(),
		};

		console.log("[Task Graph] LLM Progress Review Result:", llmResult);

		return {
			taskResult: {
				type: "review",
				data: reviewResult,
				content: `進捗レビューが完了しました。非アクティブ日数: ${daysInactive}日`,
			},
		};
	} catch (error) {
		console.error("[Task Graph] Progress Review error:", error);
		throw error;
	}
}

/**
 * Daily Report Node
 * Task 7.4: デイリーレポートタスク (LLM統合版 with Structured Output)
 */
async function dailyReportNode(
	state: TaskGraphState,
	_vectorStore: MastraVector,
	db: DrizzleD1Database<any>,
): Promise<Partial<TaskGraphState>> {
	const { userId } = state;

	console.log("[Task Graph] Daily Report (LLM):", { userId });

	try {
		// 本日のスコアを取得
		const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
		const todayScores = await db.query.kovaaksScoresTable.findMany({
			where: (t, { and, eq, gte }) =>
				and(eq(t.userId, userId), gte(t.runEpochSec, oneDayAgo)),
			orderBy: (t, { desc }) => desc(t.runEpochSec),
		});

		// 過去7日間のスコアを取得（比較用）
		const sevenDaysAgo = Math.floor(
			(Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000,
		);
		const weekScores = await db.query.kovaaksScoresTable.findMany({
			where: (t, { and, eq, gte }) =>
				and(eq(t.userId, userId), gte(t.runEpochSec, sevenDaysAgo)),
			orderBy: (t, { desc }) => desc(t.runEpochSec),
		});

		if (todayScores.length === 0) {
			// 本日のデータがない場合
			const reportResult = {
				userId,
				date: new Date(),
				sessionsToday: 0,
				totalPracticeTime: 0,
				achievements: [],
				performance: "none",
				tomorrowGoals: ["本日の練習を開始しましょう！"],
				motivationalMessage:
					"今日はまだ練習していません。さあ、始めましょう！",
			};

			return {
				taskResult: {
					type: "report",
					data: reportResult,
					content: `デイリーレポートが完了しました。本日のセッション数: 0`,
				},
			};
		}

		// LLM用のデータ準備
		const todayData = {
			sessionsCount: todayScores.length,
			scores: todayScores.map((s) => ({
				scenario: s.scenarioName,
				score: s.score,
				accuracy: s.accuracy,
				kills: s.kills,
				deaths: s.deaths,
				time: new Date(s.runEpochSec * 1000).toISOString(),
			})),
			avgScore:
				todayScores.length > 0
					? Math.round(
							(todayScores.reduce((sum, s) => sum + s.score, 0) /
								todayScores.length) *
								10,
						) / 10
					: 0,
			avgAccuracy:
				todayScores.length > 0
					? Math.round(
							(todayScores.reduce((sum, s) => sum + s.accuracy, 0) /
								todayScores.length) *
								1000,
						) / 1000
					: 0,
		};

		const weekAverage = {
			sessionsCount: weekScores.length,
			avgScore:
				weekScores.length > 0
					? Math.round(
							(weekScores.reduce((sum, s) => sum + s.score, 0) /
								weekScores.length) *
								10,
						) / 10
					: 0,
		};

		// LLM呼び出し (Structured Output使用)
		const { ChatGoogleGenerativeAI } = await import(
			"@langchain/google-genai"
		);
		const { HumanMessage } = await import("@langchain/core/messages");

		const model = new ChatGoogleGenerativeAI({
			model: "gemini-2.5-flash",
			temperature: 0.7,
		}).withStructuredOutput({
			type: "object",
			properties: {
				achievements: {
					type: "array",
					items: { type: "string" },
				},
				performance: {
					type: "string",
					enum: ["excellent", "good", "fair", "needs_improvement"],
				},
				tomorrowGoals: {
					type: "array",
					items: { type: "string" },
				},
				motivationalMessage: { type: "string" },
			},
			required: ["achievements", "performance", "tomorrowGoals", "motivationalMessage"],
		});

		const prompt = `あなたはFPSエイムコーチの専門家です。以下のユーザーの本日の練習データをレビューし、デイリーレポートを作成してください。

## 本日のデータ
${JSON.stringify(todayData, null, 2)}

## 過去7日間の平均（比較用）
${JSON.stringify(weekAverage, null, 2)}

## タスク
上記のデータから以下を判断し、日本語で回答してください：

1. **achievements**: 本日の達成事項（配列、2-4個）
   - 今日の練習で達成できた具体的な成果

2. **performance**: 本日のパフォーマンス評価
   - "excellent" | "good" | "fair" | "needs_improvement"

3. **tomorrowGoals**: 明日の目標（配列、2-3個）
   - 明日の練習で取り組むべき具体的な目標

4. **motivationalMessage**: モチベーションメッセージ（50文字程度）
   - ユーザーを励ます前向きなメッセージ`;

		const response = await model.invoke([new HumanMessage(prompt)]);
		const llmResult = response.content as {
			achievements: string[];
			performance: "excellent" | "good" | "fair" | "needs_improvement";
			tomorrowGoals: string[];
			motivationalMessage: string;
		};

		const reportResult = {
			userId,
			date: new Date(),
			sessionsToday: todayScores.length,
			totalPracticeTime: todayScores.length * 10,
			achievements: llmResult.achievements,
			performance: llmResult.performance,
			tomorrowGoals: llmResult.tomorrowGoals,
			motivationalMessage: llmResult.motivationalMessage,
		};

		console.log("[Task Graph] LLM Daily Report Result:", llmResult);

		return {
			taskResult: {
				type: "report",
				data: reportResult,
				content: `デイリーレポートが完了しました。本日のセッション数: ${reportResult.sessionsToday}`,
			},
		};
	} catch (error) {
		console.error("[Task Graph] Daily Report error:", error);
		throw error;
	}
}

/**
 * Task Graph の作成
 * Task 6.1: StateGraph を TaskGraphState で初期化
 *
 * @param vectorStore - RAG 用ベクトルストア
 * @param db - データベースインスタンス
 * @returns コンパイル済み Task Graph
 */
export function createTaskGraph(
	vectorStore: MastraVector,
	db: DrizzleD1Database<any>,
) {
	// StateGraph を TaskGraphState で初期化
	const graph = new StateGraph(TaskGraphStateAnnotation);

	// ノードを追加
	graph.addNode("playlist_builder", (state: TaskGraphState) =>
		playlistBuilderNode(state, vectorStore, db),
	);
	graph.addNode("score_analysis", (state: TaskGraphState) =>
		scoreAnalysisNode(state, vectorStore, db),
	);
	graph.addNode("progress_review", (state: TaskGraphState) =>
		progressReviewNode(state, vectorStore, db),
	);
	graph.addNode("daily_report", (state: TaskGraphState) =>
		dailyReportNode(state, vectorStore, db),
	);

	// エントリーポイントから Task Router で適切なノードに振り分け
	graph.addConditionalEdges("__start__", taskRouter, {
		playlist_builder: "playlist_builder",
		score_analysis: "score_analysis",
		progress_review: "progress_review",
		daily_report: "daily_report",
	});

	// 各タスクノードは終了
	graph.addEdge("playlist_builder", "__end__");
	graph.addEdge("score_analysis", "__end__");
	graph.addEdge("progress_review", "__end__");
	graph.addEdge("daily_report", "__end__");

	// グラフをコンパイル
	return graph.compile();
}

/**
 * Task Graph Service
 * Task 6.3: タスク実行メタデータを管理
 *
 * タスク実行サービス
 */
export class TaskGraphService {
	private graph: ReturnType<typeof createTaskGraph>;
	private vectorStore: MastraVector;
	private db: DrizzleD1Database<any>;

	constructor(vectorStore: MastraVector, db: DrizzleD1Database<any>) {
		this.vectorStore = vectorStore;
		this.db = db;
		this.graph = createTaskGraph(vectorStore, db);
	}

	/**
	 * タスクを実行
	 * Task 6.3: executedAt, status, errorMessage を含むメタデータを返す
	 */
	async invoke(input: {
		userId: string;
		taskType:
			| "daily_report"
			| "score_analysis"
			| "playlist_building"
			| "progress_review";
		userContext?: string;
	}): Promise<{
		taskResult: any;
		metadata: {
			executedAt: Date;
			taskType: string;
			status: "success" | "failure";
			errorMessage?: string;
		};
	}> {
		const executedAt = new Date();
		const { userId, taskType, userContext } = input;

		// タスク実行開始のログ
		console.log("[Task Graph] Task execution start:", {
			userId,
			taskType,
		});

		try {
			// Task Graph を実行
			const result = await this.graph.invoke({
				userId,
				taskType,
				userContext: userContext || "active_user",
			});

			// タスク実行完了のログ
			console.log("[Task Graph] Task execution complete:", {
				userId,
				taskType,
			});

			// 成功メタデータ
			return {
				taskResult: result.taskResult || null,
				metadata: {
					executedAt,
					taskType,
					status: "success",
				},
			};
		} catch (error) {
			// エラー発生時のログ
			console.error("[Task Graph] Task execution failed:", error);

			// 失敗メタデータ
			return {
				taskResult: null,
				metadata: {
					executedAt,
					taskType,
					status: "failure",
					errorMessage: (error as Error).message,
				},
			};
		}
	}
}
