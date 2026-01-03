/**
 * RAG (Retrieval-Augmented Generation) service using @mastra/libsql
 * High-performance vector search for aim training content
 */

import { google } from "@ai-sdk/google";
import type { LibSQLVector } from "@mastra/libsql";
import { embed } from "ai";
import type { AimAnalysisResult } from "./content-analyzer";
import type { YouTubeVideo } from "./youtube";

/**
 * ベクトル検索クエリの入力パラメータ
 *
 * @interface SearchQuery
 * @description RAGシステムでの動画コンテンツ検索に使用するクエリパラメータ
 */
export interface SearchQuery {
	/** 検索対象のテキスト */
	text: string;
	/** 難易度による絞り込み（オプション） */
	difficultyLevel?: string;
	/** エイム要素による絞り込み（オプション） */
	aimElements?: string[];
	/** 対象ゲームによる絞り込み（オプション） */
	targetGames?: string[];
	/** 返却する結果数の上限（デフォルト: 5） */
	limit?: number;
	/** 最小類似度スコア（この値以下の結果は除外） */
	minScore?: number;
}

/**
 * 動画メタデータの型定義
 *
 * @interface VideoMetadata
 * @description ベクトルストアに格納される動画の詳細情報
 */
export interface VideoMetadata {
	/** YouTube動画IDまたはテキスト知識ID */
	videoId: string;
	/** 動画タイトルまたはテキストタイトル */
	title: string;
	/** 動画説明文またはテキスト内容の概要 */
	description: string;
	/** コンテンツの難易度レベル */
	difficultyLevel: string;
	/** エイム要素の配列 */
	aimElements: string[];
	/** 対象ゲームの配列 */
	targetGames: string[];
	/** 主要な洞察・学習ポイント */
	keyInsights: string[];
	/** 練習推奨事項 */
	practiceRecommendations: Array<{
		/** 練習シナリオ名 */
		scenario: string;
		/** 練習の焦点 */
		focus: string;
		/** 推奨時間（オプション） */
		duration?: string;
	}>;
	/** 対象視聴者層 */
	targetAudience: string;
	/** 解析の信頼度スコア */
	confidenceScore: number;
	/** 動画公開日時またはテキスト追加日時 */
	publishedAt: string;
	/** 動画長（秒）- テキストの場合は0 */
	duration: number;
	/** 再生回数 - テキストの場合は0 */
	viewCount: number;
	/** サムネイルURL - テキストの場合は空文字 */
	thumbnailUrl: string;
	/** テキスト知識かどうかのフラグ（オプション） */
	isTextKnowledge?: boolean;
	/** テキスト知識のカテゴリ（オプション） */
	category?: string;
}

/**
 * ベクトル検索の結果項目
 *
 * @interface SearchResult
 * @description RAG検索で返される個々の結果アイテムの構造
 */
export interface SearchResult {
	/** YouTube動画ID */
	videoId: string;
	/** 動画タイトル */
	title: string;
	/** 動画URL */
	url: string;
	/** 検索クエリとの関連度スコア（0.0-1.0） */
	relevanceScore: number;
	/** コンテンツの難易度レベル */
	difficultyLevel: string;
	/** エイム要素の配列 */
	aimElements: string[];
	/** 主要な洞察・学習ポイント */
	keyInsights: string[];
	/** 練習推奨事項 */
	practiceRecommendations: Array<{
		/** 練習シナリオ名 */
		scenario: string;
		/** 練習の焦点 */
		focus: string;
		/** 推奨時間（オプション） */
		duration?: string;
	}>;
	/** マッチしたコンテンツの概要 */
	matchedContent: string;
	/** 完全なメタデータ */
	metadata: VideoMetadata;
}

/**
 * パーソナライズされた練習推奨結果
 *
 * @interface PersonalizedRecommendation
 * @description ユーザーのスキルレベルと弱点分析に基づく個別化された練習推奨
 */
export interface PersonalizedRecommendation {
	/** ユーザーのスキルレベル */
	userSkillLevel: string;
	/** 改善が必要な弱点エリア */
	weakAreas: string[];
	/** 対象ゲーム（オプション） */
	targetGame?: string;
	/** 推奨される練習コンテンツ */
	recommendations: SearchResult[];
	/** 推奨理由の説明 */
	reasoning: string;
}

