/**
 * Gemini-powered content analysis service for YouTube videos
 * Specializes in aim training content analysis and categorization
 */

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { VideoTranscript, YouTubeVideo } from "./youtube.js";

export interface AnalysisInput {
	video: YouTubeVideo;
	transcript?: VideoTranscript;
	description?: string;
}

export const AimAnalysisSchema = z.object({
	aimElements: z
		.array(
			z.enum([
				"flick",
				"tracking",
				"switching",
				"target_switching",
				"precision",
				"speed",
				"smoothness",
				"reaction_time",
				"crosshair_placement",
				"micro_adjustments",
			])
		)
		.describe("エイム要素の配列"),

	difficultyLevel: z
		.enum(["beginner", "intermediate", "advanced", "expert"])
		.describe("難易度レベル"),

	targetGames: z
		.array(z.enum(["VALORANT", "CS2", "CSGO", "APEX_LEGENDS", "OVERWATCH", "GENERAL_FPS"]))
		.describe("対象ゲーム"),

	keyInsights: z.array(z.string()).describe("重要なコツや注意点"),

	practiceRecommendations: z
		.array(
			z.object({
				scenario: z.string().describe("推奨シナリオ名"),
				focus: z.string().describe("注力すべきポイント"),
				duration: z.string().optional().describe("推奨練習時間"),
			})
		)
		.describe("練習推奨事項"),

	targetAudience: z
		.enum([
			"complete_beginner",
			"beginner_with_basics",
			"intermediate_player",
			"advanced_player",
			"expert_player",
			"all_levels",
		])
		.describe("対象視聴者"),

	confidenceScore: z.number().min(0).max(1).describe("解析の信頼度 0.0-1.0"),

	summary: z.string().describe("コンテンツの要約"),
});

export type AimAnalysisResult = z.infer<typeof AimAnalysisSchema>;

export class ContentAnalyzer {
	private readonly model = google("gemini-2.0-flash-exp");

	/**
	 * YouTube動画の詳細解析を実行
	 */
	async analyzeContent(input: AnalysisInput): Promise<AimAnalysisResult> {
		const prompt = this.buildAnalysisPrompt(input);

		const result = await generateObject({
			model: this.model,
			schema: AimAnalysisSchema,
			prompt,
			temperature: 0.1, // 安定した解析結果のため低温度設定
		});

		return result.object;
	}

	/**
	 * 解析プロンプトの構築
	 */
	private buildAnalysisPrompt(input: AnalysisInput): string {
		const { video, transcript, description } = input;

		return `
あなたはFPSゲームのエイム練習専門のコンテンツアナライザーです。
4BangerKovaaksのYouTube動画を解析し、エイム練習に関する情報を構造化して抽出してください。

## 動画情報
タイトル: ${video.title}
説明: ${video.description}
投稿日: ${video.publishedAt}
再生時間: ${video.duration}秒

${
	transcript
		? `## 字幕・内容
${transcript.text}
`
		: ""
}

${
	description
		? `## 追加情報
${description}
`
		: ""
}

## 解析指針

### エイム要素の判定
- flick: 素早い照準合わせ、瞬間的な動き
- tracking: 動く標的の追跡
- switching: 複数標的間の切り替え
- target_switching: ターゲットスイッチング
- precision: 精密射撃、精度重視
- speed: 速度重視の練習
- smoothness: 滑らかな動き
- reaction_time: 反応速度
- crosshair_placement: クロスヘア配置
- micro_adjustments: 微調整

### 難易度レベルの判定基準
- beginner: 基本的な概念、初心者向け説明
- intermediate: 中級者向け、応用技術
- advanced: 上級者向け、高度なテクニック
- expert: プロレベル、極めて高度な内容

### ゲーム判定
タイトルや内容からゲーム特化度を判定。一般的なFPS理論はGENERAL_FPSとする。

### 対象視聴者の判定
コンテンツの前提知識レベルと説明の詳しさから判定。

### 信頼度スコア
以下の要素で判定:
- タイトルの明確さ (0.2)
- 説明文の詳細度 (0.2)
- 字幕の有無と質 (0.3)
- エイム関連の専門性 (0.3)

不明確な部分や推測が多い場合は信頼度を下げてください。

### 重要なポイント
- 具体的で実用的な情報を抽出
- 初心者にも理解しやすい表現
- 練習の順序や優先度も考慮
- 日本語での出力（英語コンテンツの場合は翻訳）

### 出力形式
JSON形式で、指定されたスキーマに従って構造化してください。
`;
	}

	/**
	 * バッチ解析（複数動画の並列処理）
	 */
	async batchAnalyze(
		inputs: AnalysisInput[],
		concurrency: number = 3
	): Promise<AimAnalysisResult[]> {
		const results: AimAnalysisResult[] = [];

		// 並列処理のためのチャンク分割
		for (let i = 0; i < inputs.length; i += concurrency) {
			const chunk = inputs.slice(i, i + concurrency);

			const chunkResults = await Promise.all(chunk.map((input) => this.analyzeContent(input)));

			results.push(...chunkResults);

			// API制限を考慮した間隔調整
			if (i + concurrency < inputs.length) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		return results;
	}

	/**
	 * エイム要素の重要度評価
	 */
	static evaluateAimElementImportance(elements: string[]): Record<string, number> {
		const weights: Record<string, number> = {
			flick: 0.9,
			tracking: 0.9,
			switching: 0.8,
			target_switching: 0.8,
			precision: 0.7,
			speed: 0.6,
			smoothness: 0.7,
			reaction_time: 0.8,
			crosshair_placement: 0.9,
			micro_adjustments: 0.6,
		};

		return elements.reduce(
			(acc, element) => {
				acc[element] = weights[element] || 0.5;
				return acc;
			},
			{} as Record<string, number>
		);
	}

	/**
	 * 難易度に基づくコンテンツフィルタリング
	 */
	static filterByDifficulty(
		analyses: AimAnalysisResult[],
		userSkillLevel: "Beginner" | "Intermediate" | "Advanced" | "Expert"
	): AimAnalysisResult[] {
		const difficultyMapping = {
			Beginner: ["beginner", "intermediate"],
			Intermediate: ["beginner", "intermediate", "advanced"],
			Advanced: ["intermediate", "advanced", "expert"],
			Expert: ["advanced", "expert"],
		};

		const allowedDifficulties = difficultyMapping[userSkillLevel];

		return analyses.filter((analysis) => allowedDifficulties.includes(analysis.difficultyLevel));
	}

	/**
	 * ゲーム別フィルタリング
	 */
	static filterByGame(analyses: AimAnalysisResult[], targetGame?: string): AimAnalysisResult[] {
		if (!targetGame) return analyses;

		return analyses.filter(
			(analysis) =>
				analysis.targetGames.includes(targetGame as any) ||
				analysis.targetGames.includes("GENERAL_FPS")
		);
	}
}

// Export singleton instance
export const contentAnalyzer = new ContentAnalyzer();
