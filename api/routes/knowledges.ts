import { zValidator } from "@hono/zod-validator";
import { LibSQLVector } from "@mastra/libsql";
import { Hono } from "hono";
import z from "zod";
import { env } from "../env";
import { contentAnalyzer } from "../mastra/services/content-analyzer";
import { RAGLibSQLService } from "../mastra/services/rag-libsql";
import { youtubeService } from "../mastra/services/youtube";
import type { RequiredAuthVariables } from "../variables";

// Helper to get vector store
function getVectorStore() {
	return new LibSQLVector({
		connectionUrl: env.TURSO_DATABASE_URL,
		authToken: env.TURSO_AUTH_TOKEN,
	});
}

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

export const knowledgesApp = new Hono<{
	Variables: RequiredAuthVariables;
}>()
	.post(
		"/youtube",
		zValidator(
			"json",
			z.object({
				url: z.string().min(1).url(),
			}),
		),
		async (c) => {
			const { url } = await c.req.json();

			try {
				const vectorStore = getVectorStore();
				const ragLibSQLService = new RAGLibSQLService(vectorStore);
				await ragLibSQLService.initializeIndex();

				// YouTube URLからvideo IDを抽出
				const videoId = extractVideoId(url);
				if (!videoId)
					return c.json({ success: false, error: "video id not found" }, 400);

				// 動画の詳細情報を取得
				const videoDetails = await youtubeService.getVideoDetails([videoId]);
				if (videoDetails.length === 0)
					return c.json({ success: false, error: "video not found" }, 400);

				const video = videoDetails[0];

				// 字幕の取得を試行
				const transcript = await youtubeService.getVideoTranscript(videoId);

				// Gemini解析実行
				const analysis = await contentAnalyzer.analyzeContent({
					video,
					transcript: transcript || undefined,
				});

				// LibSQLVectorに追加
				await ragLibSQLService.addVideoContent(
					video,
					analysis,
					transcript?.text,
				);

				return c.json({
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
				});
			} catch (error) {
				return c.json(
					{
						success: false,
						error:
							error instanceof Error
								? error.message
								: "未知のエラーが発生しました",
					},
					500,
				);
			}
		},
	)
	.post(
		"/text",
		zValidator(
			"json",
			z.object({
				title: z.string().min(1),
				content: z.string().min(1),
				forceOverwrite: z.boolean().default(false),
			}),
		),
		async (c) => {
			const { title, content, forceOverwrite } = await c.req.json();

			try {
				const vectorStore = getVectorStore();
				const ragLibSQLService = new RAGLibSQLService(vectorStore);
				await ragLibSQLService.initializeIndex();

				// Gemini解析実行（テキスト内容を解析）
				const analysis = await contentAnalyzer.analyzeTextContent({
					title: title,
					content: content,
				});

				// LibSQLVectorに追加
				await ragLibSQLService.addTextKnowledge({
					title: title,
					content: content,
					category: "general",
					difficultyLevel: analysis.difficultyLevel,
					analysis,
					forceOverwrite: forceOverwrite,
				});

				return c.json({
					success: true,
					message: `テキスト知識「${title}」をLibSQLVectorに追加しました`,
					analysis: {
						title: title,
						difficultyLevel: analysis.difficultyLevel,
						aimElements: analysis.aimElements,
						keyTopics: analysis.keyInsights || [],
						chunkCount: Math.ceil(content.length / 1000),
						confidenceScore: analysis.confidenceScore,
					},
				});
			} catch (error) {
				return c.json(
					{
						success: false,
						error:
							error instanceof Error
								? error.message
								: "テキスト知識追加エラーが発生しました",
					},
					500,
				);
			}
		},
	);
