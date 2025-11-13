/**
 * Chat Graph
 * Task 3: Chat Graph の実装
 *
 * 会話型コーチングを担当する LangGraph
 * ユーザーとの自然言語対話、インテント検出、Task Graph への委譲を行う
 */

import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import type { MastraVector } from "@mastra/core/vector";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { type ChatGraphState, ChatGraphStateAnnotation } from "../types";

/**
 * コンテキスト検出ノード
 * Task 3.2: コンテキスト検出ノードを Chat Graph に統合
 *
 * ユーザーの活動状況とデータ状態からコンテキストを自動検出する
 */
async function detectContextNode(
	state: ChatGraphState,
	db: DrizzleD1Database<any>,
): Promise<Partial<ChatGraphState>> {
	const { userId } = state;

	// コンテキスト検出ユーティリティをインポート
	const { detectUserContext } = await import("../services/context-detection");

	// TODO: hasPlaylist の判定ロジックを実装
	// 現時点では false を仮定
	const hasPlaylist = false;

	// ユーザーコンテキストを検出
	const result = await detectUserContext(userId, hasPlaylist, db);

	console.log("[Chat Graph] Context detected:", {
		userId,
		userContext: result.userContext,
		daysInactive: result.daysInactive,
		newScoresCount: result.newScoresCount,
		isNewUser: result.isNewUser,
	});

	return {
		userContext: result.userContext,
	};
}

/**
 * Chat Agent ノード
 * Task 3.3: Chat Agent ノードの実装
 * Task 4.1: インテント検出ロジックを統合
 * Task 4.2: Task Graph への委譲ロジックを実装
 *
 * ユーザーメッセージを処理し、応答を生成する
 */
