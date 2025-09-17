/**
 * YouTube Data API v3 integration service
 * 4BangerKovaaks channel specialized content fetching
 */

import { getEnv } from "../env.js";

export interface YouTubeVideo {
	id: string;
	title: string;
	description: string;
	publishedAt: string;
	duration: string;
	viewCount: number;
	thumbnailUrl: string;
}

export interface VideoTranscript {
	videoId: string;
	text: string;
	language: string;
}

export interface YouTubeChannelInfo {
	channelId: string;
	channelTitle: string;
	subscriberCount: number;
	videoCount: number;
}

export class YouTubeService {
	private readonly apiKey: string;
	private readonly baseUrl = "https://www.googleapis.com/youtube/v3";

	// 4BangerKovaaks channel ID (will need to be updated with actual ID)
	private readonly targetChannelId = "UC-4BangerKovaaks-CHANNEL-ID"; // TODO: Update with real channel ID

	constructor() {
		const env = getEnv();
		this.apiKey = env.YOUTUBE_API_KEY;
	}

	/**
	 * Get channel information for 4BangerKovaaks
	 */
	async getChannelInfo(): Promise<YouTubeChannelInfo> {
		const url = new URL(`${this.baseUrl}/channels`);
		url.searchParams.set("part", "snippet,statistics");
		url.searchParams.set("id", this.targetChannelId);
		url.searchParams.set("key", this.apiKey);

		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		if (!data.items || data.items.length === 0) {
			throw new Error("Channel not found");
		}

		const channel = data.items[0];
		return {
			channelId: channel.id,
			channelTitle: channel.snippet.title,
			subscriberCount: parseInt(channel.statistics.subscriberCount),
			videoCount: parseInt(channel.statistics.videoCount),
		};
	}

	/**
	 * Get all videos from 4BangerKovaaks channel
	 */
	async getChannelVideos(maxResults: number = 50): Promise<YouTubeVideo[]> {
		const videos: YouTubeVideo[] = [];
		let nextPageToken: string | undefined;

		do {
			const url = new URL(`${this.baseUrl}/search`);
			url.searchParams.set("part", "snippet");
			url.searchParams.set("channelId", this.targetChannelId);
			url.searchParams.set("type", "video");
			url.searchParams.set("order", "date");
			url.searchParams.set("maxResults", "50");
			url.searchParams.set("key", this.apiKey);

			if (nextPageToken) {
				url.searchParams.set("pageToken", nextPageToken);
			}

			const response = await fetch(url.toString());
			if (!response.ok) {
				throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			// Get detailed video information
			const videoIds = data.items.map((item: any) => item.id.videoId);
			const detailedVideos = await this.getVideoDetails(videoIds);

			videos.push(...detailedVideos);
			nextPageToken = data.nextPageToken;
		} while (nextPageToken && videos.length < maxResults);

		return videos.slice(0, maxResults);
	}

	/**
	 * Get detailed information for specific videos
	 */
	public async getVideoDetails(videoIds: string[]): Promise<YouTubeVideo[]> {
		if (videoIds.length === 0) return [];

		const url = new URL(`${this.baseUrl}/videos`);
		url.searchParams.set("part", "snippet,contentDetails,statistics");
		url.searchParams.set("id", videoIds.join(","));
		url.searchParams.set("key", this.apiKey);

		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		return data.items.map((item: any) => ({
			id: item.id,
			title: item.snippet.title,
			description: item.snippet.description,
			publishedAt: item.snippet.publishedAt,
			duration: item.contentDetails.duration,
			viewCount: parseInt(item.statistics.viewCount || "0"),
			thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
		}));
	}

	/**
	 * Get video transcript/captions
	 * Note: This requires additional setup for caption extraction
	 */
	async getVideoTranscript(videoId: string): Promise<VideoTranscript | null> {
		try {
			// First, get available captions
			const captionsUrl = new URL(`${this.baseUrl}/captions`);
			captionsUrl.searchParams.set("part", "snippet");
			captionsUrl.searchParams.set("videoId", videoId);
			captionsUrl.searchParams.set("key", this.apiKey);

			const captionsResponse = await fetch(captionsUrl.toString());
			if (!captionsResponse.ok) {
				console.warn(`No captions available for video ${videoId}`);
				return null;
			}

			const captionsData = await captionsResponse.json();
			if (!captionsData.items || captionsData.items.length === 0) {
				return null;
			}

			// Find English captions or auto-generated ones
			const englishCaption =
				captionsData.items.find(
					(item: any) => item.snippet.language === "en" || item.snippet.language === "en-US"
				) || captionsData.items[0];

			// Note: Downloading actual caption content requires OAuth2 authentication
			// For now, we return metadata indicating captions are available
			return {
				videoId,
				text: "Caption content requires OAuth2 authentication to download",
				language: englishCaption.snippet.language,
			};
		} catch (error) {
			console.error(`Error fetching transcript for video ${videoId}:`, error);
			return null;
		}
	}

	/**
	 * Search for specific aim-related videos in the channel
	 */
	async searchAimVideos(query: string, maxResults: number = 20): Promise<YouTubeVideo[]> {
		const url = new URL(`${this.baseUrl}/search`);
		url.searchParams.set("part", "snippet");
		url.searchParams.set("channelId", this.targetChannelId);
		url.searchParams.set("type", "video");
		url.searchParams.set("q", query);
		url.searchParams.set("order", "relevance");
		url.searchParams.set("maxResults", maxResults.toString());
		url.searchParams.set("key", this.apiKey);

		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		const videoIds = data.items.map((item: any) => item.id.videoId);

		return this.getVideoDetails(videoIds);
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
export const youtubeService = new YouTubeService();
