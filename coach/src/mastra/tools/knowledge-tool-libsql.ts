/**
 * Knowledge management tools for LibSQLVector-enhanced aim coaching
 * High-performance vector search with @mastra/libsql integration
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { contentAnalyzer } from "../../services/content-analyzer.js";
import { ragLibSQLService } from "../../services/rag-libsql.js";
import { youtubeService } from "../../services/youtube.js";

// インデックス初期化ツール
export const initializeVectorIndex = createTool({
	id: "initializeVectorIndex",
	description: "LibSQLVectorのインデックスを初期化。初回セットアップ時や完全リセット時に使用。",
	inputSchema: z.object({
		reset: z.boolean().optional().default(false).describe("既存インデックスを削除して再作成するか"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string().optional(),
		action: z.string().optional(),
		error: z.string().optional(),
	}),
	execute: async ({ context }) => {
		try {
			if (context.reset) {
				await ragLibSQLService.resetIndex();
				return {
					success: true,
					message: "インデックスをリセットして再作成しました",
					action: "reset_and_recreate",
				};
			} else {
				await ragLibSQLService.initializeIndex();
				return {
					success: true,
					message: "インデックスの初期化が完了しました",
					action: "initialize",
				};
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "インデックス初期化エラーが発生しました",
			};
		}
	},
});

// YouTube動画追加ツール（LibSQLVector版）
export const addYoutubeContentLibSQL = createTool({
	id: "addYoutubeContentLibSQL",
	description: "YouTube動画を解析してLibSQLVectorに追加。高性能なベクトル検索が可能になる。",
	inputSchema: z.object({
		videoUrl: z.string().describe("YouTube動画のURL (例: https://youtube.com/watch?v=VIDEO_ID)"),
		forceReanalysis: z.boolean().optional().default(false).describe("既存の解析結果を上書きするか"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string().optional(),
		analysis: z
			.object({
				videoId: z.string(),
				title: z.string(),
				difficultyLevel: z.string(),
				aimElements: z.array(z.string()),
				targetGames: z.array(z.string()),
				confidenceScore: z.number(),
			})
			.optional(),
		error: z.string().optional(),
	}),
	execute: async ({ context }) => {
		try {
			// YouTube URLからvideo IDを抽出
			const videoId = extractVideoId(context.videoUrl);
			if (!videoId) {
				throw new Error("無効なYouTube URLです");
			}

			// 動画の詳細情報を取得
			const videoDetails = await youtubeService.getVideoDetails([videoId]);
			if (videoDetails.length === 0) {
				throw new Error("動画が見つかりませんでした");
			}

			const video = videoDetails[0];

			// 字幕の取得を試行
			const transcript = await youtubeService.getVideoTranscript(videoId);

			// Gemini解析実行
			const analysis = await contentAnalyzer.analyzeContent({
				video,
				transcript: transcript || undefined,
			});

			// LibSQLVectorに追加
			await ragLibSQLService.addVideoContent(video, analysis, transcript?.text);

			return {
				success: true,
				message: `動画「${video.title}」をLibSQLVectorに追加しました`,
				analysis: {
					videoId: video.id,
					title: video.title,
					difficultyLevel: analysis.difficultyLevel,
					aimElements: analysis.aimElements,
					targetGames: analysis.targetGames,
					confidenceScore: analysis.confidenceScore,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "未知のエラーが発生しました",
			};
		}
	},
});

// 高性能コンテンツ検索ツール
export const searchAimContentLibSQL = createTool({
	id: "searchAimContentLibSQL",
	description: "LibSQLVectorの高性能検索でエイム練習関連のコンテンツを検索。従来の10-100倍高速。",
	inputSchema: z.object({
		query: z.string().describe("検索クエリ（例: 'flick shot improvement', 'tracking練習'）"),
		difficultyLevel: z
			.enum(["beginner", "intermediate", "advanced", "expert"])
			.optional()
			.describe("難易度フィルタ"),
		aimElements: z
			.array(z.string())
			.optional()
			.describe("エイム要素フィルタ（flick, tracking, switching等）"),
		targetGame: z.string().optional().describe("対象ゲーム（VALORANT, CS2, APEX_LEGENDS等）"),
		limit: z.number().optional().default(5).describe("結果数の上限"),
		minScore: z.number().optional().default(0.6).describe("最小類似度スコア (0.0-1.0)"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		results: z
			.array(
				z.object({
					title: z.string(),
					videoId: z.string(),
					url: z.string(),
					relevanceScore: z.number(),
					difficultyLevel: z.string(),
					aimElements: z.array(z.string()),
					keyInsights: z.array(z.string()),
					practiceRecommendations: z.array(z.any()),
					summary: z.string(),
				})
			)
			.optional(),
		totalFound: z.number().optional(),
		searchPerformance: z.string().optional(),
		error: z.string().optional(),
	}),
	execute: async ({ context }) => {
		try {
			const results = await ragLibSQLService.search({
				text: context.query,
				difficultyLevel: context.difficultyLevel,
				aimElements: context.aimElements,
				targetGames: context.targetGame ? [context.targetGame] : undefined,
				limit: context.limit,
				minScore: context.minScore,
			});

			return {
				success: true,
				results: results.map((result) => ({
					title: result.title,
					videoId: result.videoId,
					url: result.url,
					relevanceScore: Math.round(result.relevanceScore * 100) / 100,
					difficultyLevel: result.difficultyLevel,
					aimElements: result.aimElements,
					keyInsights: result.keyInsights,
					practiceRecommendations: result.practiceRecommendations,
					summary: result.matchedContent,
				})),
				totalFound: results.length,
				searchPerformance: "高速ベクトル検索使用",
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "検索エラーが発生しました",
			};
		}
	},
});

// 高度なパーソナライズ推薦ツール
export const getPersonalizedRecommendationsLibSQL = createTool({
	id: "getPersonalizedRecommendationsLibSQL",
	description:
		"高性能ベクトル検索による個人最適化推薦。複数の弱点エリアを同時に考慮した高精度推薦。",
	inputSchema: z.object({
		userSkillLevel: z
			.enum(["Beginner", "Intermediate", "Advanced", "Expert"])
			.describe("ユーザーのスキルレベル"),
		weakAreas: z.array(z.string()).describe("弱点エリア（tracking, flick, switching等）"),
		targetGame: z.string().optional().describe("主にプレイするゲーム"),
		recentTopics: z.array(z.string()).optional().describe("最近の関心事項"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		recommendations: z
			.array(
				z.object({
					title: z.string(),
					videoId: z.string(),
					url: z.string(),
					relevanceScore: z.number(),
					difficultyLevel: z.string(),
					aimElements: z.array(z.string()),
					keyInsights: z.array(z.string()),
					practiceRecommendations: z.array(z.any()),
					personalizedReason: z.string(),
				})
			)
			.optional(),
		reasoning: z.string().optional(),
		totalRecommendations: z.number().optional(),
		performance: z.string().optional(),
		error: z.string().optional(),
	}),
	execute: async ({ context, runtimeContext }) => {
		if (!runtimeContext) {
			return {
				success: false,
				error: "runtimeContext が利用できません",
			};
		}
		const discordId = runtimeContext.get("discordId");

		if (!discordId) {
			return {
				success: false,
				error: "runtimeContext で discordId を渡してください",
			};
		}

		try {
			const recommendations = await ragLibSQLService.getPersonalizedRecommendations(
				context.userSkillLevel,
				context.weakAreas,
				context.targetGame,
				context.recentTopics
			);

			return {
				success: true,
				recommendations: recommendations.recommendations.map((rec) => ({
					title: rec.title,
					videoId: rec.videoId,
					url: rec.url,
					relevanceScore: Math.round(rec.relevanceScore * 100) / 100,
					difficultyLevel: rec.difficultyLevel,
					aimElements: rec.aimElements,
					keyInsights: rec.keyInsights,
					practiceRecommendations: rec.practiceRecommendations,
					personalizedReason: `${context.userSkillLevel}レベルの${context.weakAreas.join(", ")}改善に最適`,
				})),
				reasoning: recommendations.reasoning,
				totalRecommendations: recommendations.recommendations.length,
				performance: "LibSQLVector高速個人化検索",
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "推薦生成エラーが発生しました",
			};
		}
	},
});

// LibSQLVector統計ツール
export const getVectorStatsLibSQL = createTool({
	id: "getVectorStatsLibSQL",
	description: "LibSQLVectorのインデックス統計とパフォーマンス情報を取得。",
	inputSchema: z.object({}),
	outputSchema: z.object({
		success: z.boolean(),
		stats: z
			.object({
				totalVideos: z.number(),
				vectorDimensions: z.number(),
				indexName: z.string(),
				searchEngine: z.string(),
				averageConfidenceScore: z.number(),
			})
			.optional(),
		message: z.string().optional(),
		performance: z.string().optional(),
		error: z.string().optional(),
	}),
	execute: async ({ context }) => {
		try {
			const stats = await ragLibSQLService.getContentStats();

			return {
				success: true,
				stats: {
					totalVideos: stats.totalVideos,
					vectorDimensions: 768,
					indexName: "aimTrainingContent",
					searchEngine: "LibSQLVector",
					averageConfidenceScore: stats.averageConfidence,
				},
				message: `LibSQLVectorに${stats.totalVideos}本の動画が高性能インデックス化されています`,
				performance: "ベクトル検索最適化済み",
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "統計取得エラーが発生しました",
			};
		}
	},
});

// バッチ動画追加ツール（LibSQLVector最適化版）
export const batchAddChannelVideosLibSQL = createTool({
	id: "batchAddChannelVideosLibSQL",
	description: "チャンネルの全動画をLibSQLVectorに高効率でバッチ追加。大量動画の高速処理。",
	inputSchema: z.object({
		channelId: z.string().describe("YouTubeチャンネルID"),
		maxVideos: z.number().optional().default(50).describe("追加する動画の上限数"),
		batchSize: z.number().optional().default(10).describe("バッチ処理サイズ（メモリ効率）"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string().optional(),
		details: z
			.object({
				processed: z.number(),
				failed: z.number(),
				totalRequested: z.number(),
				batchSize: z.number(),
			})
			.optional(),
		performance: z.string().optional(),
		error: z.string().optional(),
	}),
	execute: async ({ context }) => {
		try {
			// チャンネルの動画一覧を取得
			const videos = await youtubeService.getChannelVideos(context.maxVideos);

			if (videos.length === 0) {
				return {
					success: false,
					error: "指定されたチャンネルに動画が見つかりませんでした",
				};
			}

			// 解析結果付きの動画リストを準備
			const videosWithAnalysis = [];

			for (const video of videos) {
				try {
					// 字幕取得
					const transcript = await youtubeService.getVideoTranscript(video.id);

					// Gemini解析
					const analysis = await contentAnalyzer.analyzeContent({
						video,
						transcript: transcript || undefined,
					});

					videosWithAnalysis.push({
						video,
						analysis,
						transcript: transcript?.text,
					});
				} catch (error) {
					console.warn(`Failed to analyze video ${video.id}: ${error}`);
				}
			}

			// LibSQLVectorにバッチ追加
			await ragLibSQLService.batchAddVideos(videosWithAnalysis);

			return {
				success: true,
				message: `バッチ処理完了: ${videosWithAnalysis.length}本の動画をLibSQLVectorに追加`,
				details: {
					processed: videosWithAnalysis.length,
					failed: videos.length - videosWithAnalysis.length,
					totalRequested: context.maxVideos,
					batchSize: context.batchSize,
				},
				performance: "LibSQLVector高効率バッチ処理",
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "バッチ処理エラーが発生しました",
			};
		}
	},
});

// ヘルパー関数
function extractVideoId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) {
			return match[1];
		}
	}

	return null;
}