async function chatAgentNode(
	state: ChatGraphState,
	vectorStore: MastraVector,
	db: DrizzleD1Database<any>,
): Promise<Partial<ChatGraphState>> {
	const { userId, userContext, messages } = state;

	// 最新のユーザーメッセージを取得
	const lastUserMessage = messages.filter((msg) => msg.role === "user").pop();
	if (!lastUserMessage) {
		return {
			messages: [
				{
					role: "assistant",
					content:
						"メッセージを受け取りました。何かお手伝いできることはありますか？",
				},
			],
		};
	}

	// Task 4.1: インテント検出
	const { detectIntent } = await import("../services/intent-detection");
	const intentResult = await detectIntent(lastUserMessage.content);

	console.log("[Chat Graph] Intent detected:", {
		userId,
		intent: intentResult.intent,
		taskType: intentResult.taskType,
		confidence: intentResult.confidence,
	});

	// Task 4.2: Task Graph への委譲
	if (
		intentResult.intent === "task_execution" &&
		intentResult.confidence >= 0.7
	) {
		try {
			// Task Graph Service をインポート
			const { TaskGraphService } = await import("./task-graph");
			const taskGraphService = new TaskGraphService(vectorStore, db);

			// Task Graph を実行
			const taskResult = await taskGraphService.invoke({
				userId,
				taskType: intentResult.taskType!,
				userContext,
			});

			// タスク実行成功
			if (taskResult.metadata.status === "success") {
				console.log("[Chat Graph] Task Graph execution success:", {
					userId,
					taskType: intentResult.taskType,
					executedAt: taskResult.metadata.executedAt,
				});

				return {
					messages: [
						{
							role: "assistant",
							content:
								taskResult.taskResult?.content || "タスクが完了しました。",
						},
					],
				};
			}

			// タスク実行失敗
			console.error("[Chat Graph] Task Graph execution failed:", {
				userId,
				taskType: intentResult.taskType,
				error: taskResult.metadata.errorMessage,
			});

			return {
				messages: [
					{
						role: "assistant",
						content: `申し訳ございません。タスクの実行中にエラーが発生しました。もう一度お試しいただくか、別の方法でお手伝いさせていただけますか？\n\n（エラー詳細はログに記録されました）`,
					},
				],
			};
		} catch (error) {
			// Task Graph 呼び出し自体が失敗
			console.error("[Chat Graph] Task Graph invocation failed:", error);

			return {
				messages: [
					{
						role: "assistant",
						content: `申し訳ございません。システムエラーが発生しました。しばらくしてから再度お試しください。\n\n（エラー詳細: ${(error as Error).message}）`,
					},
				],
			};
		}
	}

	// 信頼度が低い場合、ユーザーに確認
	if (intentResult.confidence < 0.7) {
		return {
			messages: [
				{
					role: "assistant",
					content: `申し訳ございません、ご要望を正確に理解できませんでした。以下のいずれかをお試しください：\n- プレイリスト作成\n- スコア分析\n- 進捗レビュー\n- デイリーレポート\n\nまたは、質問やアドバイスが必要な場合はお気軽にお尋ねください。`,
				},
			],
		};
	}

	// information_request または general_conversation の場合は通常の会話を続行
	const { createModel } = await import("../services/model-factory");
	const model = createModel("chat");

	// User Tools と RAG Tools をインポート
	const {
		findUserTool,
		findKovaaksScoresTool,
		findAimlabTasksTool,
		calculateUserStatsTool,
	} = await import("../tools/user-tools");

	const {
		createVectorSearchTool,
		createAddYoutubeContentTool,
		createAddTextKnowledgeTool,
		createPersonalizedRecommendationTool,
	} = await import("../tools/rag-tools");

	// RAG Tools を作成
	const ragTools = [
		createVectorSearchTool(vectorStore),
		createAddYoutubeContentTool(vectorStore),
		createAddTextKnowledgeTool(vectorStore),
		createPersonalizedRecommendationTool(vectorStore),
	];

	// User Tools
	const userTools = [
		findUserTool,
		findKovaaksScoresTool,
		findAimlabTasksTool,
		calculateUserStatsTool,
	];

	// ツールをモデルにバインド
	const modelWithTools = model.bindTools([...userTools, ...ragTools]);

	// システムプロンプトの構築
	const systemPrompt = `あなたは「Aim AI Coach」。FPS プレイヤーのエイム上達をデータ駆動で指導する userId: ${userId} の専属パーソナルコーチです。

# 目的
- ユーザーのエイム練習データ（Kovaaks、Aim Lab）を分析し、客観的なアドバイスを提供
- パーソナライズされたプレイリスト構築支援
- 継続的な成長をサポート

# 利用可能なツール
- find_user: ユーザー情報取得
- find_kovaaks_scores: Kovaaks スコア取得（期間フィルタリング可能）
- find_aimlab_tasks: Aim Lab タスク取得
- calculate_user_stats: ユーザー統計計算
- vector_search: エイムコーチング知識検索
- get_personalized_recommendations: パーソナライズド推奨

# 現在のユーザーコンテキスト
${userContext === "new_user" ? "新規ユーザー: 初めてのトレーニングをサポートしましょう" : ""}
${userContext === "returning_user" ? "復帰ユーザー: 久しぶりのトレーニング再開を歓迎しましょう" : ""}
${userContext === "playlist_recommended" ? "プレイリスト推奨: カスタムトレーニングプランの構築を提案しましょう" : ""}
${userContext === "analysis_recommended" ? "分析推奨: 最近のトレーニング成果を分析しましょう" : ""}
${userContext === "active_user" ? "アクティブユーザー: 継続的な成長をサポートしましょう" : ""}

# 出力フォーマット
- 日本語で応答
- データに基づいた客観的なアドバイス
- 励ましとモチベーション向上を心がける
- 具体的で実践的な提案を行う`;

	// メッセージを LangChain 形式に変換
	const { HumanMessage, AIMessage, SystemMessage } = await import(
		"@langchain/core/messages"
	);

	const langchainMessages = [
		new SystemMessage(systemPrompt),
		...messages.map((msg) =>
			msg.role === "user"
				? new HumanMessage(msg.content)
				: new AIMessage(msg.content),
		),
	];

	// モデルを実行
	const response = await modelWithTools.invoke(langchainMessages);

	console.log("[Chat Graph] Chat Agent response:", {
		userId,
		userContext,
		messageCount: messages.length,
		responseLength: response.content.toString().length,
	});

	// 応答メッセージを追加
	return {
		messages: [{ role: "assistant", content: response.content.toString() }],
	};
}

