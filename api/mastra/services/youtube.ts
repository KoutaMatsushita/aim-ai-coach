/**
 * YouTube Data API v3 integration service
 * 4BangerKovaaks channel specialized content fetching
 */

import { getEnv } from "../env";

/**
 * YouTube動画の基本情報
 *
 * @interface YouTubeVideo
 * @description YouTube Data API から取得される動画のメタデータ
 */
export interface YouTubeVideo {
	/** YouTube動画ID */
	id: string;
	/** 動画タイトル */
	title: string;
	/** 動画説明文 */
	description: string;
	/** 公開日時（ISO 8601形式） */
	publishedAt: string;
	/** 動画長（ISO 8601 duration形式、例: PT4M13S） */
	duration: string;
	/** 再生回数 */
	viewCount: number;
	/** サムネイル画像URL */
	thumbnailUrl: string;
}

/**
 * 動画の字幕・転写データ
 *
 * @interface VideoTranscript
 * @description YouTube動画から取得される字幕テキスト情報
 */
export interface VideoTranscript {
	/** 対象動画のID */
	videoId: string;
	/** 字幕テキスト内容 */
	text: string;
	/** 字幕の言語コード */
	language: string;
}

/**
 * YouTubeチャンネルの情報
 *
 * @interface YouTubeChannelInfo
 * @description YouTube Data API から取得されるチャンネルの基本統計情報
 */
export interface YouTubeChannelInfo {
	/** チャンネルID */
	channelId: string;
	/** チャンネル名 */
	channelTitle: string;
	/** 登録者数 */
	subscriberCount: number;
	/** 動画投稿数 */
	videoCount: number;
}

/**
 * YouTube Data API v3 統合サービス
 *
 * @description 4BangerKovaaksチャンネル専用のYouTube動画とメタデータ取得機能を提供します。
 * 動画情報、字幕、チャンネル統計など包括的なYouTubeデータアクセスを行います。
 *
 * @example
 * ```typescript
 * const service = new YouTubeService();
 *
 * // チャンネル動画取得
 * const videos = await service.getChannelVideos("CHANNEL_ID", 10);
 *
 * // 字幕取得
 * const transcript = await service.getVideoTranscript("VIDEO_ID");
 * ```
 */
export class YouTubeService {
	private readonly apiKey: string;
	private readonly baseUrl = "https://www.googleapis.com/youtube/v3";
	private readonly maxRetries = 3;
	private readonly retryDelayMs = 1000;

	constructor() {
		const env = getEnv();
		this.apiKey = env.YOUTUBE_API_KEY;
	}

