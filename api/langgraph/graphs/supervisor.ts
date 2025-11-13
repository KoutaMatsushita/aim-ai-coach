/**
 * Supervisor Graph - Main Coaching Orchestration
 * フェーズ検出と適切なエージェントへのルーティングを担当
 */

import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Annotation, StateGraph } from "@langchain/langgraph";
import type { MastraVector } from "@mastra/core/vector";
import { db } from "../../mastra/db";
import { createRagTools } from "../tools/rag-tools";
import { userTools } from "../tools/user-tools";
import type { CoachingPhase } from "../types";

/**
 * グラフ状態の定義
 */
export const SupervisorStateAnnotation = Annotation.Root({
	// Core identity
	userId: Annotation<string>(),
	threadId: Annotation<string>(),

	// Conversation
	messages: Annotation<any[]>({
		reducer: (current, update) => [...current, ...update],
		default: () => [],
	}),

	// Phase management
	currentPhase: Annotation<CoachingPhase>({
		reducer: (_, update) => update,
		default: () => "active_training" as CoachingPhase,
	}),

	// Context flags
	daysInactive: Annotation<number>({
		reducer: (_, update) => update,
		default: () => 0,
	}),
	newScoresCount: Annotation<number>({
		reducer: (_, update) => update,
		default: () => 0,
	}),
	hasPlaylist: Annotation<boolean>({
		reducer: (_, update) => update,
		default: () => false,
	}),
	isNewUser: Annotation<boolean>({
		reducer: (_, update) => update,
		default: () => false,
	}),

	// Agent outputs
	agentOutput: Annotation<any>({
		reducer: (_, update) => update,
		default: () => null,
	}),
});

type SupervisorState = typeof SupervisorStateAnnotation.State;

/**
 * フェーズ検出ノード
 * ユーザーの状態を分析して適切なフェーズを判定
 */
async function detectPhaseNode(
	state: SupervisorState,
): Promise<Partial<SupervisorState>> {
	const { userId, hasPlaylist } = state;

	// Check user activity
	const recentScores = await db.query.kovaaksScoresTable.findMany({
		where: (t, { eq }) => eq(t.userId, userId),
		limit: 1,
		orderBy: (t, { desc }) => desc(t.runEpochSec),
	});

	const recentTasks = await db.query.aimlabTaskTable.findMany({
		where: (t, { eq }) => eq(t.userId, userId),
		limit: 1,
		orderBy: (t, { desc }) => desc(t.startedAt),
	});

	// Calculate days since last activity
	const lastScoreDate = recentScores[0]
		? new Date(recentScores[0].runEpochSec * 1000)
		: null;
	const lastTaskDate = recentTasks[0]
		? new Date(recentTasks[0].startedAt || "")
		: null;
	const lastActivity = lastScoreDate || lastTaskDate;
	const calculatedDaysInactive = lastActivity
		? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
		: 999;

	// Count new scores in last 24 hours
	const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
	const newScoresCount24h = await db.query.kovaaksScoresTable.findMany({
		where: (t, { and, eq, gte }) =>
			and(eq(t.userId, userId), gte(t.runEpochSec, oneDayAgo)),
	});

	// Check if user has any scores at all (new user detection)
	const totalScores = await db.query.kovaaksScoresTable.findMany({
		where: (t, { eq }) => eq(t.userId, userId),
		limit: 1,
	});
	const totalTasks = await db.query.aimlabTaskTable.findMany({
		where: (t, { eq }) => eq(t.userId, userId),
		limit: 1,
	});
	const calculatedIsNewUser =
		totalScores.length === 0 && totalTasks.length === 0;

	// Determine phase based on context
	let detectedPhase: CoachingPhase = "active_training";

	if (calculatedIsNewUser) {
		detectedPhase = "initial_assessment";
	} else if (!hasPlaylist) {
		detectedPhase = "playlist_building";
	} else if (newScoresCount24h.length > 5 && calculatedDaysInactive < 1) {
		detectedPhase = "score_analysis";
	} else if (calculatedDaysInactive >= 7) {
		detectedPhase = "progress_review";
	}

	console.log(
		`[Phase Detection] User: ${userId}, Detected Phase: ${detectedPhase}`,
		{
			daysInactive: calculatedDaysInactive,
			newScores24h: newScoresCount24h.length,
			isNewUser: calculatedIsNewUser,
			hasPlaylist,
		},
	);

	return {
		currentPhase: detectedPhase,
		daysInactive: calculatedDaysInactive,
		newScoresCount: newScoresCount24h.length,
		isNewUser: calculatedIsNewUser,
	};
}

/**
 * Chat Agent Node
 * 通常の会話型コーチング
 */