/**
 * Chat Graph の作成
 * Task 3.1: Chat Graph のスケルトンを作成
 *
 * @param vectorStore - RAG 用ベクトルストア
 * @param db - データベースインスタンス
 * @returns コンパイル済み Chat Graph
 */
export function createChatGraph(
	vectorStore: MastraVector,
	db: DrizzleD1Database<any>,
) {
	// StateGraph を ChatGraphState で初期化
	const graph = new StateGraph(ChatGraphStateAnnotation);

	// ノードを追加
	graph.addNode("detectContext", (state: ChatGraphState) =>
		detectContextNode(state, db),
	);
	graph.addNode("chatAgent", (state: ChatGraphState) =>
		chatAgentNode(state, vectorStore, db),
	);

	// エッジの設定
	graph.addEdge("__start__", "detectContext");
	graph.addEdge("detectContext", "chatAgent");
	graph.addEdge("chatAgent", "__end__");

	// MemorySaver でチェックポインターを設定
	const checkpointer = new MemorySaver();

	// グラフをコンパイル
	return graph.compile({ checkpointer });
}

/**
 * Chat Graph Service
 * Task 3.1: StateGraph を ChatGraphState で初期化
 *
 * 会話型コーチングサービス
 */
export class ChatGraphService {
	private graph: ReturnType<typeof createChatGraph>;

	constructor(vectorStore: MastraVector, db: DrizzleD1Database<any>) {
		this.graph = createChatGraph(vectorStore, db);
	}

	/**
	 * 会話メッセージを処理し、完全な結果を返す（非ストリーミング）
	 */
	async invoke(
		userId: string,
		messages: Array<{ role: string; content: string }>,
		options?: {
			threadId?: string;
			configurable?: Record<string, unknown>;
		},
	): Promise<ChatGraphState> {
		const threadId = options?.threadId || userId;

		const config = {
			configurable: {
				thread_id: threadId,
				...options?.configurable,
			},
		};

		// グラフを実行（非ストリーミング）
		const result = await this.graph.invoke(
			{
				userId,
				threadId,
				messages,
			},
			config,
		);

		return result;
	}

	/**
	 * 会話メッセージを処理し、ストリーミング応答を返す
	 */
	async *stream(
		userId: string,
		messages: Array<{ role: string; content: string }>,
		options?: {
			threadId?: string;
			configurable?: Record<string, unknown>;
		},
	): AsyncIterator<Partial<ChatGraphState>> {
		const threadId = options?.threadId || userId;

		const config = {
			configurable: {
				thread_id: threadId,
				...options?.configurable,
			},
		};

		// グラフを実行（ストリーミング）
		const stream = await this.graph.stream(
			{
				userId,
				threadId,
				messages,
			},
			config,
		);

		for await (const chunk of stream) {
			yield chunk;
		}
	}

	/**
	 * 会話履歴を取得
	 * Task 5.2: 会話履歴取得機能を実装
	 */
	async getMessages(
		userId: string,
		options?: { threadId?: string },
	): Promise<{
		messages: Array<{ role: string; content: string }>;
		userContext: string;
		threadId: string;
	}> {
		const threadId = options?.threadId || userId;

		try {
			// チェックポインターから状態を取得
			const config = {
				configurable: {
					thread_id: threadId,
				},
			};

			// getState を使用してチェックポイントから状態を取得
			const state = await this.graph.getState(config);

			// 状態が存在しない場合は空の履歴を返す
			if (!state || !state.values) {
				console.log("[Chat Graph] No history found for thread:", threadId);
				return {
					messages: [],
					userContext: "active_user",
					threadId,
				};
			}

			// チェックポイントから messages と userContext を取得
			const messages = state.values.messages || [];
			const userContext = state.values.userContext || "active_user";

			console.log("[Chat Graph] Retrieved history:", {
				threadId,
				messageCount: messages.length,
				userContext,
			});

			return {
				messages,
				userContext,
				threadId,
			};
		} catch (error) {
			// エラーが発生しても空の履歴を返す
			console.error("[Chat Graph] Error retrieving messages:", error);
			return {
				messages: [],
				userContext: "active_user",
				threadId,
			};
		}
	}
}
