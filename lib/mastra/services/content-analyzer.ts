/**
 * Gemini-powered content analysis service for YouTube videos
 * Specializes in aim training content analysis and categorization
 */

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { VideoTranscript, YouTubeVideo } from "./youtube";

/**
 * YouTube動画解析の入力パラメータ
 *
 * @interface AnalysisInput
 */
export interface AnalysisInput {
	/** YouTube動画のメタデータ（従来のメタデータベース解析用） */
	video?: YouTubeVideo;
	/** YouTube動画URLの直接指定（Gemini直接解析用） */
	videoUrl?: string;
	/** 動画の字幕・転写テキスト */
	transcript?: VideoTranscript;
	/** 追加の解析情報や説明 */
	description?: string;
}

/**
 * エイム練習動画の解析結果を定義するZodスキーマ
 *
 * @description Geminiによる動画解析の出力データ構造を定義し、
 * TypeScriptの型安全性を保証するスキーマ定義
 */
export const AimAnalysisSchema = z.object({
	/**
	 * 動画で扱われるエイム要素の配列
	 *
	 * @example ["flick", "tracking", "precision"]
	 */
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
		.describe("動画で扱われるエイム要素"),

	/**
	 * コンテンツの難易度レベル
	 *
	 * @description 初心者から上級者まで4段階で分類
	 */
	difficultyLevel: z
		.enum(["beginner", "intermediate", "advanced", "expert"])
		.describe("難易度レベル"),

	/**
	 * 対象となるFPSゲームの配列
	 *
	 * @description 特定ゲーム向けまたは一般的なFPS理論
	 * @example ["VALORANT", "APEX_LEGENDS"] または ["GENERAL_FPS"]
	 */
	targetGames: z
		.array(
			z.enum([
				"VALORANT",
				"CSGO",
				"CS2",
				"APEX_LEGENDS",
				"OVERWATCH",
				"FORTNITE",
				"PUBG",
				"COD",
				"GENERAL_FPS",
			])
		)
		.describe("対象ゲーム"),

	/**
	 * 主要な学習ポイントや洞察の配列
	 *
	 * @description 動画から得られる重要な知識やテクニック
	 */
	keyInsights: z.array(z.string()).describe("主要な洞察"),

	/**
	 * 具体的な練習推奨事項の配列
	 *
	 * @description 実践可能な練習メニューやアドバイス
	 */
	practiceRecommendations: z
		.array(
			z.object({
				/** 練習シナリオ名 */
				scenario: z.string().describe("練習シナリオ"),
				/** 練習の焦点・目的 */
				focus: z.string().describe("練習の焦点"),
				/** 推奨される練習時間 */
				duration: z.string().describe("推奨時間"),
			})
		)
		.describe("練習推奨事項"),

	/**
	 * 対象とする視聴者レベル
	 *
	 * @description コンテンツが想定する視聴者の熟練度
	 */
	targetAudience: z.enum(["beginners", "intermediate", "advanced", "all"]).describe("対象視聴者"),

	/**
	 * 動画タイトル（解析から推定または取得）
	 *
	 * @description 動画の内容を表す適切なタイトル
	 */
	title: z.string().describe("動画タイトル"),

	/**
	 * 解析結果の信頼度スコア
	 *
	 * @description 0.0から1.0の範囲で、解析の確実性を示す
	 * @minimum 0
	 * @maximum 1
	 */
	confidenceScore: z.number().min(0).max(1).describe("解析の信頼度 0.0-1.0"),

	/**
	 * 動画コンテンツの要約
	 *
	 * @description 動画の主要な内容を簡潔にまとめたテキスト
	 */
	summary: z.string().describe("コンテンツの要約"),
});

/**
 * エイム練習動画の解析結果の型定義
 *
 * @description AimAnalysisSchemaから推論された TypeScript 型
 * @see AimAnalysisSchema
 */
export type AimAnalysisResult = z.infer<typeof AimAnalysisSchema>;

/**
 * YouTube動画のエイム練習コンテンツを解析するサービスクラス
 *
 * @description Google Gemini APIを使用してFPS/エイム練習動画を解析し、
 * 構造化されたデータとして練習推奨事項や学習ポイントを抽出します。
 *
 * @example
 * ```typescript
 * const analyzer = new ContentAnalyzer();
 *
 * // メタデータベース解析
 * const result = await analyzer.analyzeContent({
 *   video: youtubeVideoData,
 *   transcript: transcriptData
 * });
 *
 * // 動画URL直接解析
 * const result2 = await analyzer.analyzeVideoUrl(
 *   "https://www.youtube.com/watch?v=VIDEO_ID"
 * );
 * ```
 */
export class ContentAnalyzer {
	private readonly model = google("gemini-2.5-pro");

