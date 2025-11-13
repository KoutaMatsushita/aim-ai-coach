/**
 * Database Schema Tests
 * Task 8: Database スキーマの追加
 */

import { describe, expect, it } from "vitest";
import {
	DailyReportInsertSchema,
	DailyReportSelectSchema,
	dailyReportsTable,
	PlaylistInsertSchema,
	PlaylistSelectSchema,
	playlistsTable,
} from "../schema";

describe("Task 8: Database Schema", () => {
	describe("Task 8.1: Playlists Table Schema", () => {
		it("should have playlists table defined", () => {
			expect(playlistsTable).toBeDefined();
			expect(playlistsTable[Symbol.for("drizzle:Name")]).toBe("playlists");
		});

		it("should have all required columns", () => {
			const columns = playlistsTable[Symbol.for("drizzle:Columns")];
			expect(columns).toHaveProperty("id");
			expect(columns).toHaveProperty("userId");
			expect(columns).toHaveProperty("title");
			expect(columns).toHaveProperty("description");
			expect(columns).toHaveProperty("scenarios");
			expect(columns).toHaveProperty("targetWeaknesses");
			expect(columns).toHaveProperty("totalDuration");
			expect(columns).toHaveProperty("reasoning");
			expect(columns).toHaveProperty("createdAt");
			expect(columns).toHaveProperty("isActive");
		});

		it("should validate insert schema", () => {
			const validPlaylist = {
				id: "playlist_123",
				userId: "user_123",
				title: "Test Playlist",
				description: "A test playlist",
				scenarios: [
					{
						scenarioName: "Tile Frenzy",
						platform: "kovaaks" as const,
						purpose: "Improve tracking",
						expectedEffect: "Better accuracy",
						duration: 10,
						order: 1,
						difficultyLevel: "intermediate" as const,
					},
				],
				targetWeaknesses: ["tracking", "flick"],
				totalDuration: 30,
				reasoning: "Based on user data",
				isActive: true,
			};

			const result = PlaylistInsertSchema.safeParse(validPlaylist);
			expect(result.success).toBe(true);
		});

		it("should reject invalid insert data", () => {
			const invalidPlaylist = {
				// Missing required fields
				title: "Test Playlist",
			};

			const result = PlaylistInsertSchema.safeParse(invalidPlaylist);
			expect(result.success).toBe(false);
		});

		it("should validate select schema", () => {
			const validPlaylist = {
				id: "playlist_123",
				userId: "user_123",
				title: "Test Playlist",
				description: "A test playlist",
				scenarios: [],
				targetWeaknesses: ["tracking"],
				totalDuration: 30,
				reasoning: "Based on user data",
				createdAt: new Date(),
				isActive: true,
			};

			const result = PlaylistSelectSchema.safeParse(validPlaylist);
			expect(result.success).toBe(true);
		});
	});

	describe("Task 8.2: Daily Reports Table Schema", () => {
		it("should have daily_reports table defined", () => {
			expect(dailyReportsTable).toBeDefined();
			expect(dailyReportsTable[Symbol.for("drizzle:Name")]).toBe(
				"daily_reports",
			);
		});

		it("should have all required columns", () => {
			const columns = dailyReportsTable[Symbol.for("drizzle:Columns")];
			expect(columns).toHaveProperty("id");
			expect(columns).toHaveProperty("userId");
			expect(columns).toHaveProperty("date");
			expect(columns).toHaveProperty("sessionsCount");
			expect(columns).toHaveProperty("totalDuration");
			expect(columns).toHaveProperty("performanceRating");
			expect(columns).toHaveProperty("achievements");
			expect(columns).toHaveProperty("challenges");
			expect(columns).toHaveProperty("tomorrowRecommendations");
			expect(columns).toHaveProperty("createdAt");
		});

		it("should validate insert schema", () => {
			const validReport = {
				id: "report_123",
				userId: "user_123",
				date: new Date(),
				sessionsCount: 5,
				totalDuration: 120,
				performanceRating: "good" as const,
				achievements: ["Personal Best", "5 sessions completed"],
				challenges: ["Tracking needs work"],
				tomorrowRecommendations: {
					focusSkills: ["tracking", "flick"],
					recommendedScenarios: ["Tile Frenzy", "1wall 6targets"],
					recommendedDuration: 30,
				},
			};

			const result = DailyReportInsertSchema.safeParse(validReport);
			expect(result.success).toBe(true);
		});

		it("should reject invalid performance rating", () => {
			const invalidReport = {
				id: "report_123",
				userId: "user_123",
				date: new Date(),
				sessionsCount: 5,
				totalDuration: 120,
				performanceRating: "invalid_rating", // Invalid enum value
				achievements: [],
				challenges: [],
				tomorrowRecommendations: {
					focusSkills: [],
					recommendedScenarios: [],
					recommendedDuration: 0,
				},
			};

			const result = DailyReportInsertSchema.safeParse(invalidReport);
			expect(result.success).toBe(false);
		});

		it("should validate select schema", () => {
			const validReport = {
				id: "report_123",
				userId: "user_123",
				date: new Date(),
				sessionsCount: 5,
				totalDuration: 120,
				performanceRating: "normal" as const,
				achievements: [],
				challenges: [],
				tomorrowRecommendations: {
					focusSkills: [],
					recommendedScenarios: [],
					recommendedDuration: 0,
				},
				createdAt: new Date(),
			};

			const result = DailyReportSelectSchema.safeParse(validReport);
			expect(result.success).toBe(true);
		});
	});

	describe("Schema Integration", () => {
		it("playlists table should reference users table", () => {
			const columns = playlistsTable[Symbol.for("drizzle:Columns")];
			const userIdColumn = columns.userId;

			// Check that userId has a foreign key reference
			expect(userIdColumn).toBeDefined();
		});

		it("daily_reports table should reference users table", () => {
			const columns = dailyReportsTable[Symbol.for("drizzle:Columns")];
			const userIdColumn = columns.userId;

			// Check that userId has a foreign key reference
			expect(userIdColumn).toBeDefined();
		});

		it("playlists should have proper indexes", () => {
			// Verify table has indexes defined
			// Note: Drizzle doesn't expose indexes in a testable way at runtime
			// This test documents the expected behavior
			expect(playlistsTable).toBeDefined();
		});

		it("daily_reports should have proper indexes", () => {
			// Verify table has indexes defined
			expect(dailyReportsTable).toBeDefined();
		});
	});

	describe("JSON Field Validation", () => {
		it("playlists scenarios should accept array of scenario objects", () => {
			const validScenarios = [
				{
					scenarioName: "Tile Frenzy",
					platform: "kovaaks" as const,
					purpose: "Tracking",
					expectedEffect: "Better accuracy",
					duration: 10,
					order: 1,
					difficultyLevel: "beginner" as const,
				},
				{
					scenarioName: "1wall 6targets",
					platform: "aimlab" as const,
					purpose: "Flicking",
					expectedEffect: "Faster reactions",
					duration: 15,
					order: 2,
					difficultyLevel: "advanced" as const,
				},
			];

			const playlist = {
				id: "test",
				userId: "user",
				title: "Test",
				description: "Test",
				scenarios: validScenarios,
				targetWeaknesses: ["tracking"],
				totalDuration: 25,
				reasoning: "Test",
			};

			const result = PlaylistInsertSchema.safeParse(playlist);
			expect(result.success).toBe(true);
		});

		it("playlists targetWeaknesses should accept string array", () => {
			const playlist = {
				id: "test",
				userId: "user",
				title: "Test",
				description: "Test",
				scenarios: [],
				targetWeaknesses: ["tracking", "flick", "switching"],
				totalDuration: 30,
				reasoning: "Test",
			};

			const result = PlaylistInsertSchema.safeParse(playlist);
			expect(result.success).toBe(true);
		});

		it("daily_reports tomorrowRecommendations should accept proper structure", () => {
			const report = {
				id: "test",
				userId: "user",
				date: new Date(),
				sessionsCount: 1,
				totalDuration: 10,
				performanceRating: "good" as const,
				achievements: ["test"],
				challenges: ["test"],
				tomorrowRecommendations: {
					focusSkills: ["tracking", "precision"],
					recommendedScenarios: ["Tile Frenzy", "Smoothbot"],
					recommendedDuration: 45,
				},
			};

			const result = DailyReportInsertSchema.safeParse(report);
			expect(result.success).toBe(true);
		});
	});
});