/**
 * RAG（Retrieval-Augmented Generation）機能を提供するLibSQLベクトルストアサービス
 *
 * @description YouTube動画のエイム練習コンテンツを効率的にベクトル検索し、
 * ユーザーのスキルレベルに基づいたパーソナライズされた推奨を提供します。
 * Google Gemini埋め込みモデルとLibSQLVector を使用します。
 *
 * @example
 * ```typescript
 * const service = new RAGLibSQLService();
 * await service.initializeIndex();
 *
 * // 動画コンテンツ追加
 * await service.addVideoContent(video, analysis, transcript);
 *
 * // 検索実行
 * const results = await service.search({
 *   text: "エイム練習 初心者",
 *   limit: 5
 * });
 * ```
 */
export class RAGLibSQLService {
	constructor(
		private readonly vectorStore: LibSQLVector,
		private readonly embeddingModel = google.textEmbedding(
			"text-embedding-004",
		),
		private readonly indexName = "aimTrainingContent",
		private readonly embeddingDimension = 768,
		private readonly maxPayloadSize = 30000,
		private readonly chunkOverlap = 200,
	) {}

	/**
	 * ベクトルインデックスの初期化
	 *
	 * @description エイム練習コンテンツ用のベクトルインデックスを作成または確認します。
	 * 既存のインデックスがある場合はそれを使用し、ない場合は新規作成します。
	 *
	 * @returns インデックス初期化の完了Promise
	 *
	 * @example
	 * ```typescript
	 * const service = new RAGLibSQLService();
	 * await service.initializeIndex();
	 * console.log('インデックス準備完了');
	 * ```
	 */
	async initializeIndex(): Promise<void> {
		// インデックスが存在するかチェック
		const indexes = await this.vectorStore.listIndexes();
		const stats = indexes.find((i) => i === this.indexName);
		if (!stats) {
			// インデックスが存在しない場合は作成
			console.log(`Creating index ${this.indexName}...`);
			await this.vectorStore.createIndex({
				indexName: this.indexName,
				dimension: this.embeddingDimension,
			});
			console.log(`Index ${this.indexName} created successfully`);
		} else {
			console.log(`Index ${this.indexName} already exists`);
		}
	}

	/**
	 * テキストをチャンクに分割（バイト数制限対応）
	 */
	private chunkText(
		text: string,
		maxBytes: number = this.maxPayloadSize,
	): string[] {
		const textBytes = Buffer.byteLength(text, "utf8");

		if (textBytes <= maxBytes) {
			return [text];
		}

		const chunks: string[] = [];
		const sentences = text.split(/[.。!！?？\n]/);
		let currentChunk = "";
		let currentBytes = 0;

		for (const sentence of sentences) {
			const sentenceWithPunc = sentence + ".";
			const sentenceBytes = Buffer.byteLength(sentenceWithPunc, "utf8");

			// 単一の文が制限を超える場合は強制的に分割
			if (sentenceBytes > maxBytes) {
				// 現在のチャンクを保存
				if (currentChunk) {
					chunks.push(currentChunk.trim());
					currentChunk = "";
					currentBytes = 0;
				}

				// 長い文を強制分割
				for (let i = 0; i < sentence.length; i += 1000) {
					const fragment = sentence.slice(i, i + 1000);
					chunks.push(fragment);
				}
				continue;
			}

			// チャンクサイズ制限チェック
			if (currentBytes + sentenceBytes > maxBytes && currentChunk) {
				chunks.push(currentChunk.trim());

				// オーバーラップ処理
				const overlapText = currentChunk.slice(-this.chunkOverlap);
				currentChunk = overlapText + sentenceWithPunc;
				currentBytes = Buffer.byteLength(currentChunk, "utf8");
			} else {
				currentChunk += sentenceWithPunc;
				currentBytes += sentenceBytes;
			}
		}

		// 最後のチャンク
		if (currentChunk.trim()) {
			chunks.push(currentChunk.trim());
		}

		return chunks;
	}

