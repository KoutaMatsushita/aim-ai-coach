/**
 * RAG (Retrieval-Augmented Generation) service using @mastra/libsql
 * High-performance vector search for aim training content
 */

import { google } from "@ai-sdk/google";
import { LibSQLVector } from "@mastra/libsql";
import { embed } from "ai";
import { getEnv } from "../env.js";
import type { AimAnalysisResult } from "./content-analyzer.js";
import {YouTubeVideo} from "./youtube";
import { vector } from "../mastra/stores"

export interface SearchQuery {
	text: string;
	difficultyLevel?: string;
	aimElements?: string[];
	targetGames?: string[];
	limit?: number;
	minScore?: number; // 最小類似度スコア
}

export interface VideoMetadata {
	videoId: string;
	title: string;
	description: string;
	difficultyLevel: string;
	aimElements: string[];
	targetGames: string[];
	keyInsights: string[];
	practiceRecommendations: Array<{
		scenario: string;
		focus: string;
		duration?: string;
	}>;
	targetAudience: string;
	confidenceScore: number;
	publishedAt: string;
	duration: number;
	viewCount: number;
	thumbnailUrl: string;
}

export interface SearchResult {
	videoId: string;
	title: string;
	url: string;
	relevanceScore: number;
	difficultyLevel: string;
	aimElements: string[];
	keyInsights: string[];
	practiceRecommendations: Array<{
		scenario: string;
		focus: string;
		duration?: string;
	}>;
	matchedContent: string;
	metadata: VideoMetadata;
}

export interface PersonalizedRecommendation {
	userSkillLevel: string;
	weakAreas: string[];
	targetGame?: string;
	recommendations: SearchResult[];
	reasoning: string;
}

export class RAGLibSQLService {
	private readonly vectorStore: LibSQLVector = vector;
	private readonly embeddingModel = google.textEmbedding("text-embedding-004");
	private readonly indexName = "aimTrainingContent";
	private readonly embeddingDimension = 768;

