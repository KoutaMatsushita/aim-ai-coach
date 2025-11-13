/**
 * Intent Detection Service
 * Task 4.1: インテント検出ロジックを実装
 *
 * ユーザーメッセージからインテント（意図）を検出し、適切なタスク種別を特定する
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { TaskType } from "../types";

/**
 * インテント検出結果
 */
export interface IntentDetectionResult {
	intent: "task_execution" | "information_request" | "general_conversation";
	taskType: TaskType | null;
	confidence: number; // 0.0 - 1.0
}

/**
 * インテント検出プロンプト
 */
const INTENT_DETECTION_PROMPT = `あなたはユーザーの意図を分析する専門家です。
ユーザーメッセージを分析し、以下のいずれかのインテントを検出してください：

# インテント種別
1. **task_execution**: ユーザーが明示的にタスク実行を依頼している
   - 例: "プレイリスト作って", "今日のスコア分析して", "進捗確認したい", "デイリーレポート生成"

2. **information_request**: ユーザーが情報や説明を求めている
   - 例: "プレイリストって何？", "分析結果を教えて", "どうやって使うの？"

3. **general_conversation**: 一般的な会話やアドバイス要求
   - 例: "こんにちは", "調子はどう？", "エイム練習のコツを教えて"

# タスク種別（task_execution の場合のみ）
- **playlist_building**: プレイリスト構築・作成
  - キーワード: "プレイリスト作", "練習メニュー生成", "カスタムプラン"

- **score_analysis**: スコア分析
  - キーワード: "スコア分析", "パフォーマンス評価", "今日の結果"

- **progress_review**: 進捗レビュー
  - キーワード: "進捗確認", "成長レビュー", "振り返り"

- **daily_report**: デイリーレポート
  - キーワード: "今日の振り返り", "デイリーレポート", "一日のまとめ"

# 信頼度スコア
- 1.0: 非常に明確なインテント（キーワード完全一致）
- 0.7-0.9: 高信頼度（文脈から明確に判断可能）
- 0.4-0.6: 中信頼度（やや曖昧だが推測可能）
- 0.0-0.3: 低信頼度（不明確、確認が必要）

# 応答フォーマット
必ず以下の JSON 形式で応答してください：
{
  "intent": "task_execution" | "information_request" | "general_conversation",
  "taskType": "playlist_building" | "score_analysis" | "progress_review" | "daily_report" | null,
  "confidence": 0.0 - 1.0
}

# 判定ルール
- task_execution: 「～して」「～作って」「～生成」などの依頼表現がある
- information_request: 「～とは」「～って何」「教えて」などの質問表現がある
- general_conversation: 上記以外の会話
- 空メッセージや意味不明なメッセージは general_conversation、confidence < 0.3
- 複数のインテントが混在する場合、より強い意図を優先`;

/**
 * パターンマッチングによるインテント検出（フォールバック）
 */
function detectIntentByPattern(message: string): IntentDetectionResult {
	const lowerMessage = message.toLowerCase();

	// Task Execution パターン
	const taskPatterns = {
		playlist_building: [
			"プレイリスト作",
			"練習メニュー生成",
			"カスタムプラン",
			"プレイリスト生成",
			"プレイリスト構築",
		],
		score_analysis: [
			"スコア分析",
			"パフォーマンス評価",
			"今日の結果",
			"分析して",
			"今日のスコア",
		],
		daily_report: [
			"今日の振り返り",
			"デイリーレポート",
			"一日のまとめ",
			"振り返りレポート",
		],
		progress_review: ["進捗確認", "成長レビュー", "振り返り", "進捗"],
	};

	// タスク実行キーワードをチェック
	for (const [taskType, patterns] of Object.entries(taskPatterns)) {
		for (const pattern of patterns) {
			if (lowerMessage.includes(pattern.toLowerCase())) {
				return {
					intent: "task_execution",
					taskType: taskType as TaskType,
					confidence: 0.9,
				};
			}
		}
	}

	// Information Request パターン
	const infoPatterns = ["って何", "とは", "教えて", "どうやって", "説明して"];
	if (infoPatterns.some((pattern) => lowerMessage.includes(pattern))) {
		return {
			intent: "information_request",
			taskType: null,
			confidence: 0.8,
		};
	}

	// 挨拶パターン
	const greetingPatterns = [
		"こんにちは",
		"こんばんは",
		"おはよう",
		"はじめまして",
		"よろしく",
	];
	if (greetingPatterns.some((pattern) => lowerMessage.includes(pattern))) {
		return {
			intent: "general_conversation",
			taskType: null,
			confidence: 0.95,
		};
	}

	// デフォルト: 一般会話（低信頼度）
	return {
		intent: "general_conversation",
		taskType: null,
		confidence: 0.5,
	};
}

/**
 * ユーザーメッセージからインテントを検出
 *
 * @param message - ユーザーメッセージ
 * @returns インテント検出結果
 */
export async function detectIntent(
	message: string,
): Promise<IntentDetectionResult> {
	// 空メッセージの場合
	if (!message || message.trim().length === 0) {
		return {
			intent: "general_conversation",
			taskType: null,
			confidence: 0.2,
		};
	}

	// まずパターンマッチングを試行
	const patternResult = detectIntentByPattern(message);

	// 高信頼度（>= 0.8）の場合はパターンマッチング結果を返す
	if (patternResult.confidence >= 0.8) {
		console.log(
			`[Intent Detection] Pattern Match - Message: "${message.substring(0, 50)}...", Intent: ${patternResult.intent}, TaskType: ${patternResult.taskType}, Confidence: ${patternResult.confidence}`,
		);
		return patternResult;
	}

	// パターンマッチング信頼度が低い場合、LLM で検出
	try {
		const model = new ChatGoogleGenerativeAI({
			model: "gemini-2.0-flash-exp",
			temperature: 0.3,
		});

		const response = await model.invoke([
			new SystemMessage(INTENT_DETECTION_PROMPT),
			new HumanMessage(message),
		]);

		const content = response.content.toString();

		// JSON 部分を抽出
		const jsonMatch =
			content.match(/```json\s*([\s\S]*?)\s*```/) ||
			content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			console.warn(
				"[Intent Detection] Failed to parse JSON, using pattern result:",
				content,
			);
			return patternResult;
		}

		const jsonStr = jsonMatch[1] || jsonMatch[0];
		const result = JSON.parse(jsonStr) as IntentDetectionResult;

		// バリデーション
		if (
			!result.intent ||
			typeof result.confidence !== "number" ||
			result.confidence < 0 ||
			result.confidence > 1
		) {
			console.warn(
				"[Intent Detection] Invalid result, using pattern result:",
				result,
			);
			return patternResult;
		}

		console.log(
			`[Intent Detection] LLM - Message: "${message.substring(0, 50)}...", Intent: ${result.intent}, TaskType: ${result.taskType}, Confidence: ${result.confidence}`,
		);

		return result;
	} catch (error) {
		console.warn("[Intent Detection] LLM error, using pattern result:", error);
		return patternResult;
	}
}