async function chatAgentNode(
	state: SupervisorState,
	vectorStore: MastraVector,
): Promise<Partial<SupervisorState>> {
	const { messages, userId } = state;

	// Initialize model with tools
	const model = new ChatGoogleGenerativeAI({
		model: "gemini-2.0-flash-exp",
		temperature: 0.7,
	});

	const tools = [...userTools, ...createRagTools(vectorStore)];
	const modelWithTools = model.bindTools(tools);

	// System prompt
	const systemPrompt = `あなたは「Aim AI Coach」。FPS プレイヤーのエイム上達をデータ駆動で指導する userId: ${userId} の専属パーソナルコーチ。

# 目的
- プレイヤーの弱点を定量評価し、改善優先度を明確化
- 個人の特性に基づく練習計画を提示
- データ分析とRAGツールにより高品質なコンテンツを活用した包括的指導
- 継続的な成長支援

# 利用可能なツール
- find_user: ユーザ情報の取得
- find_kovaaks_scores: Kovaaksのスコアを取得
- find_aimlab_tasks: Aimlabsのスコアを取得
- calculate_user_stats: ユーザーの統計情報を計算
- vector_search: RAG からエイムコーチや aimlabs や kovaaks のプレイリストに関する知識を取得
- add_youtube_content: YouTube動画を知識ベースに追加
- add_text_knowledge: テキスト知識を追加
- get_personalized_recommendations: パーソナライズされた推薦を取得

# 出力フォーマット
【振り返り&継続改善】【スキル帯&要約】【診断（根拠つき）】【練習プラン】【次のアクション】【計測】
※2回目以降のセッションでは冒頭に振り返り分析結果を表示

常にデータに基づいた具体的なアドバイスを提供し、ユーザーのモチベーションを維持してください。`;

	const messageList = [
		new HumanMessage(systemPrompt),
		...messages.map((m: any) =>
			m.role === "user"
				? new HumanMessage(m.content)
				: new AIMessage(m.content),
		),
	];

	// Invoke model
	const response = await modelWithTools.invoke(messageList);

	return {
		messages: [{ role: "assistant", content: response.content }],
	};
}

/**
 * Playlist Builder Node (Simplified - 詳細は別ファイル)
 */
async function playlistBuilderNode(
	state: SupervisorState,
): Promise<Partial<SupervisorState>> {
	const userId = state.userId;

	// TODO: Implement full playlist building logic
	const mockPlaylist = {
		id: `playlist_${Date.now()}`,
		userId,
		title: "カスタム練習プレイリスト",
		description: "弱点改善に特化したプレイリスト",
		scenarios: [],
		targetWeaknesses: ["tracking", "flick"],
		totalDuration: 30,
		reasoning: "プレイリスト構築中...",
		createdAt: new Date(),
		isActive: true,
	};

	return {
		agentOutput: { playlist: mockPlaylist },
		hasPlaylist: true,
		messages: [
			{
				role: "assistant",
				content: `プレイリストを作成しました: ${mockPlaylist.title}`,
			},
		],
	};
}

/**
 * Score Analysis Node (Simplified)
 */
async function scoreAnalysisNode(
	_state: SupervisorState,
): Promise<Partial<SupervisorState>> {
	// TODO: Implement full analysis logic
	const analysisMessage = `直近のスコアを分析しました。\n\n📊 パフォーマンストレンド: 改善傾向\n🎯 主な強み: Accuracy が向上中\n⚠️ 注目点: Overshots がやや多め\n\n詳細な分析結果とアドバイスを準備中...`;

	return {
		messages: [{ role: "assistant", content: analysisMessage }],
	};
}

/**
 * Progress Review Node (Simplified)
 */
async function progressReviewNode(
	state: SupervisorState,
): Promise<Partial<SupervisorState>> {
	const reviewMessage = `お久しぶりです！\n\n📈 経過観察レポートを作成中...\n- 練習の継続状況\n- 目標達成度\n- パフォーマンス変化\n\n詳細なレビューを準備しています。(状態: ${state.daysInactive}日間非アクティブ)`;

	return {
		messages: [{ role: "assistant", content: reviewMessage }],
	};
}

/**
 * Daily Report Node (Simplified)
 */
async function dailyReportNode(
	_state: SupervisorState,
): Promise<Partial<SupervisorState>> {
	const reportMessage = `📅 本日のデイリーレポート\n\n🎯 今日の練習セッション: X回\n📊 パフォーマンス: 良好\n🏆 達成事項: Personal Best更新\n\n明日の推奨練習を準備中...`;

	return {
		messages: [{ role: "assistant", content: reportMessage }],
	};
}

/**
 * Phase Router
 * 検出されたフェーズに基づいて次のノードを決定
 */
function phaseRouter(state: SupervisorState): string {
	const { currentPhase } = state;

	const routeMap: Record<CoachingPhase, string> = {
		initial_assessment: "chat_agent",
		playlist_building: "playlist_builder",
		active_training: "chat_agent",
		score_analysis: "score_analysis",
		progress_review: "progress_review",
		daily_report: "daily_report",
		adjustment_planning: "chat_agent",
	};

	return routeMap[currentPhase];
}

/**
 * Supervisor Graph の構築
 */
export function createSupervisorGraph(vectorStore: MastraVector) {
	const graph = new StateGraph(SupervisorStateAnnotation)
		// Add nodes
		.addNode("detect_phase", detectPhaseNode)
		.addNode("chat_agent", (state) => chatAgentNode(state, vectorStore))
		.addNode("playlist_builder", playlistBuilderNode)
		.addNode("score_analysis", scoreAnalysisNode)
		.addNode("progress_review", progressReviewNode)
		.addNode("daily_report", dailyReportNode)

		// Define edges
		.addEdge("__start__", "detect_phase")
		.addConditionalEdges("detect_phase", phaseRouter, {
			chat_agent: "chat_agent",
			playlist_builder: "playlist_builder",
			score_analysis: "score_analysis",
			progress_review: "progress_review",
			daily_report: "daily_report",
		})
		.addEdge("chat_agent", "__end__")
		.addEdge("playlist_builder", "__end__")
		.addEdge("score_analysis", "__end__")
		.addEdge("progress_review", "__end__")
		.addEdge("daily_report", "__end__");

	return graph.compile();
}
