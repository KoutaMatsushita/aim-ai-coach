import { tool } from "ai";
import z from "zod";
import { contentAnalyzer } from "../services/content-analyzer";
import { RAGLibSQLService } from "../services/rag-libsql";
import { youtubeService } from "../services/youtube";

export const createRagTools = (ragService: RAGLibSQLService) => ({
	// @ts-ignore
	addYoutubeContentTool: tool({
		description: "YouTube動画を解析してLibSQLVectorに追加。",
		inputSchema: z.object({
			videoUrl: z
				.string()
				.describe(
					"YouTube動画のURL (例: https://youtube.com/watch?v=VIDEO_ID)",
				),
		}),
		execute: async ({ videoUrl }: { videoUrl: string }) => {
			try {
				await ragService.initializeIndex();

				// YouTube URLからvideo IDを抽出
				const videoId = extractVideoId(videoUrl);
				if (!videoId) return { success: false, error: "video id not found" };

				// 動画の詳細情報を取得
				const videoDetails = await youtubeService.getVideoDetails([videoId]);
				if (videoDetails.length === 0)
					return { success: false, error: "video not found" };

				const video = videoDetails[0];

				// 字幕の取得を試行
				const transcript = await youtubeService.getVideoTranscript(videoId);

				// Gemini解析実行
				const analysis = await contentAnalyzer.analyzeContent({
					video,
					transcript: transcript || undefined,
				});

				// LibSQLVectorに追加
				await ragService.addVideoContent(video, analysis, transcript?.text);

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
					error:
						error instanceof Error
							? error.message
							: "未知のエラーが発生しました",
				};
			}
		},
	}),

	addTextFileKnowledgeTool: tool({
		description:
			"txtファイルの内容を解析してLibSQLVectorに知識として追加。エイム練習関連の文書やガイドを蓄積。",
		parameters: z.object({
			filePath: z.string().describe("処理対象のtxtファイルのパス"),
			title: z
				.string()
				.describe("知識のタイトル（ファイル名から自動設定も可能）"),
			category: z
				.string()
				.optional()
				.describe("知識のカテゴリ（例: guide, tips, training_method）"),
			difficultyLevel: z
				.enum(["beginner", "intermediate", "advanced", "expert"])
				.optional()
				.describe("内容の難易度レベル"),
			forceOverwrite: z
				.boolean()
				.optional()
				.default(false)
				.describe("既存の同タイトル知識を上書きするか"),
		}),
		// @ts-ignore
		execute: async (args: {
			filePath: string;
			title: string;
			category?: string;
			difficultyLevel?: "beginner" | "intermediate" | "advanced" | "expert";
			forceOverwrite: boolean;
		}) => {
			try {
				const fs = await import("fs/promises");
				try {
					await fs.access(args.filePath);
				} catch {
					return {
						success: false,
						error: `ファイルが見つかりません: ${args.filePath}`,
					};
				}

				// ファイル内容読み込み
				const fileContent = await fs.readFile(args.filePath, "utf-8");

				if (!fileContent.trim()) {
					return { success: false, error: "ファイルが空です" };
				}

				// テキスト知識追加ツールを直接呼び出すのではなく、ロジックを再利用するか共通化すべきだが、
				// ここではとりあえず直接実装するか、分離されたメソッドを呼ぶ。
				// execute 関数内から sibling tool を呼ぶのは難しいので、共通関数化するか、ここで実装する。
				// ここでは `addTextKnowledgeTool` のロジックを再実装（あるいは共通関数呼び出し）する。
				// Dependency として `addTextKnowledgeImpl` みたいなものがあればいいが、
				// ここでは `ragService` を使って直接実装する。

				// Gemini解析実行（テキスト内容を解析）
				// args.title, args.category, args.difficultyLevel を使う
				const analysis = await contentAnalyzer.analyzeTextContent({
					title: args.title,
					content: fileContent,
					category: args.category,
					difficultyLevel: args.difficultyLevel,
				});

				await ragService.initializeIndex();

				// LibSQLVectorに追加
				await ragService.addTextKnowledge({
					title: args.title,
					content: fileContent,
					category: args.category || "general",
					difficultyLevel: args.difficultyLevel || analysis.difficultyLevel,
					analysis,
					forceOverwrite: args.forceOverwrite,
				});

				return {
					success: true,
					message: `テキスト知識「${args.title}」をLibSQLVectorに追加しました`,
					analysis: {
						title: args.title,
						category: args.category || "general",
						difficultyLevel: args.difficultyLevel || analysis.difficultyLevel,
						aimElements: analysis.aimElements,
						keyTopics: analysis.keyInsights || [],
						chunkCount: Math.ceil(fileContent.length / 1000), // 概算チャンク数
						confidenceScore: analysis.confidenceScore,
					},
				};
			} catch (error) {
				return {
					success: false,
					error:
						error instanceof Error
							? error.message
							: "テキスト知識追加エラーが発生しました",
				};
			}
		},
	}),

	addTextKnowledgeTool: tool({
		description:
			"文字列の内容を解析してLibSQLVectorに知識として追加。エイム練習関連の文書やガイドを蓄積。",
		parameters: z.object({
			content: z.string().min(1).describe("テキスト"),
			title: z.string().describe("知識のタイトル"),
			category: z
				.string()
				.optional()
				.describe("知識のカテゴリ（例: guide, tips, training_method）"),
			difficultyLevel: z
				.enum(["beginner", "intermediate", "advanced", "expert"])
				.optional()
				.describe("内容の難易度レベル"),
			forceOverwrite: z
				.boolean()
				.optional()
				.default(false)
				.describe("既存の同タイトル知識を上書きするか"),
		}),
		// @ts-ignore
		execute: async (args: {
			content: string;
			title: string;
			category?: string;
			difficultyLevel?: "beginner" | "intermediate" | "advanced" | "expert";
			forceOverwrite: boolean;
		}) => {
			try {
				await ragService.initializeIndex();

				const analysis = await contentAnalyzer.analyzeTextContent({
					title: args.title,
					content: args.content,
					category: args.category,
					difficultyLevel: args.difficultyLevel,
				});

				await ragService.addTextKnowledge({
					title: args.title,
					content: args.content,
					category: args.category || "general",
					difficultyLevel: args.difficultyLevel || analysis.difficultyLevel,
					analysis,
					forceOverwrite: args.forceOverwrite,
				});

				return {
					success: true,
					message: `テキスト知識「${args.title}」をLibSQLVectorに追加しました`,
					analysis: {
						title: args.title,
						category: args.category || "general",
						difficultyLevel: args.difficultyLevel || analysis.difficultyLevel,
						aimElements: analysis.aimElements,
						keyTopics: analysis.keyInsights || [],
						chunkCount: Math.ceil(args.content.length / 1000),
						confidenceScore: analysis.confidenceScore,
					},
				};
			} catch (error) {
				return {
					success: false,
					error:
						error instanceof Error
							? error.message
							: "テキスト知識追加エラーが発生しました",
				};
			}
		},
	}),

	vectorTool: tool({
		description: "RAG から検索を行う",
		parameters: z.object({
			query: z.string().describe("検索クエリ"),
			difficultyLevel: z.string().optional(),
			aimElements: z.array(z.string()).optional(),
			targetGames: z.array(z.string()).optional(),
		}),
		// @ts-ignore
		execute: async ({
			query,
			difficultyLevel,
			aimElements,
			targetGames,
		}: {
			query: string;
			difficultyLevel?: string;
			aimElements?: string[];
			targetGames?: string[];
		}) => {
			const results = await ragService.search({
				text: query,
				difficultyLevel,
				aimElements,
				targetGames,
			});
			return results;
		},
	}),
});

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