	/**
	 * YouTube動画の詳細解析を実行
	 *
	 * @description 入力パラメータに基づいて動画解析を行います。
	 * videoUrlが指定されている場合はGeminiによる直接動画解析、
	 * そうでなければメタデータベースの解析を実行します。
	 *
	 * @param input - 解析対象の動画情報
	 * @returns 構造化されたエイム練習解析結果
	 *
	 * @example
	 * ```typescript
	 * // メタデータベース解析
	 * const result = await analyzer.analyzeContent({
	 *   video: {
	 *     id: "abc123",
	 *     title: "エイム練習のコツ",
	 *     description: "初心者向けエイム練習方法を解説"
	 *   },
	 *   transcript: { text: "今回はエイム練習について..." }
	 * });
	 *
	 * // 動画URL直接解析
	 * const result2 = await analyzer.analyzeContent({
	 *   videoUrl: "https://www.youtube.com/watch?v=abc123",
	 *   description: "4BangerKのエイム練習動画"
	 * });
	 * ```
	 *
	 * @throws {Error} videoUrlが無効な形式の場合
	 * @throws {Error} videoもvideoUrlも指定されていない場合
	 */
	async analyzeContent(input: AnalysisInput): Promise<AimAnalysisResult> {
		// 動画URLが直接指定されている場合は、Geminiにファイル入力として渡す
		if (input.videoUrl) {
			return this.analyzeVideoByUrl(input);
		}

		// 従来の動画メタデータベースの解析
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
	 * 動画URLを使用したGemini直接解析
	 */
	private async analyzeVideoByUrl(input: AnalysisInput): Promise<AimAnalysisResult> {
		const { videoUrl, description } = input;

		if (!videoUrl) {
			throw new Error("Video URL is required for URL-based analysis");
		}

		// YouTube URLの形式検証
		if (!ContentAnalyzer.isValidYouTubeUrl(videoUrl)) {
			throw new Error("Invalid YouTube URL format. Please provide a valid YouTube video URL.");
		}

		// 動画URL用のプロンプト構築
		const prompt = this.buildVideoUrlAnalysisPrompt(videoUrl, description);

		console.log("Prompt:", prompt);
		console.log("Video URL:", videoUrl);

		const result = await generateObject({
			model: this.model,
			schema: AimAnalysisSchema,
			prompt: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: prompt,
						},
						{
							type: "file",
							data: videoUrl,
							mediaType: "video/mp4",
						},
					],
				},
			],
			temperature: 0.1,
		});

		return result.object;
	}

	/**
	 * 解析プロンプトの構築
	 */
	private buildAnalysisPrompt(input: AnalysisInput): string {
		const { video, transcript, description } = input;

		if (!video) {
			throw new Error("Video metadata is required for metadata-based analysis");
		}

		return `
あなたはFPSゲームのエイム練習専門のコンテンツアナライザーです。
YouTube動画を解析し、エイム練習に関する情報を構造化して抽出してください。

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
	 * 動画URL解析専用プロンプトの構築
	 */
	private buildVideoUrlAnalysisPrompt(videoUrl: string, description?: string): string {
		return `
あなたはFPSゲームのエイム練習専門のコンテンツアナライザーです。
YouTube動画を直接解析し、エイム練習に関する情報を構造化して抽出してください。

## 動画URL
${videoUrl}

${
	description
		? `## 追加情報
${description}
`
		: ""
}

## 解析指針

この動画の映像と音声を分析し、以下の要素を特定してください：

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
動画内容からゲーム特化度を判定。一般的なFPS理論はGENERAL_FPSとする。

### 対象視聴者の判定
コンテンツの前提知識レベルと説明の詳しさから判定。

### 信頼度スコア
以下の要素で判定:
- 動画の実技デモンストレーション品質 (0.3)
- 説明の論理性と一貫性 (0.3)
- エイム関連の専門性 (0.2)
- 実用性とアクションアブル性 (0.2)

不明確な部分や推測が多い場合は信頼度を下げてください。

### 重要なポイント
- 動画の映像から実際のエイム動作を分析
- 音声解説がある場合は内容も考慮
- 具体的で実用的な情報を抽出
- 初心者にも理解しやすい表現
- 練習の順序や優先度も考慮
- 日本語での出力（英語コンテンツの場合は翻訳）

### 出力形式
JSON形式で、指定されたスキーマに従って構造化してください。
`;
	}

	/**
	 * 複数動画の並列解析処理
	 *
	 * @description 複数の動画を効率的に並列処理で解析します。
	 * API制限を考慮した制御された並列度で実行され、
	 * レート制限を回避するための適切な間隔調整も含まれています。
	 *
	 * @param inputs - 解析対象の動画情報の配列
	 * @param concurrency - 同時実行数（デフォルト: 3）
	 * @returns 各動画の解析結果配列
	 *
	 * @example
	 * ```typescript
	 * const inputs = [
	 *   { video: video1, transcript: transcript1 },
	 *   { video: video2, transcript: transcript2 },
	 *   { video: video3, transcript: transcript3 }
	 * ];
	 *
	 * // 2並列で実行
	 * const results = await analyzer.batchAnalyze(inputs, 2);
	 * ```
	 *
	 * @see analyzeContent
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
	 * エイム要素の重要度を評価
	 *
	 * @description 指定されたエイム要素に基づいて、各要素の重要度スコアを計算します。
	 * 事前定義された重み付けに基づいて0.0-1.0の範囲でスコアを返します。
	 *
	 * @param elements - 評価対象のエイム要素の配列
	 * @returns 各要素とその重要度スコアのマッピング
	 *
	 * @example
	 * ```typescript
	 * const importance = ContentAnalyzer.evaluateAimElementImportance([
	 *   "flick", "tracking", "precision"
	 * ]);
	 *
	 * console.log(importance);
	 * // { flick: 0.9, tracking: 0.9, precision: 0.7 }
	 * ```
	 *
	 * @static
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
	 *
	 * @description ユーザーのスキルレベルに適したコンテンツのみを抽出します。
	 * 各スキルレベルに対応する適切な難易度範囲を定義しています。
	 *
	 * @param analyses - フィルタリング対象の解析結果配列
	 * @param userSkillLevel - ユーザーのスキルレベル
	 * @returns 指定されたスキルレベルに適した解析結果の配列
	 *
	 * @example
	 * ```typescript
	 * const allAnalyses = [
	 *   { difficultyLevel: "beginner", ... },
	 *   { difficultyLevel: "advanced", ... },
	 *   { difficultyLevel: "expert", ... }
	 * ];
	 *
	 * const beginnerContent = ContentAnalyzer.filterByDifficulty(
	 *   allAnalyses,
	 *   "Beginner"
	 * );
	 * // beginnerとintermediateレベルのコンテンツが返される
	 * ```
	 *
	 * @static
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
	 * ゲーム別コンテンツフィルタリング
	 *
	 * @description 特定のゲーム向けコンテンツまたは一般的なFPS理論コンテンツを抽出します。
	 * 指定されたゲームに特化したコンテンツと、汎用的なFPSコンテンツの両方が含まれます。
	 *
	 * @param analyses - フィルタリング対象の解析結果配列
	 * @param targetGame - 対象ゲーム名（未指定の場合は全コンテンツ）
	 * @returns 指定されたゲームに関連する解析結果の配列
	 *
	 * @example
	 * ```typescript
	 * const allAnalyses = [
	 *   { targetGames: ["VALORANT"], ... },
	 *   { targetGames: ["GENERAL_FPS"], ... },
	 *   { targetGames: ["APEX_LEGENDS"], ... }
	 * ];
	 *
	 * const valorantContent = ContentAnalyzer.filterByGame(
	 *   allAnalyses,
	 *   "VALORANT"
	 * );
	 * // VALORANTとGENERAL_FPSコンテンツが返される
	 * ```
	 *
	 * @static
	 */
	static filterByGame(analyses: AimAnalysisResult[], targetGame?: string): AimAnalysisResult[] {
		if (!targetGame) return analyses;

		return analyses.filter(
			(analysis) =>
				analysis.targetGames.includes(targetGame as any) ||
				analysis.targetGames.includes("GENERAL_FPS")
		);
	}

	/**
	 * 動画URLから直接解析するためのヘルパーメソッド
	 *
	 * @description YouTube動画URLを直接指定してエイム練習コンテンツを解析します。
	 * 内部的にanalyzeContentメソッドを呼び出し、Geminiの動画解析機能を使用します。
	 *
	 * @param videoUrl - 解析対象のYouTube動画URL
	 * @param description - 解析の追加説明（オプション）
	 * @returns 構造化されたエイム練習解析結果
	 *
	 * @example
	 * ```typescript
	 * const result = await analyzer.analyzeVideoUrl(
	 *   "https://www.youtube.com/watch?v=abc123",
	 *   "4BangerのKovaaks練習動画"
	 * );
	 *
	 * console.log(result.aimElements); // ["flick", "tracking"]
	 * console.log(result.summary); // "動画の要約"
	 * ```
	 *
	 * @throws {Error} 無効なYouTube URL形式の場合
	 * @see analyzeContent
	 * @see isValidYouTubeUrl
	 */
	async analyzeVideoUrl(videoUrl: string, description?: string): Promise<AimAnalysisResult> {
		return this.analyzeContent({ videoUrl, description });
	}

	/**
	 * テキストファイルの内容を解析してエイム練習関連の知識を抽出
	 *
	 * @description txtファイルやドキュメントの内容からエイム練習に関連する情報を構造化して抽出します。
	 * 動画解析と同様の分析フレームワークを使用し、テキスト専用の最適化されたプロンプトを適用します。
	 *
	 * @param input - テキスト解析対象の情報
	 * @returns 構造化されたエイム練習解析結果
	 *
	 * @example
	 * ```typescript
	 * const result = await analyzer.analyzeTextContent({
	 *   title: "エイム練習ガイド",
	 *   content: "エイム練習では flick shot と tracking が重要です...",
	 *   category: "guide",
	 *   difficultyLevel: "beginner"
	 * });
	 *
	 * console.log(result.aimElements); // ["flick", "tracking"]
	 * console.log(result.summary); // "テキストの要約"
	 * ```
	 *
	 * @throws {Error} テキスト内容が空の場合
	 */
	async analyzeTextContent(input: {
		title: string;
		content: string;
		category?: string;
		difficultyLevel?: "beginner" | "intermediate" | "advanced" | "expert";
	}): Promise<AimAnalysisResult> {
		if (!input.content.trim()) {
			throw new Error("Text content is required for text analysis");
		}

		const prompt = this.buildTextAnalysisPrompt(input);

		const result = await generateObject({
			model: this.model,
			schema: AimAnalysisSchema,
			prompt,
			temperature: 0.1, // 安定した解析結果のため低温度設定
		});

		return result.object;
	}

	/**
	 * テキスト解析専用プロンプトの構築
	 */
	private buildTextAnalysisPrompt(input: {
		title: string;
		content: string;
		category?: string;
		difficultyLevel?: string;
	}): string {
		return `
あなたはFPSゲームのエイム練習専門のコンテンツアナライザーです。
テキスト文書を解析し、エイム練習に関する情報を構造化して抽出してください。

## テキスト情報
タイトル: ${input.title}
カテゴリ: ${input.category || "不明"}
想定難易度: ${input.difficultyLevel || "未指定"}

## テキスト内容
${input.content}

## 解析指針

### エイム要素の判定
以下の要素をテキストから特定してください：
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
テキスト内容からゲーム特化度を判定。一般的なFPS理論はGENERAL_FPSとする。

### 対象視聴者の判定
コンテンツの前提知識レベルと説明の詳しさから判定。

### 信頼度スコア
以下の要素で判定:
- タイトルの明確さ (0.2)
- 内容の詳細度と具体性 (0.3)
- エイム関連の専門性 (0.3)
- 実用性とアクションアブル性 (0.2)

不明確な部分や推測が多い場合は信頼度を下げてください。

### 重要なポイント
- 具体的で実用的な情報を抽出
- 初心者にも理解しやすい表現
- 練習の順序や優先度も考慮
- 日本語での出力（英語コンテンツの場合は翻訳）

### キーインサイトの抽出
テキストから実践的で価値のあるエイム練習のコツやヒントを抽出してください。

### 練習推奨事項の生成
テキスト内容に基づいて、具体的な練習方法や改善提案を生成してください。

### 出力形式
JSON形式で、指定されたスキーマに従って構造化してください。
`;
	}

	/**
	 * YouTube動画URLの形式を検証
	 *
	 * @description 指定されたURLがYouTube動画の有効な形式かどうかを判定します。
	 * youtube.com/watch?v= および youtu.be/ の両方の形式をサポートします。
	 *
	 * @param url - 検証対象のURL文字列
	 * @returns URLが有効なYouTube動画URLの場合はtrue、そうでなければfalse
	 *
	 * @example
	 * ```typescript
	 * console.log(ContentAnalyzer.isValidYouTubeUrl(
	 *   "https://www.youtube.com/watch?v=abc123"
	 * )); // true
	 *
	 * console.log(ContentAnalyzer.isValidYouTubeUrl(
	 *   "https://youtu.be/abc123"
	 * )); // true
	 *
	 * console.log(ContentAnalyzer.isValidYouTubeUrl(
	 *   "https://example.com/video"
	 * )); // false
	 * ```
	 *
	 * @static
	 */
	static isValidYouTubeUrl(url: string): boolean {
		const youtubeRegex =
			/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+(&[\w=]*)?$/;
		return youtubeRegex.test(url);
	}
}

/**
 * ContentAnalyzerクラスのシングルトンインスタンス
 *
 * @description アプリケーション全体で共有するContentAnalyzerのインスタンス。
 * 直接インポートして使用できます。
 *
 * @example
 * ```typescript
 * import { contentAnalyzer } from './content-analyzer';
 *
 * const result = await contentAnalyzer.analyzeVideoUrl(
 *   "https://www.youtube.com/watch?v=abc123"
 * );
 * ```
 */
export const contentAnalyzer = new ContentAnalyzer();