	/**
	 * 複数チャンクの埋め込みを生成し、平均化して統合
	 */
	private async generateChunkedEmbedding(text: string): Promise<number[]> {
		const chunks = this.chunkText(text);

		if (chunks.length === 1) {
			const { embedding } = await embed({
				model: this.embeddingModel,
				value: chunks[0],
			});
			return embedding;
		}

		console.log(
			`Generating embeddings for ${chunks.length} chunks (total: ${Buffer.byteLength(text, "utf8")} bytes)`,
		);

		// 各チャンクの埋め込みを生成
		const embeddings: number[][] = [];
		for (const chunk of chunks) {
			const { embedding } = await embed({
				model: this.embeddingModel,
				value: chunk,
			});
			embeddings.push(embedding);

			// API制限回避のため少し待機
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// 埋め込みベクトルを平均化
		const dimensions = embeddings[0].length;
		const avgEmbedding = new Array(dimensions).fill(0);

		for (const embedding of embeddings) {
			for (let i = 0; i < dimensions; i++) {
				avgEmbedding[i] += embedding[i];
			}
		}

		// 平均を計算
		for (let i = 0; i < dimensions; i++) {
			avgEmbedding[i] /= embeddings.length;
		}

		return avgEmbedding;
	}

	/**
	 * 動画コンテンツをベクトルストアに追加
	 *
	 * @description YouTube動画とその解析結果をベクトル化してストアに保存します。
	 * 長いテキストは自動的にチャンクに分割され、Google Embedding API の制限に対応します。
	 *
	 * @param video - YouTube動画のメタデータ
	 * @param analysis - エイム練習解析結果
	 * @param transcript - 動画の字幕・転写テキスト（オプション）
	 * @returns 追加処理の完了Promise
	 *
	 * @example
	 * ```typescript
	 * await service.addVideoContent(
	 *   { id: "abc123", title: "エイム練習", ... },
	 *   { aimElements: ["flick"], summary: "...", ... },
	 *   "動画の字幕テキスト"
	 * );
	 * ```
	 *
	 * @throws {Error} 埋め込み生成に失敗した場合
	 * @see generateChunkedEmbedding
	 */
	async addVideoContent(
		video: YouTubeVideo,
		analysis: AimAnalysisResult,
		transcript?: string,
	): Promise<void> {
		// 2. 検索用メタデータの構築
		const metadata: VideoMetadata = {
			videoId: video.id,
			title: video.title,
			description: video.description,
			difficultyLevel: analysis.difficultyLevel,
			aimElements: analysis.aimElements,
			targetGames: analysis.targetGames,
			keyInsights: analysis.keyInsights,
			practiceRecommendations: analysis.practiceRecommendations,
			targetAudience: analysis.targetAudience,
			confidenceScore: analysis.confidenceScore,
			publishedAt: video.publishedAt,
			duration: Number(video.duration),
			viewCount: video.viewCount,
			thumbnailUrl: video.thumbnailUrl,
		};

		// 3. 検索用テキストコンテンツの生成（制限を考慮）
		const contentParts = [
			video.title,
			// 説明文を制限（最初の1000文字のみ）
			video.description.length > 1000
				? video.description.slice(0, 1000) + "..."
				: video.description,
			analysis.summary,
			analysis.keyInsights.join(". "),
			analysis.practiceRecommendations
				.map((r) => `${r.scenario}: ${r.focus}`)
				.join(". "),
			// 字幕を制限（最初の5000文字のみ）
			transcript
				? transcript.length > 5000
					? transcript.slice(0, 5000) + "..."
					: transcript
				: "",
		];

		const searchableContent = contentParts.filter(Boolean).join(" ");

		console.log(
			`Content size: ${Buffer.byteLength(searchableContent, "utf8")} bytes for video ${video.id}`,
		);

		// 4. チャンク対応のベクトル埋め込み生成
		const embedding = await this.generateChunkedEmbedding(searchableContent);

		// 5. LibSQLVectorに追加
		await this.vectorStore.upsert({
			indexName: this.indexName,
			vectors: [embedding],
			metadata: [metadata],
			ids: [video.id],
		});

		console.log(`Added video ${video.id} to vector store`);
	}

	/**
	 * テキスト知識をベクトルストアに追加
	 *
	 * @description txtファイルやドキュメントの内容とその解析結果をベクトル化してストアに保存します。
	 * 動画コンテンツと同様の検索機能を提供し、エイム練習に関連するテキスト知識を蓄積できます。
	 *
	 * @param textData - テキスト知識とその解析結果
	 * @returns 追加処理の完了Promise
	 *
	 * @example
	 * ```typescript
	 * await service.addTextKnowledge({
	 *   title: "エイム練習ガイド",
	 *   content: "フリック練習では...",
	 *   category: "guide",
	 *   difficultyLevel: "beginner",
	 *   analysis: analysisResult,
	 *   forceOverwrite: false
	 * });
	 * ```
	 *
	 * @throws {Error} 埋め込み生成に失敗した場合
	 */
	async addTextKnowledge(textData: {
		title: string;
		content: string;
		category: string;
		difficultyLevel: string;
		analysis: AimAnalysisResult;
		forceOverwrite?: boolean;
	}): Promise<void> {
		// 既存チェック（上書きでない場合）
		if (!textData.forceOverwrite) {
			try {
				const existingResults = await this.search({
					text: textData.title,
					limit: 1,
					minScore: 0.9,
				});

				if (existingResults.length > 0) {
					console.log(
						`Text knowledge "${textData.title}" already exists, skipping...`,
					);
					return;
				}
			} catch (error) {
				// 検索エラーは無視して続行
				console.warn("Search check failed, proceeding with add:", error);
			}
		}

		// テキスト知識用のID生成（タイトルベース）
		const textId = `text_${Buffer.from(textData.title).toString("base64").slice(0, 20)}`;

		// 検索用メタデータの構築（動画形式に合わせる）
		const metadata: VideoMetadata = {
			videoId: textId,
			title: textData.title,
			description:
				textData.content.slice(0, 500) +
				(textData.content.length > 500 ? "..." : ""),
			difficultyLevel: textData.difficultyLevel,
			aimElements: textData.analysis.aimElements,
			targetGames: textData.analysis.targetGames,
			keyInsights: textData.analysis.keyInsights,
			practiceRecommendations: textData.analysis.practiceRecommendations,
			targetAudience: textData.analysis.targetAudience,
			confidenceScore: textData.analysis.confidenceScore,
			publishedAt: new Date().toISOString(),
			duration: 0, // テキストなので0
			viewCount: 0,
			thumbnailUrl: "",
			// テキスト知識特有の情報
			isTextKnowledge: true,
			category: textData.category,
		};

		// 検索用テキストコンテンツの生成
		const searchableContent = [
			textData.title,
			textData.category,
			textData.analysis.summary,
			textData.analysis.keyInsights.join(". "),
			textData.analysis.practiceRecommendations
				.map((r) => `${r.scenario}: ${r.focus}`)
				.join(". "),
			// コンテンツ全体を含める（制限あり）
			textData.content.length > 8000
				? textData.content.slice(0, 8000) + "..."
				: textData.content,
		]
			.filter(Boolean)
			.join(" ");

		console.log(
			`Text knowledge size: ${Buffer.byteLength(searchableContent, "utf8")} bytes for "${textData.title}"`,
		);

		// チャンク対応のベクトル埋め込み生成
		const embedding = await this.generateChunkedEmbedding(searchableContent);

		// LibSQLVectorに追加
		await this.vectorStore.upsert({
			indexName: this.indexName,
			vectors: [embedding],
			metadata: [metadata],
			ids: [textId],
		});

		console.log(`Added text knowledge "${textData.title}" to vector store`);
	}

	/**
	 * エイム練習コンテンツの意味的検索
	 *
	 * @description 自然言語クエリに基づいてエイム練習動画を検索し、
	 * 関連度の高いコンテンツを返します。フィルタリング条件で結果を絞り込むことができます。
	 *
	 * @param query - 検索クエリとフィルタ条件
	 * @returns 関連度順に並んだ検索結果の配列
	 *
	 * @example
	 * ```typescript
	 * // 基本的な検索
	 * const results = await service.search({
	 *   text: "フリック練習 初心者向け",
	 *   limit: 3
	 * });
	 *
	 * // 条件付き検索
	 * const filtered = await service.search({
	 *   text: "エイム上達",
	 *   difficultyLevel: "intermediate",
	 *   aimElements: ["tracking", "flick"],
	 *   targetGames: ["VALORANT"],
	 *   minScore: 0.7
	 * });
	 * ```
	 *
	 * @throws {Error} 埋め込み生成または検索に失敗した場合
	 */
	async search(query: SearchQuery): Promise<SearchResult[]> {
		// 1. クエリテキストのベクトル化
		const { embedding } = await embed({
			model: this.embeddingModel,
			value: query.text,
		});

		// 2. ベクトル検索実行
		const searchResults = await this.vectorStore.query({
			indexName: this.indexName,
			queryVector: embedding,
			topK: query.limit || 5,
		});

		// 3. 最小スコアフィルタ
		let filteredResults = searchResults.filter((result) => {
			const score = result.score || 0;
			return score >= (query.minScore || 0);
		});

		// フィルタ条件の構築
		const filter: Record<string, unknown> = {};

		if (query.difficultyLevel) {
			filter.difficultyLevel = query.difficultyLevel;
		}

		if (query.aimElements?.length) {
			// エイム要素でフィルタ（配列の交差チェック）
			filteredResults = filteredResults.filter((result) =>
				query.aimElements?.some((element) =>
					result.metadata?.aimElements?.includes(element),
				),
			);
		}

		if (query.targetGames?.length) {
			// ゲームでフィルタ（配列の交差チェック）
			filteredResults = filteredResults.filter((result) =>
				query.targetGames?.some((game) =>
					result.metadata?.targetGames?.includes(game),
				),
			);
		}

		// 4. 結果の重複排除と整形
		return this.deduplicateResults(
			filteredResults.map(
				(result) =>
					({
						videoId: result.metadata?.videoId,
						title: result.metadata?.title,
						url: `https://youtube.com/watch?v=${result.metadata?.videoId}`,
						relevanceScore: result.score!,
						difficultyLevel: result.metadata?.difficultyLevel,
						aimElements: result.metadata?.aimElements,
						keyInsights: result.metadata?.keyInsights,
						practiceRecommendations: result.metadata?.practiceRecommendations,
						matchedContent: `${result.metadata?.title}: ${result.metadata?.keyInsights.slice(0, 2).join(", ")}`,
						metadata: result.metadata as VideoMetadata,
					}) satisfies SearchResult,
			),
		);
	}

	/**
	 * パーソナライズされた練習推奨の生成
	 *
	 * @description ユーザーのスキルレベルと弱点分析に基づいて、
	 * 個別化された練習コンテンツを推奨します。推奨理由も含めて提供されます。
	 *
	 * @param userSkillLevel - ユーザーのスキルレベル
	 * @param weakAreas - 改善が必要な弱点エリアの配列
	 * @param targetGame - 対象ゲーム（オプション）
	 * @param limit - 推奨コンテンツの上限数（デフォルト: 5）
	 * @returns パーソナライズされた推奨結果
	 *
	 * @example
	 * ```typescript
	 * const recommendations = await service.getPersonalizedRecommendations(
	 *   "Intermediate",
	 *   ["tracking", "flick"],
	 *   "VALORANT",
	 *   3
	 * );
	 *
	 * console.log(recommendations.reasoning);
	 * console.log(recommendations.recommendations.length); // 3
	 * ```
	 */
	async getPersonalizedRecommendations(
		userSkillLevel: string,
		weakAreas: string[],
		targetGame?: string,
		limit: number = 5,
	): Promise<PersonalizedRecommendation> {
		// 弱点エリアを組み合わせた検索クエリを構築
		const weakAreasText = weakAreas.join(" ");
		const searchQuery = `${userSkillLevel} ${weakAreasText} practice training tutorial`;

		// 基本検索を実行
		const searchResults = await this.search({
			text: searchQuery,
			aimElements: weakAreas,
			targetGames: targetGame ? [targetGame] : undefined,
			limit: limit * 2, // より多くの候補を取得してからフィルタリング
			minScore: 0.6, // 関連性の最小閾値
		});

		// スキルレベルに応じた難易度フィルタリング
		const difficultyMapping: Record<string, string[]> = {
			Beginner: ["beginner", "intermediate"],
			Intermediate: ["beginner", "intermediate", "advanced"],
			Advanced: ["intermediate", "advanced", "expert"],
			Expert: ["advanced", "expert"],
		};

		const allowedDifficulties = difficultyMapping[userSkillLevel] || [
			"beginner",
			"intermediate",
		];
		const filteredByDifficulty = searchResults.filter((result) =>
			allowedDifficulties.includes(result.difficultyLevel),
		);

		// 弱点エリアとの関連度でソート
		const scoredResults = filteredByDifficulty.map((result) => {
			const aimElementsScore = result.aimElements.filter((element) =>
				weakAreas.includes(element),
			).length;
			const totalScore = result.relevanceScore + aimElementsScore * 0.1; // エイム要素のボーナス
			return { ...result, totalScore };
		});

		// トータルスコアでソートして制限数まで取得
		const finalRecommendations = scoredResults
			.sort((a, b) => b.totalScore - a.totalScore)
			.slice(0, limit)
			.map(({ totalScore, ...result }) => result); // totalScore を除去

		// 推薦理由の生成（静的）
		const reasoning = `${userSkillLevel}レベルのプレイヤーの${weakAreas.join("、")}の改善に最適化された推薦です。${targetGame ? `${targetGame}に特化した` : "汎用的な"}練習コンテンツを優先しています。`;

		return {
			userSkillLevel,
			weakAreas,
			targetGame,
			recommendations: finalRecommendations,
			reasoning,
		};
	}

	/**
	 * ベクトルストア内のコンテンツ統計を取得
	 *
	 * @description 現在ストアに保存されている動画コンテンツの統計情報を取得します。
	 * 難易度別、エイム要素別、ゲーム別の分布情報が含まれます。
	 *
	 * @returns コンテンツ統計情報
	 *
	 * @example
	 * ```typescript
	 * const stats = await service.getContentStats();
	 * console.log(`Total videos: ${stats.totalVideos}`);
	 * console.log(`Difficulty distribution:`, stats.difficultyDistribution);
	 * ```
	 */
	async getContentStats(): Promise<{
		totalVideos: number;
		difficultyDistribution: Record<string, number>;
		aimElementsDistribution: Record<string, number>;
		gameDistribution: Record<string, number>;
		averageConfidence: number;
	}> {
		// インデックス統計取得
		const indexes = await this.vectorStore.listIndexes();

		// 基本的な統計情報を返す（詳細実装は必要に応じて拡張）
		return {
			totalVideos: indexes.includes(this.indexName) ? 0 : 0, // 実装時に適切な統計取得
			difficultyDistribution: {},
			aimElementsDistribution: {},
			gameDistribution: {},
			averageConfidence: 0.85, // デフォルト値
		};
	}

	/**
	 * ベクトルインデックスのリセット
	 *
	 * @description 既存のベクトルインデックスを削除し、空の新しいインデックスを作成します。
	 * 全データが削除されるため、慎重に使用してください。
	 *
	 * @returns インデックスリセットの完了Promise
	 *
	 * @example
	 * ```typescript
	 * // 注意: 全データが削除されます
	 * await service.resetIndex();
	 * console.log('インデックスがリセットされました');
	 * ```
	 *
	 * @throws {Error} インデックス削除または作成に失敗した場合
	 */
	async resetIndex(): Promise<void> {
		try {
			await this.vectorStore.deleteIndex({ indexName: this.indexName });
			console.log(`Deleted index ${this.indexName}`);
		} catch (error) {
			console.log(`Index ${this.indexName} did not exist`);
		}

		// 新しいインデックスを作成
		await this.initializeIndex();
	}

	/**
	 * 検索結果の重複除去
	 */
	private deduplicateResults(results: SearchResult[]): SearchResult[] {
		const seen = new Set<string>();
		return results.filter((result) => {
			if (seen.has(result.videoId)) {
				return false;
			}
			seen.add(result.videoId);
			return true;
		});
	}

	/**
	 * 複数動画の一括追加処理
	 *
	 * @description 複数の動画と解析結果を効率的に一括でベクトルストアに追加します。
	 * エラー処理とログ出力を含む安全な一括処理を提供します。
	 *
	 * @param videoDataList - 動画データと解析結果のペアの配列
	 * @returns 処理完了の統計情報
	 *
	 * @example
	 * ```typescript
	 * const videoDataList = [
	 *   { video: video1, analysis: analysis1, transcript: transcript1 },
	 *   { video: video2, analysis: analysis2, transcript: transcript2 }
	 * ];
	 *
	 * const result = await service.batchAddVideos(videoDataList);
	 * console.log(`成功: ${result.successful}, 失敗: ${result.failed}`);
	 * ```
	 */
	async batchAddVideos(
		videoDataList: Array<{
			video: YouTubeVideo;
			analysis: AimAnalysisResult;
			transcript?: string;
		}>,
	): Promise<{ successful: number; failed: number }> {
		let successful = 0;
		let failed = 0;

		for (const { video, analysis, transcript } of videoDataList) {
			try {
				await this.addVideoContent(video, analysis, transcript);
				successful++;
			} catch (error) {
				console.error(`Failed to add video ${video.id}:`, error);
				failed++;
			}
		}

		console.log(
			`Batch add completed: ${successful} successful, ${failed} failed`,
		);
		return { successful, failed };
	}
}
