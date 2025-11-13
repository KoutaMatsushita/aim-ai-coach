/**
 * LangChain Tools for RAG (Knowledge Search & Content Addition)
 */

import { tool } from "@langchain/core/tools";
import type { MastraVector } from "@mastra/core/vector";
import { z } from "zod";
import { contentAnalyzer } from "../../mastra/services/content-analyzer";
import { RAGLibSQLService } from "../../mastra/services/rag-libsql";
import { youtubeService } from "../../mastra/services/youtube";

/**
 * ベクトル検索ツール（エイム練習コンテンツ検索）
 */
export const createVectorSearchTool = (vectorStore: MastraVector) =>
	tool(
		async ({
			query,
			limit = 5,
			difficultyLevel,
			aimElements,
			targetGames,
			minScore = 0.6,
		}: {
			query: string;
			limit?: number;
			difficultyLevel?: string;
			aimElements?: string[];
			targetGames?: string[];
			minScore?: number;
		}) => {
			const ragService = new RAGLibSQLService(vectorStore);
			await ragService.initializeIndex();

			const results = await ragService.search({
				text: query,
				limit,
				difficultyLevel,
				aimElements,
				targetGames,
				minScore,
			});

			return {
				query,
				resultsCount: results.length,
				results: results.map((r) => ({
					videoId: r.videoId,
					title: r.title,
					url: r.url,
					relevanceScore: r.relevanceScore,
					difficultyLevel: r.difficultyLevel,
					aimElements: r.aimElements,
					keyInsights: r.keyInsights,
					practiceRecommendations: r.practiceRecommendations,
					matchedContent: r.matchedContent,
				})),
			};
		},
		{
			name: "vector_search",
			description: `Search for aim training content (videos, guides, playlists) using semantic vector search.
This tool finds relevant training materials based on natural language queries and filters.

Use this when:
- User asks for training recommendations
- Need to find scenarios for specific skills
- Building a training playlist
- Looking for content on specific aim elements (tracking, flick, etc.)

The tool returns YouTube videos and text knowledge with detailed insights and practice recommendations.`,
			schema: z.object({
				query: z
					.string()
					.describe(
						"Natural language search query (e.g., 'tracking practice for beginners', 'flick aim improvement')",
					),
				limit: z
					.number()
					.int()
					.min(1)
					.max(20)
					.default(5)
					.describe("Maximum number of results to return"),
				difficultyLevel: z
					.enum(["beginner", "intermediate", "advanced", "expert"])
					.optional()
					.describe("Filter by difficulty level"),
				aimElements: z
					.array(z.string())
					.optional()
					.describe(
						"Filter by aim elements (e.g., ['tracking', 'flick', 'precision'])",
					),
				targetGames: z
					.array(z.string())
					.optional()
					.describe(
						"Filter by target games (e.g., ['VALORANT', 'CS2', 'Apex Legends'])",
					),
				minScore: z
					.number()
					.min(0)
					.max(1)
					.default(0.6)
					.describe("Minimum relevance score threshold (0-1)"),
			}),
		},
	);

/**
 * YouTube動画追加ツール
 */
