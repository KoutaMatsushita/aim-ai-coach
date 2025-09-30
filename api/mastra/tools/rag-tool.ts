import { createTool } from "@mastra/core";
import z from "zod";
import {contentAnalyzer} from "../services/content-analyzer";
import {RAGLibSQLService} from "../services/rag-libsql";
import {youtubeService} from "../services/youtube";
import { RuntimeContext } from "@mastra/core/di";

export const addYoutubeContentTool = createTool({
    id: "addYoutubeContentTool",
    description: "YouTube動画を解析してLibSQLVectorに追加。",
    inputSchema: z.object({
        videoUrl: z.string().describe("YouTube動画のURL (例: https://youtube.com/watch?v=VIDEO_ID)"),
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
    execute: async ({ context, mastra }) => {
        try {
            if (!mastra) return { success: false, error: "mastra not found" }

            const ragLibSQLService = new RAGLibSQLService(mastra.getVector("vector"))
            await ragLibSQLService.initializeIndex();

            // YouTube URLからvideo IDを抽出
            const videoId = extractVideoId(context.videoUrl);
            if (!videoId) return { success: false, error: "video id not found" }

            // 動画の詳細情報を取得
            const videoDetails = await youtubeService.getVideoDetails([videoId]);
            if (videoDetails.length === 0) return { success: false, error: "video not found" }

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

export const addTextFileKnowledgeTool = createTool({
    id: "addTextFileKnowledgeTool",
    description:
        "txtファイルの内容を解析してLibSQLVectorに知識として追加。エイム練習関連の文書やガイドを蓄積。",
    inputSchema: z.object({
        filePath: z.string().describe("処理対象のtxtファイルのパス"),
        title: z.string().describe("知識のタイトル（ファイル名から自動設定も可能）"),
        category: z.string().optional().describe("知識のカテゴリ（例: guide, tips, training_method）"),
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
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string().optional(),
        analysis: z
            .object({
                title: z.string(),
                category: z.string(),
                difficultyLevel: z.string(),
                aimElements: z.array(z.string()),
                keyTopics: z.array(z.string()),
                chunkCount: z.number(),
                confidenceScore: z.number(),
            })
            .optional(),
        error: z.string().optional(),
    }),
    execute: async ({ context, mastra }) => {
        try {
            if (!mastra) return { success: false, error: "mastra not found" }

            const fs = await import("fs/promises");

            try {
                await fs.access(context.filePath);
            } catch {
                return { success: false, error: "ファイルが見つかりません: ${context.filePath}" }
            }

            // ファイル内容読み込み
            const fileContent = await fs.readFile(context.filePath, "utf-8");

            if (!fileContent.trim()) {
                return { success: false, error: "ファイルが空です" }
            }

            return await addTextKnowledgeTool.execute({
                context: {
                    ...context,
                    content: fileContent,
                },
                runtimeContext: new RuntimeContext(),
            });
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "テキスト知識追加エラーが発生しました",
            };
        }
    },
});

export const addTextKnowledgeTool = createTool({
    id: "addTextKnowledgeTool",
    description:
        "文字列の内容を解析してLibSQLVectorに知識として追加。エイム練習関連の文書やガイドを蓄積。",
    inputSchema: z.object({
        content: z.string().min(1).describe("テキスト"),
        title: z.string().describe("知識のタイトル"),
        category: z.string().optional().describe("知識のカテゴリ（例: guide, tips, training_method）"),
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
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string().optional(),
        analysis: z
            .object({
                title: z.string(),
                category: z.string(),
                difficultyLevel: z.string(),
                aimElements: z.array(z.string()),
                keyTopics: z.array(z.string()),
                chunkCount: z.number(),
                confidenceScore: z.number(),
            })
            .optional(),
        error: z.string().optional(),
    }),
    execute: async ({ context, mastra }) => {
        try {
            if (!mastra) return { success: false, error: "mastra not found" }

            const ragLibSQLService = new RAGLibSQLService(mastra.getVector("vector"))
            await ragLibSQLService.initializeIndex();

            // Gemini解析実行（テキスト内容を解析）
            const analysis = await contentAnalyzer.analyzeTextContent({
                title: context.title,
                content: context.content,
                category: context.category,
                difficultyLevel: context.difficultyLevel,
            });

            // LibSQLVectorに追加
            await ragLibSQLService.addTextKnowledge({
                title: context.title,
                content: context.content,
                category: context.category || "general",
                difficultyLevel: context.difficultyLevel || analysis.difficultyLevel,
                analysis,
                forceOverwrite: context.forceOverwrite,
            });

            return {
                success: true,
                message: `テキスト知識「${context.title}」をLibSQLVectorに追加しました`,
                analysis: {
                    title: context.title,
                    category: context.category || "general",
                    difficultyLevel: context.difficultyLevel || analysis.difficultyLevel,
                    aimElements: analysis.aimElements,
                    keyTopics: analysis.keyInsights || [],
                    chunkCount: Math.ceil(context.content.length / 1000), // 概算チャンク数
                    confidenceScore: analysis.confidenceScore,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "テキスト知識追加エラーが発生しました",
            };
        }
    },
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