	/**
	 * Retry wrapper for API calls with exponential backoff
	 */
	private async retryApiCall<T>(
		operation: () => Promise<T>,
		context: string,
		retryCount = 0
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			const isRetryableError = this.isRetryableError(error);
			const shouldRetry = retryCount < this.maxRetries && isRetryableError;

			if (shouldRetry) {
				const delay = this.retryDelayMs * 2 ** retryCount;
				console.warn(
					`${context} failed (attempt ${retryCount + 1}/${this.maxRetries + 1}), retrying in ${delay}ms...`,
					error
				);

				await new Promise((resolve) => setTimeout(resolve, delay));
				return this.retryApiCall(operation, context, retryCount + 1);
			}

			console.error(`${context} failed after ${retryCount + 1} attempts:`, error);
			throw error;
		}
	}

	/**
	 * Check if error is retryable (rate limits, temporary failures)
	 */
	private isRetryableError(error: any): boolean {
		if (error?.status) {
			// Retry on rate limits and temporary server errors
			return [429, 500, 502, 503, 504].includes(error.status);
		}

		// Retry on network errors
		if (error?.code === "NETWORK_ERROR" || error?.message?.includes("fetch")) {
			return true;
		}

		return false;
	}

	/**
	 * Get detailed information for specific videos with batch processing and error handling
	 */
	public async getVideoDetails(videoIds: string[]): Promise<YouTubeVideo[]> {
		if (videoIds.length === 0) return [];

		// Process in batches to avoid URL length limits and improve error recovery
		const batchSize = 50; // YouTube API supports up to 50 IDs per request
		const results: YouTubeVideo[] = [];

		for (let i = 0; i < videoIds.length; i += batchSize) {
			const batch = videoIds.slice(i, i + batchSize);

			try {
				const batchResults = await this.retryApiCall(
					async () => {
						const url = new URL(`${this.baseUrl}/videos`);
						url.searchParams.set("part", "snippet,contentDetails,statistics");
						url.searchParams.set("id", batch.join(","));
						url.searchParams.set("key", this.apiKey);

						const response = await fetch(url.toString());
						if (!response.ok) {
							const error = new Error(
								`YouTube API error: ${response.status} ${response.statusText}`
							);
							(error as any).status = response.status;
							throw error;
						}

						const data: { items: any[] } = await response.json();

						return data.items.map((item: any) => ({
							id: item.id,
							title: item.snippet?.title || "Unknown Title",
							description: item.snippet?.description || "",
							publishedAt: item.snippet?.publishedAt || "",
							duration: item.contentDetails?.duration || "PT0S",
							viewCount: parseInt(item.statistics?.viewCount || "0"),
							thumbnailUrl:
								item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
						}));
					},
					`getVideoDetails batch ${Math.floor(i / batchSize) + 1}`
				);

				results.push(...batchResults);
			} catch (error) {
				console.warn(`Failed to get details for batch starting at index ${i}:`, error);
				// Continue with next batch instead of failing completely
			}

			// Add delay between batches to respect rate limits
			if (i + batchSize < videoIds.length) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		return results;
	}

	/**
	 * Get video transcript/captions using youtube-transcript-api approach
	 * Falls back to description analysis if no transcript available
	 */
	async getVideoTranscript(videoId: string): Promise<VideoTranscript | null> {
		try {
			// Try to get auto-generated transcript via direct API approach
			const transcriptText = await this.fetchTranscriptDirect(videoId);

			if (transcriptText) {
				return {
					videoId,
					text: transcriptText,
					language: "auto-detected",
				};
			}

			// Fallback: Use video description for content analysis
			console.warn(`No transcript available for ${videoId}, using description fallback`);
			const videoDetails = await this.getVideoDetails([videoId]);

			if (videoDetails.length > 0 && videoDetails[0].description) {
				return {
					videoId,
					text: videoDetails[0].description,
					language: "description-fallback",
				};
			}

			return null;
		} catch (error) {
			console.error(`Error fetching transcript for video ${videoId}:`, error);
			return null;
		}
	}

	/**
	 * Direct transcript fetching using public YouTube transcript endpoints
	 */
	private async fetchTranscriptDirect(videoId: string): Promise<string | null> {
		try {
			// YouTube's player response endpoint
			const playerUrl = `https://www.youtube.com/youtubei/v1/player?key=${this.apiKey}`;

			const playerResponse = await fetch(playerUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					context: {
						client: {
							clientName: "WEB",
							clientVersion: "2.20220801.00.00",
						},
					},
					videoId: videoId,
				}),
			});

			if (!playerResponse.ok) {
				return null;
			}

			const playerData: any = await playerResponse.json();
			const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

			if (!captions || captions.length === 0) {
				return null;
			}

			// Find English auto-generated captions or any available captions
			const englishCaption =
				captions.find(
					(caption: any) => caption.languageCode === "en" || caption.languageCode === "en-US"
				) || captions[0];

			if (!englishCaption?.baseUrl) {
				return null;
			}

			// Fetch the actual transcript content
			const transcriptResponse = await fetch(englishCaption.baseUrl);
			if (!transcriptResponse.ok) {
				return null;
			}

			const transcriptXml = await transcriptResponse.text();

			// Parse XML transcript to extract text
			const textMatches = transcriptXml.match(/<text[^>]*>(.*?)<\/text>/g);
			if (!textMatches) {
				return null;
			}

			const transcriptText = textMatches
				.map((match) => {
					// Extract text content and decode HTML entities
					const textContent = match.replace(/<text[^>]*>|<\/text>/g, "");
					return this.decodeHtmlEntities(textContent);
				})
				.join(" ")
				.replace(/\s+/g, " ")
				.trim();

			return transcriptText || null;
		} catch (error) {
			console.warn(`Direct transcript fetch failed for ${videoId}:`, error);
			return null;
		}
	}

	/**
	 * Decode HTML entities in transcript text
	 */
	private decodeHtmlEntities(text: string): string {
		const entities: Record<string, string> = {
			"&amp;": "&",
			"&lt;": "<",
			"&gt;": ">",
			"&quot;": '"',
			"&#39;": "'",
			"&nbsp;": " ",
		};

		return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => entities[entity] || entity);
	}

	/**
	 * Search for specific aim-related videos in the channel
	 */
	async searchAimVideos(
		channelId: string,
		query: string,
		maxResults: number = 20
	): Promise<YouTubeVideo[]> {
		return this.retryApiCall(async () => {
			const url = new URL(`${this.baseUrl}/search`);
			url.searchParams.set("part", "snippet");
			url.searchParams.set("channelId", channelId);
			url.searchParams.set("type", "video");
			url.searchParams.set("q", query);
			url.searchParams.set("order", "relevance");
			url.searchParams.set("maxResults", maxResults.toString());
			url.searchParams.set("key", this.apiKey);

			const response = await fetch(url.toString());
			if (!response.ok) {
				const error = new Error(`YouTube API error: ${response.status} ${response.statusText}`);
				(error as any).status = response.status;
				throw error;
			}

			const data: any = await response.json();
			const videoIds = data.items.map((item: any) => item.id.videoId);

			return this.getVideoDetails(videoIds);
		}, `searchAimVideos in channel ${channelId}`);
	}

	/**
	 * Utility method to parse ISO 8601 duration to seconds
	 */
	static parseDuration(isoDuration: string): number {
		const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
		if (!match) return 0;

		const hours = parseInt(match[1] || "0");
		const minutes = parseInt(match[2] || "0");
		const seconds = parseInt(match[3] || "0");

		return hours * 3600 + minutes * 60 + seconds;
	}
}

// Export singleton instance
/**
 * YouTubeServiceクラスのシングルトンインスタンス
 *
 * @description アプリケーション全体で共有するYouTubeServiceのインスタンス。
 * 4BangerKovaaksチャンネルの動画データ取得に最適化されています。
 *
 * @example
 * ```typescript
 * import { youtubeService } from './youtube';
 *
 * const videos = await youtubeService.getChannelVideos(
 *   "CHANNEL_ID",
 *   10
 * );
 * ```
 */
export const youtubeService = new YouTubeService();