	/**
	 * ベクトルインデックスの初期化
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
	 * YouTube動画とその解析結果をRAGシステムに追加
	 */
	async addVideoContent(
		video: YouTubeVideo,
		analysis: AimAnalysisResult,
		transcript?: string
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

		// 3. 検索用テキストコンテンツの生成
		const searchableContent = [
			video.title,
			video.description,
			analysis.summary,
			analysis.keyInsights.join(". "),
			analysis.practiceRecommendations.map((r) => `${r.scenario}: ${r.focus}`).join(". "),
			transcript || "",
		]
			.filter(Boolean)
			.join(" ");

		// 4. ベクトル埋め込み生成
		const { embedding } = await embed({
			model: this.embeddingModel,
			value: searchableContent,
		});

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
	 * セマンティック検索の実行
	 */
	async search(query: SearchQuery): Promise<SearchResult[]> {
		// クエリテキストのベクトル化
		const { embedding: queryEmbedding } = await embed({
			model: this.embeddingModel,
			value: query.text,
		});

		// フィルタ条件の構築
		const filter: Record<string, any> = {};

		if (query.difficultyLevel) {
			filter.difficultyLevel = query.difficultyLevel;
		}

		if (query.aimElements && query.aimElements.length > 0) {
			// 配列に指定要素が含まれているかチェック
			filter.aimElements = { contains: query.aimElements };
		}

		if (query.targetGames && query.targetGames.length > 0) {
			filter.targetGames = { contains: query.targetGames };
		}

		// 信頼度の高いコンテンツを優先
		if (!query.minScore) {
			filter.confidenceScore = { gte: 0.6 };
		}

		// LibSQLVectorで検索実行
		const results = await this.vectorStore.query({
			indexName: this.indexName,
			queryVector: queryEmbedding,
			topK: query.limit || 10,
			filter: Object.keys(filter).length > 0 ? filter : undefined,
			includeVector: false,
			minScore: query.minScore || 0.5,
		});

		// 結果をSearchResult形式に変換
		return results.map(
			(result) =>
				({
					videoId: result.metadata!.videoId,
					title: result.metadata!.title,
					url: `https://youtube.com/watch?v=${result.metadata!.videoId}`,
					relevanceScore: result.score!,
					difficultyLevel: result.metadata!.difficultyLevel,
					aimElements: result.metadata!.aimElements,
					keyInsights: result.metadata!.keyInsights,
					practiceRecommendations: result.metadata!.practiceRecommendations,
					matchedContent: `${result.metadata!.title}: ${result.metadata!.keyInsights.slice(0, 2).join(", ")}`,
					metadata: result.metadata as any,
				}) satisfies SearchResult
		);
	}

	/**
	 * パーソナライズされた推薦システム
	 */
	async getPersonalizedRecommendations(
		userSkillLevel: string,
		weakAreas: string[],
		targetGame?: string,
		recentTopics?: string[]
	): Promise<PersonalizedRecommendation> {
		// スキルレベルに基づく難易度マッピング
		const difficultyMapping = {
			Beginner: "beginner",
			Intermediate: "intermediate",
			Advanced: "advanced",
			Expert: "expert",
		};

		const userDifficulty =
			difficultyMapping[userSkillLevel as keyof typeof difficultyMapping] || "beginner";

		// 弱点エリアに基づく検索
		const recommendations: SearchResult[] = [];
		const reasoning: string[] = [];

		for (const weakArea of weakAreas) {
			const searchResults = await this.search({
				text: `${weakArea} improvement training practice`,
				difficultyLevel: userDifficulty,
				aimElements: [weakArea],
				targetGames: targetGame ? [targetGame] : undefined,
				limit: 3,
				minScore: 0.6,
			});

			recommendations.push(...searchResults);
			reasoning.push(`${weakArea}の改善のため、${searchResults.length}本の関連動画を推薦`);
		}

		// 最近のトピックベースの推薦
		if (recentTopics && recentTopics.length > 0) {
			for (const topic of recentTopics) {
				const topicResults = await this.search({
					text: topic,
					difficultyLevel: userDifficulty,
					targetGames: targetGame ? [targetGame] : undefined,
					limit: 2,
					minScore: 0.7,
				});

				recommendations.push(...topicResults);
				reasoning.push(`最近の関心事「${topic}」に基づく推薦`);
			}
		}

		// 重複除去とスコア順ソート
		const uniqueRecommendations = this.deduplicateResults(recommendations)
			.sort((a, b) => b.relevanceScore - a.relevanceScore)
			.slice(0, 10);

		return {
			userSkillLevel,
			weakAreas,
			targetGame,
			recommendations: uniqueRecommendations,
			reasoning: reasoning.join("; "),
		};
	}

	/**
	 * コンテンツ統計の取得
	 */
	async getContentStats(): Promise<{
		totalVideos: number;
		byDifficulty: Record<string, number>;
		byGame: Record<string, number>;
		averageConfidence: number;
	}> {
		const stats = await this.vectorStore.describeIndex({ indexName: this.indexName });

		return {
			totalVideos: stats.count,
			byDifficulty: {}, // LibSQLVectorからは直接取得できないため空
			byGame: {},
			averageConfidence: 0.85, // 推定値
		};
	}

	/**
	 * インデックスの削除と再作成
	 */
	async resetIndex(): Promise<void> {
		try {
			await this.vectorStore.deleteIndex({ indexName: this.indexName });
			console.log(`Deleted index ${this.indexName}`);
		} catch (error) {
			console.log(`Index ${this.indexName} did not exist`);
		}

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
	 * バッチでの動画追加
	 */
	async batchAddVideos(
		videosWithAnalysis: Array<{
			video: YouTubeVideo;
			analysis: AimAnalysisResult;
			transcript?: string;
		}>
	): Promise<void> {
		console.log(`Starting batch addition of ${videosWithAnalysis.length} videos...`);

		// バッチサイズを制限してメモリ効率を向上
		const batchSize = 10;

		for (let i = 0; i < videosWithAnalysis.length; i += batchSize) {
			const batch = videosWithAnalysis.slice(i, i + batchSize);

			await Promise.all(
				batch.map(({ video, analysis, transcript }) =>
					this.addVideoContent(video, analysis, transcript)
				)
			);

			console.log(
				`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(videosWithAnalysis.length / batchSize)}`
			);

			// API制限対策の待機
			if (i + batchSize < videosWithAnalysis.length) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		console.log(`Batch addition completed: ${videosWithAnalysis.length} videos added`);
	}
}

// Export singleton instance
export const ragLibSQLService = new RAGLibSQLService();
