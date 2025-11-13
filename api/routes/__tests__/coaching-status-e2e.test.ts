/**
 * Dashboard Status API E2E Tests
 * Task 14.3: Dashboard Status API E2E テストを実装
 */

import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Variables } from "../../variables";
import { coachingApp } from "../coaching";

// Mock user
const mockUser = {
	id: "test-user-123",
	name: "Test User",
	email: "test@example.com",
};

// Mock database with comprehensive data
const createMockDb = () => {
	const now = Date.now();
	const oneDayAgo = Math.floor((now - 24 * 60 * 60 * 1000) / 1000);
	const sevenDaysAgo = Math.floor((now - 7 * 24 * 60 * 60 * 1000) / 1000);

	return {
		query: {
			kovaaksScoresTable: {
				findMany: vi.fn().mockImplementation(({ where, limit, orderBy }) => {
					// Mock recent scores (last 7 days)
					const recentScores = [
						{
							id: 1,
							userId: "test-user-123",
							scenarioName: "Tile Frenzy",
							runEpochSec: oneDayAgo,
							accuracy: 0.85,
							score: 1000,
							kills: 100,
							deaths: 10,
						},
						{
							id: 2,
							userId: "test-user-123",
							scenarioName: "1wall 6targets",
							runEpochSec: oneDayAgo - 3600,
							accuracy: 0.82,
							score: 950,
							kills: 95,
							deaths: 12,
						},
						{
							id: 3,
							userId: "test-user-123",
							scenarioName: "Close Fast Strafes",
							runEpochSec: sevenDaysAgo + 3600,
							accuracy: 0.78,
							score: 900,
							kills: 90,
							deaths: 15,
						},
					];

					// If limit is 1, return only the most recent score
					if (limit === 1) {
						return Promise.resolve([recentScores[0]]);
					}

					// Otherwise return all recent scores (within 7 days)
					return Promise.resolve(recentScores);
				}),
			},
			playlistsTable: {
				findFirst: vi.fn().mockResolvedValue({
					id: "playlist-1",
					userId: "test-user-123",
					title: "Active Training Playlist",
					scenarios: [
						{
							scenarioName: "Tile Frenzy",
							platform: "kovaaks",
							duration: 10,
						},
						{
							scenarioName: "1wall 6targets",
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
					id: "report-1",
					userId: "test-user-123",
					date: new Date(),
					performanceRating: "good",
					achievements: ["Improved tracking"],
					challenges: ["Consistency"],
					recommendations: ["Practice flicking"],
					createdAt: new Date(),
				}),
			},
		},
	} as unknown as DrizzleD1Database<any>;
};

describe("Task 14.3: Dashboard Status API E2E Tests", () => {
	let app: Hono<{ Variables: Variables }>;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create test app with middleware
		app = new Hono<{ Variables: Variables }>();

		// Setup mock middleware
		app.use("*", async (c, next) => {
			c.set("user", mockUser);
			c.set("db", createMockDb());
			await next();
		});

		// Mount coaching routes
		app.route("/", coachingApp);
	});

	describe("Status Request → Context Detection → Data Aggregation → Response", () => {
		it("should return comprehensive coaching status for active user", async () => {
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

			// Verify userId
			expect(body.userId).toBe("test-user-123");
		});

		it("should detect user context correctly (active_user)", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			const body = await res.json();

			expect(body.userContext).toHaveProperty("contextType");
			expect(body.userContext.contextType).toBe("active_user");
		});

		it("should aggregate recent trends with session count", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			const body = await res.json();

			// Verify recent trends structure
			expect(body.recentTrends).toHaveProperty("overallTrend");
			expect(body.recentTrends).toHaveProperty("improvingSkills");
			expect(body.recentTrends).toHaveProperty("challengingSkills");
			expect(body.recentTrends).toHaveProperty("sessionsCount");

			// Verify session count
			expect(body.recentTrends.sessionsCount).toBeGreaterThan(0);
		});

		it("should provide today's focus recommendations", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			const body = await res.json();

			// Verify today's focus structure
			expect(body.todaysFocus).toHaveProperty("focusSkills");
			expect(body.todaysFocus).toHaveProperty("recommendedDuration");
			expect(body.todaysFocus).toHaveProperty("recommendedScenarios");

			// Verify arrays
			expect(Array.isArray(body.todaysFocus.focusSkills)).toBe(true);
			expect(Array.isArray(body.todaysFocus.recommendedScenarios)).toBe(true);

			// Verify recommended duration is reasonable
			expect(body.todaysFocus.recommendedDuration).toBeGreaterThan(0);
		});

		it("should include active playlist information", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			const body = await res.json();

			// Verify active playlist structure
			expect(body.activePlaylist).toHaveProperty("hasPlaylist");

			if (body.activePlaylist.hasPlaylist) {
				expect(body.activePlaylist).toHaveProperty("playlistId");
				expect(body.activePlaylist).toHaveProperty("title");
				expect(body.activePlaylist).toHaveProperty("scenariosCount");
				expect(body.activePlaylist.scenariosCount).toBeGreaterThan(0);
			}
		});

		it("should include latest report information", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			const body = await res.json();

			// Verify latest report structure
			expect(body.latestReport).toHaveProperty("hasReport");

			if (body.latestReport.hasReport) {
				expect(body.latestReport).toHaveProperty("reportId");
				expect(body.latestReport).toHaveProperty("generatedAt");
				expect(body.latestReport).toHaveProperty("performanceRating");
			}
		});
	});

	describe("New User Context Detection", () => {
		it("should detect new user with no score data", async () => {
			// Create app with empty score data
			const newUserApp = new Hono<{ Variables: Variables }>();

			const mockDbNoScores = {
				query: {
					kovaaksScoresTable: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					playlistsTable: {
						findFirst: vi.fn().mockResolvedValue(null),
					},
					dailyReportsTable: {
						findFirst: vi.fn().mockResolvedValue(null),
					},
				},
			} as unknown as DrizzleD1Database<any>;

			newUserApp.use("*", async (c, next) => {
				c.set("user", mockUser);
				c.set("db", mockDbNoScores);
				await next();
			});

			newUserApp.route("/", coachingApp);

			const res = await newUserApp.request("/status?userId=test-user-123", {
				method: "GET",
			});

			const body = await res.json();

			expect(body.userContext.contextType).toBe("new_user");
		});
	});

	describe("Returning User Context Detection", () => {
		it("should detect returning user (7+ days inactive)", async () => {
			const returningUserApp = new Hono<{ Variables: Variables }>();

			const eightDaysAgo = Math.floor(
				(Date.now() - 8 * 24 * 60 * 60 * 1000) / 1000,
			);

			const mockDbOldScores = {
				query: {
					kovaaksScoresTable: {
						findMany: vi.fn().mockImplementation(({ limit }) => {
							if (limit === 1) {
								return Promise.resolve([
									{
										id: 1,
										userId: "test-user-123",
										scenarioName: "Tile Frenzy",
										runEpochSec: eightDaysAgo,
										accuracy: 0.85,
										score: 1000,
									},
								]);
							}
							return Promise.resolve([]);
						}),
					},
					playlistsTable: {
						findFirst: vi.fn().mockResolvedValue(null),
					},
					dailyReportsTable: {
						findFirst: vi.fn().mockResolvedValue(null),
					},
				},
			} as unknown as DrizzleD1Database<any>;

			returningUserApp.use("*", async (c, next) => {
				c.set("user", mockUser);
				c.set("db", mockDbOldScores);
				await next();
			});

			returningUserApp.route("/", coachingApp);

			const res = await returningUserApp.request(
				"/status?userId=test-user-123",
				{
					method: "GET",
				},
			);

			const body = await res.json();

			expect(body.userContext.contextType).toBe("returning_user");
		});
	});

	describe("Error Handling", () => {
		it("should return 400 if userId query parameter is missing", async () => {
			const res = await app.request("/status", {
				method: "GET",
			});

			expect(res.status).toBe(400);

			const body = await res.json();
			expect(body).toHaveProperty("error");
		});

		it("should handle database errors gracefully", async () => {
			const errorApp = new Hono<{ Variables: Variables }>();

			const mockDbError = {
				query: {
					kovaaksScoresTable: {
						findMany: vi.fn().mockRejectedValue(new Error("Database error")),
					},
				},
			} as unknown as DrizzleD1Database<any>;

			errorApp.use("*", async (c, next) => {
				c.set("user", mockUser);
				c.set("db", mockDbError);
				await next();
			});

			errorApp.route("/", coachingApp);

			const res = await errorApp.request("/status?userId=test-user-123", {
				method: "GET",
			});

			expect(res.status).toBe(500);

			const body = await res.json();
			expect(body).toHaveProperty("error");
		});
	});

	describe("Complete Status Aggregation Flow", () => {
		it("should aggregate all data sources: scores → context → trends → playlist → report", async () => {
			const res = await app.request("/status?userId=test-user-123", {
				method: "GET",
			});

			expect(res.status).toBe(200);

			const body = await res.json();

			// Verify all data aggregation occurred
			expect(body.userId).toBeDefined();
			expect(body.userContext).toBeDefined();
			expect(body.recentTrends).toBeDefined();
			expect(body.todaysFocus).toBeDefined();
			expect(body.activePlaylist).toBeDefined();
			expect(body.latestReport).toBeDefined();

			// Verify data relationships
			// Today's focus should be based on recent trends
			if (body.recentTrends.challengingSkills.length > 0) {
				expect(body.todaysFocus.focusSkills).toBeDefined();
			}

			// Active playlist should indicate user engagement
			if (body.activePlaylist.hasPlaylist) {
				expect(body.activePlaylist.scenariosCount).toBeGreaterThan(0);
			}

			// Latest report should reflect recent activity
			if (body.latestReport.hasReport) {
				expect(body.latestReport.performanceRating).toBeDefined();
			}
		});
	});
});
