/**
 * Model Factory
 * Task 2.2: Model Factory を実装
 *
 * タスク複雑度に基づいた動的 LLM モデル選択
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * タスクタイプ
 * - "chat": Chat Graph（会話型コーチング）
 * - "task": Task Graph（複雑な分析タスク）
 */
export type ModelTaskType = "chat" | "task";

/**
 * モデル選択ロジック
 *
 * Chat Graph: gemini-2.5-flash（軽量・高速・低コスト）
 * Task Graph: gemini-2.5-pro（高性能・高精度）
 *
 * @param taskType - タスクタイプ（"chat" | "task"）
 * @returns ChatGoogleGenerativeAI インスタンス
 *
 * @example
 * ```typescript
 * // Chat Graph 用モデル
 * const chatModel = createModel("chat");
 *
 * // Task Graph 用モデル
 * const taskModel = createModel("task");
 * ```
 */
export function createModel(taskType: ModelTaskType): ChatGoogleGenerativeAI {
	// ========================================
	// モデル選択ロジック
	// ========================================

	let modelName: string;
	let reason: string;

	if (taskType === "chat") {
		// Chat Graph: 軽量モデルでコスト削減
		modelName = "gemini-2.5-flash";
		reason = "軽量な会話処理に最適化（高速・低コスト）";
	} else {
		// Task Graph: 高性能モデルで品質確保
		modelName = "gemini-2.5-pro";
		reason = "複雑な分析タスクに最適化（高品質・高精度）";
	}

	// ========================================
	// ログ出力
	// ========================================

	console.log("[Model Selection]", {
		taskType,
		model: modelName,
		reason,
	});

	// ========================================
	// モデルインスタンス生成
	// ========================================

	return new ChatGoogleGenerativeAI({
		model: modelName,
		temperature: 0.7,
	});
}
