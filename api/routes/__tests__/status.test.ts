/**
 * Status API Tests
 * Task 11: Status API の実装
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Variables } from "../../variables";

// Mock user
const mockUser = {
	id: "test-user-123",
	name: "Test User",
	email: "test@example.com",
};

// Mock database with scores
const mockDb = {
	query: {
		kovaaksScoresTable: {
			findMany: vi.fn().mockResolvedValue([
				{
					id: 1,
					userId: "test-user-123",
					scenarioName: "Tile Frenzy",
					runEpochSec: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
					accuracy: 0.85,
					score: 1000,
				},
				{
					id: 2,
					userId: "test-user-123",
					scenarioName: "1wall 6targets",
					runEpochSec: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
					accuracy: 0.8,
					score: 950,
				},
			]),
		},
		playlistsTable: {
			findFirst: vi.fn().mockResolvedValue({
				id: "playlist_123",
				userId: "test-user-123",
				title: "Training Playlist",
				scenarios: [
					{
						scenarioName: "Tile Frenzy",
						platform: "kovaaks",
						duration: 10,
					},
				],
				isActive: true,
				createdAt: new Date(),
			}),
		},
		dailyReportsTable: {
			findFirst: vi.fn().mockResolvedValue({
				id: "report_123",
				userId: "test-user-123",
				date: new Date(),
				performanceRating: "good",
				achievements: ["Personal Best"],
				createdAt: new Date(),
			}),
		},
	},
};

describe("Task 11: Status API", () => {
	let app: Hono<{ Variables: Variables }>;
	let statusApp: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Import coaching app dynamically
		const { coachingApp } = await import("../coaching");

		// Create test app with middleware
		app = new Hono<{ Variables: Variables }>();

		// Setup mock middleware
		app.use("*", async (c, next) => {
			c.set("user", mockUser);
			c.set("db", mockDb as any);
			await next();
		});

		// Mount coaching routes
		app.route("/", coachingApp);
	});

	describe("Task 11.1: GET /status - Coaching Status", () => {
		it("should return coaching status successfully", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			// Verify response structure
			expect(body).toHaveProperty("userId");
			expect(body).toHaveProperty("userContext");
			expect(body).toHaveProperty("todaysFocus");
			expect(body).toHaveProperty("recentTrends");
			expect(body).toHaveProperty("activePlaylist");
			expect(body).toHaveProperty("latestReport");

			expect(body.userId).toBe("test-user-123");
		});

		it("should include user context information", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.userContext).toHaveProperty("contextType");
			expect(body.userContext.contextType).toMatch(
				/new_user|returning_user|active_user|playlist_recommended|analysis_recommended/,
			);
		});

		it("should include today's focus information", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.todaysFocus).toHaveProperty("focusSkills");
			expect(body.todaysFocus).toHaveProperty("recommendedDuration");
			expect(body.todaysFocus).toHaveProperty("recommendedScenarios");

			expect(Array.isArray(body.todaysFocus.focusSkills)).toBe(true);
			expect(Array.isArray(body.todaysFocus.recommendedScenarios)).toBe(true);
			expect(typeof body.todaysFocus.recommendedDuration).toBe("number");
		});

		it("should include recent trends summary (7 days)", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.recentTrends).toHaveProperty("overallTrend");
			expect(body.recentTrends).toHaveProperty("improvingSkills");
			expect(body.recentTrends).toHaveProperty("challengingSkills");
			expect(body.recentTrends).toHaveProperty("sessionsCount");

			expect(body.recentTrends.overallTrend).toMatch(
				/improving|stable|declining/,
			);
			expect(Array.isArray(body.recentTrends.improvingSkills)).toBe(true);
			expect(Array.isArray(body.recentTrends.challengingSkills)).toBe(true);
			expect(typeof body.recentTrends.sessionsCount).toBe("number");
		});

		it("should include active playlist information", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.activePlaylist).toHaveProperty("hasPlaylist");
			expect(typeof body.activePlaylist.hasPlaylist).toBe("boolean");

			if (body.activePlaylist.hasPlaylist) {
				expect(body.activePlaylist).toHaveProperty("playlistId");
				expect(body.activePlaylist).toHaveProperty("title");
				expect(body.activePlaylist).toHaveProperty("scenariosCount");
			}
		});

		it("should include latest report information", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.latestReport).toHaveProperty("hasReport");
			expect(typeof body.latestReport.hasReport).toBe("boolean");

			if (body.latestReport.hasReport) {
				expect(body.latestReport).toHaveProperty("reportId");
				expect(body.latestReport).toHaveProperty("generatedAt");
				expect(body.latestReport).toHaveProperty("performanceRating");
			}
		});

		it("should validate userId query parameter", async () => {
			const res = await app.request("/status", {
				method: "GET",
			});

			expect(res.status).toBe(400);
		});

		it("should handle errors gracefully", async () => {
			// Mock database error
			mockDb.query.kovaaksScoresTable.findMany = vi
				.fn()
				.mockRejectedValue(new Error("Database error"));

			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			expect(res.status).toBe(500);
			const body = await res.json();
			expect(body).toHaveProperty("error");
		});

		it("should handle user with no data", async () => {
			// Mock empty data
			mockDb.query.kovaaksScoresTable.findMany = vi.fn().mockResolvedValue([]);
			mockDb.query.playlistsTable.findFirst = vi.fn().mockResolvedValue(null);
			mockDb.query.dailyReportsTable.findFirst = vi
				.fn()
				.mockResolvedValue(null);

			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.userContext.contextType).toBe("new_user");
			expect(body.activePlaylist.hasPlaylist).toBe(false);
			expect(body.latestReport.hasReport).toBe(false);
		});
	});
});