export const createAddYoutubeContentTool = (vectorStore: MastraVector) =>
	tool(
		async ({ videoUrl }: { videoUrl: string }) => {
			try {
				const ragService = new RAGLibSQLService(vectorStore);
				await ragService.initializeIndex();

				// Extract video ID
				const videoId = extractVideoId(videoUrl);
				if (!videoId) {
					return { success: false, error: "Invalid YouTube URL" };
				}

				// Get video details
				const videoDetails = await youtubeService.getVideoDetails([videoId]);
				if (videoDetails.length === 0) {
					return { success: false, error: "Video not found" };
				}

				const video = videoDetails[0];

				// Get transcript
				const transcript = await youtubeService.getVideoTranscript(videoId);

				// Analyze content
				const analysis = await contentAnalyzer.analyzeContent({
					video,
					transcript: transcript || undefined,
				});

				// Add to vector store
				await ragService.addVideoContent(video, analysis, transcript?.text);

				return {
					success: true,
					message: `Added video "${video.title}" to knowledge base`,
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
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			name: "add_youtube_content",
			description: `Add a YouTube video to the knowledge base for future retrieval.
The video will be analyzed for aim training content, difficulty level, and relevant insights.

Use this when:
- User shares a useful aim training video
- Building up the knowledge base with new content
- User wants to save a specific tutorial or guide

The video's transcript and metadata will be analyzed and made searchable.`,
			schema: z.object({
				videoUrl: z
					.string()
					.describe(
						"YouTube video URL (e.g., https://youtube.com/watch?v=VIDEO_ID)",
					),
			}),
		},
	);

/**
 * テキスト知識追加ツール
 */
export const createAddTextKnowledgeTool = (vectorStore: MastraVector) =>
	tool(
		async ({
			title,
			content,
			category = "general",
			difficultyLevel,
			forceOverwrite = false,
		}: {
			title: string;
			content: string;
			category?: string;
			difficultyLevel?: "beginner" | "intermediate" | "advanced" | "expert";
			forceOverwrite?: boolean;
		}) => {
			try {
				const ragService = new RAGLibSQLService(vectorStore);
				await ragService.initializeIndex();

				// Analyze text content
				const analysis = await contentAnalyzer.analyzeTextContent({
					title,
					content,
					category,
					difficultyLevel,
				});

				// Add to vector store
				await ragService.addTextKnowledge({
					title,
					content,
					category,
					difficultyLevel: difficultyLevel || analysis.difficultyLevel,
					analysis,
					forceOverwrite,
				});

				return {
					success: true,
					message: `Added text knowledge "${title}" to knowledge base`,
					analysis: {
						title,
						category,
						difficultyLevel: difficultyLevel || analysis.difficultyLevel,
						aimElements: analysis.aimElements,
						keyTopics: analysis.keyInsights || [],
						confidenceScore: analysis.confidenceScore,
					},
				};
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		{
			name: "add_text_knowledge",
			description: `Add text-based knowledge (guides, tips, documentation) to the knowledge base.
The content will be analyzed and made searchable for future retrieval.

Use this when:
- User shares written guides or tips
- Documenting training methodologies
- Adding structured knowledge to the system

The text will be analyzed for aim elements, difficulty, and key insights.`,
			schema: z.object({
				title: z.string().describe("Title of the knowledge article"),
				content: z.string().describe("Full text content of the knowledge"),
				category: z
					.string()
					.default("general")
					.describe(
						"Category of knowledge (e.g., 'guide', 'tips', 'training_method')",
					),
				difficultyLevel: z
					.enum(["beginner", "intermediate", "advanced", "expert"])
					.optional()
					.describe("Difficulty level of the content"),
				forceOverwrite: z
					.boolean()
					.default(false)
					.describe("Overwrite existing knowledge with same title"),
			}),
		},
	);

/**
 * パーソナライズド推薦ツール
 */
export const createPersonalizedRecommendationTool = (
	vectorStore: MastraVector,
) =>
	tool(
		async ({
			userId,
			skillLevel,
			weakAreas,
			targetGame,
			limit = 5,
		}: {
			userId: string;
			skillLevel: string;
			weakAreas: string[];
			targetGame?: string;
			limit?: number;
		}) => {
			const ragService = new RAGLibSQLService(vectorStore);
			await ragService.initializeIndex();

			const recommendations = await ragService.getPersonalizedRecommendations(
				skillLevel,
				weakAreas,
				targetGame,
				limit,
			);

			return {
				userId,
				skillLevel: recommendations.userSkillLevel,
				weakAreas: recommendations.weakAreas,
				targetGame: recommendations.targetGame,
				reasoning: recommendations.reasoning,
				recommendations: recommendations.recommendations.map((r) => ({
					videoId: r.videoId,
					title: r.title,
					url: r.url,
					relevanceScore: r.relevanceScore,
					difficultyLevel: r.difficultyLevel,
					aimElements: r.aimElements,
					keyInsights: r.keyInsights,
					practiceRecommendations: r.practiceRecommendations,
				})),
			};
		},
		{
			name: "get_personalized_recommendations",
			description: `Get personalized training content recommendations based on user's skill level and weak areas.
This tool filters and ranks content specifically for the user's needs.

Use this when:
- Building a custom training playlist
- User asks for personalized recommendations
- Need content appropriate for user's skill level
- Addressing specific weaknesses

Returns content with reasoning for why it was recommended.`,
			schema: z.object({
				userId: z.string().describe("User ID for personalization"),
				skillLevel: z
					.string()
					.describe(
						"User's skill level (Beginner, Intermediate, Advanced, Expert)",
					),
				weakAreas: z
					.array(z.string())
					.describe(
						"Array of weak areas to focus on (e.g., ['tracking', 'flick'])",
					),
				targetGame: z
					.string()
					.optional()
					.describe("Target game for game-specific recommendations"),
				limit: z
					.number()
					.int()
					.min(1)
					.max(10)
					.default(5)
					.describe("Number of recommendations to return"),
			}),
		},
	);

/**
 * Helper function to extract video ID from YouTube URL
 */
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

/**
 * RAGツールファクトリー
 * vectorStoreを受け取ってすべてのRAGツールを生成
 */
export const createRagTools = (vectorStore: MastraVector) => [
	createVectorSearchTool(vectorStore),
	createAddYoutubeContentTool(vectorStore),
	createAddTextKnowledgeTool(vectorStore),
	createPersonalizedRecommendationTool(vectorStore),
];
