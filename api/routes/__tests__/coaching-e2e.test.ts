/**
 * Task Mode E2E Tests
 * Task 14.2: Task Mode E2E テストを実装
 */

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

// Mock Task Graph Service
const mockTaskGraphService = {
	invoke: vi.fn().mockImplementation(async ({ userId, taskType }) => {
		// Simulate successful task execution
		const mockResults = {
			playlist_building: {
				taskResult: {
					type: "playlist",
					data: {
						title: "Training Playlist",
						scenarios: [
							{
								scenarioName: "Tile Frenzy",
								platform: "kovaaks",
								duration: 10,
								purpose: "tracking improvement",
							},
						],
						targetWeaknesses: ["tracking"],
						totalDuration: 10,
					},
				},
				metadata: {
					executedAt: new Date(),
					taskType: "playlist_building",
					status: "success",
				},
			},
			score_analysis: {
				taskResult: {
					type: "analysis",
					data: {
						overallPerformance: "improving",
						strengths: ["tracking"],
						weaknesses: ["flicking"],
						recommendations: ["Practice more flick scenarios"],
					},
				},
				metadata: {
					executedAt: new Date(),
					taskType: "score_analysis",
					status: "success",
				},
			},
			daily_report: {
				taskResult: {
					type: "report",
					data: {
						date: new Date().toISOString().split("T")[0],
						performanceRating: "good",
						achievements: ["Improved tracking accuracy"],
						challenges: ["Consistency in flick scenarios"],
						recommendations: ["Focus on 1wall scenarios"],
					},
				},
				metadata: {
					executedAt: new Date(),
					taskType: "daily_report",
					status: "success",
				},
			},
			progress_review: {
				taskResult: {
					type: "review",
					data: {
						period: "7 days",
						overallProgress: "positive",
						improvementAreas: ["tracking", "precision"],
						focusAreas: ["speed", "consistency"],
					},
				},
				metadata: {
					executedAt: new Date(),
					taskType: "progress_review",
					status: "success",
				},
			},
		};

		return mockResults[taskType as keyof typeof mockResults];
	}),
};

// Mock LangGraph with Task Graph Service
const mockLangGraph = {
	taskGraphService: mockTaskGraphService,
};

describe("Task 14.2: Task Mode E2E Tests", () => {
	let app: Hono<{ Variables: Variables }>;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create test app with middleware
		app = new Hono<{ Variables: Variables }>();

		// Setup mock middleware
		app.use("*", async (c, next) => {
			c.set("user", mockUser);
			c.set("langGraph", mockLangGraph as any);
			await next();
		});

		// Mount coaching routes
		app.route("/", coachingApp);
	});

	describe("Playlist Building → Task Graph → Result Return", () => {
		it("should generate playlist successfully", async () => {
			const res = await app.request("/playlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: mockUser.id,
				}),
			});

			expect(res.status).toBe(200);

			const body = await res.json();

			// Verify response structure
			expect(body).toHaveProperty("taskResult");
			expect(body).toHaveProperty("metadata");

			// Verify task result
			expect(body.taskResult.type).toBe("playlist");
			expect(body.taskResult.data).toHaveProperty("title");
			expect(body.taskResult.data).toHaveProperty("scenarios");
			expect(Array.isArray(body.taskResult.data.scenarios)).toBe(true);

			// Verify metadata
			expect(body.metadata.status).toBe("success");
			expect(body.metadata.taskType).toBe("playlist_building");

			// Verify Task Graph was called correctly
			expect(mockTaskGraphService.invoke).toHaveBeenCalledWith({
				userId: mockUser.id,
				taskType: "playlist_building",
			});
		});

		it("should include required playlist fields", async () => {
			const res = await app.request("/playlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: mockUser.id,
				}),
			});

			const body = await res.json();
			const playlist = body.taskResult.data;

			expect(playlist).toHaveProperty("title");
			expect(playlist).toHaveProperty("scenarios");
			expect(playlist).toHaveProperty("targetWeaknesses");
			expect(playlist).toHaveProperty("totalDuration");

			// Verify scenario structure
			if (playlist.scenarios.length > 0) {
				const scenario = playlist.scenarios[0];
				expect(scenario).toHaveProperty("scenarioName");
				expect(scenario).toHaveProperty("platform");
				expect(scenario).toHaveProperty("duration");
				expect(scenario).toHaveProperty("purpose");
			}
		});
	});

	describe("Score Analysis → Task Graph → Result Return", () => {
		it("should analyze scores successfully", async () => {
			const res = await app.request("/analysis", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: mockUser.id,
				}),
			});

			expect(res.status).toBe(200);

			const body = await res.json();

			expect(body).toHaveProperty("taskResult");
			expect(body).toHaveProperty("metadata");

			// Verify analysis result
			expect(body.taskResult.type).toBe("analysis");
			expect(body.taskResult.data).toHaveProperty("overallPerformance");
			expect(body.taskResult.data).toHaveProperty("strengths");
			expect(body.taskResult.data).toHaveProperty("weaknesses");
			expect(body.taskResult.data).toHaveProperty("recommendations");

			// Verify metadata
			expect(body.metadata.status).toBe("success");
			expect(body.metadata.taskType).toBe("score_analysis");

			// Verify Task Graph was called correctly
			expect(mockTaskGraphService.invoke).toHaveBeenCalledWith({
				userId: mockUser.id,
				taskType: "score_analysis",
			});
		});
	});

	describe("Daily Report → Task Graph → Result Return", () => {
		it("should generate daily report successfully", async () => {
			const res = await app.request("/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: mockUser.id,
				}),
			});

			expect(res.status).toBe(200);

			const body = await res.json();

			expect(body).toHaveProperty("taskResult");
			expect(body).toHaveProperty("metadata");

			// Verify report result
			expect(body.taskResult.type).toBe("report");
			expect(body.taskResult.data).toHaveProperty("date");
			expect(body.taskResult.data).toHaveProperty("performanceRating");
			expect(body.taskResult.data).toHaveProperty("achievements");
			expect(body.taskResult.data).toHaveProperty("challenges");
			expect(body.taskResult.data).toHaveProperty("recommendations");

			// Verify metadata
			expect(body.metadata.status).toBe("success");
			expect(body.metadata.taskType).toBe("daily_report");

			// Verify Task Graph was called correctly
			expect(mockTaskGraphService.invoke).toHaveBeenCalledWith({
				userId: mockUser.id,
				taskType: "daily_report",
			});
		});
	});

	describe("Progress Review → Task Graph → Result Return", () => {
		it("should generate progress review successfully", async () => {
			const res = await app.request("/review", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: mockUser.id,
				}),
			});

			expect(res.status).toBe(200);

			const body = await res.json();

			expect(body).toHaveProperty("taskResult");
			expect(body).toHaveProperty("metadata");

			// Verify review result
			expect(body.taskResult.type).toBe("review");
			expect(body.taskResult.data).toHaveProperty("period");
			expect(body.taskResult.data).toHaveProperty("overallProgress");
			expect(body.taskResult.data).toHaveProperty("improvementAreas");
			expect(body.taskResult.data).toHaveProperty("focusAreas");

			// Verify metadata
			expect(body.metadata.status).toBe("success");
			expect(body.metadata.taskType).toBe("progress_review");

			// Verify Task Graph was called correctly
			expect(mockTaskGraphService.invoke).toHaveBeenCalledWith({
				userId: mockUser.id,
				taskType: "progress_review",
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle Task Graph execution failure", async () => {
			mockTaskGraphService.invoke.mockResolvedValueOnce({
				taskResult: null,
				metadata: {
					executedAt: new Date(),
					taskType: "playlist_building",
					status: "failure",
					errorMessage: "Task execution failed",
				},
			});

			const res = await app.request("/playlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: mockUser.id,
				}),
			});

			expect(res.status).toBe(500);

			const body = await res.json();
			expect(body).toHaveProperty("error");
			expect(body).toHaveProperty("message");
			expect(body.error).toBe("Task execution failed");
		});

		it("should handle Task Graph exception", async () => {
			mockTaskGraphService.invoke.mockRejectedValueOnce(
				new Error("Task Graph error"),
			);

			const res = await app.request("/analysis", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: mockUser.id,
				}),
			});

			expect(res.status).toBe(500);

			const body = await res.json();
			expect(body).toHaveProperty("error");
			expect(body.message).toContain("Task Graph error");
		});

		it("should validate required userId field", async () => {
			const res = await app.request("/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("Complete Task Mode Flow", () => {
		it("should complete full task workflow: playlist → analysis → report → review", async () => {
			// Step 1: Generate playlist
			const playlistRes = await app.request("/playlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: mockUser.id,
				}),
			});

			expect(playlistRes.status).toBe(200);
			const playlistBody = await playlistRes.json();
			expect(playlistBody.taskResult.type).toBe("playlist");

			// Step 2: Analyze scores
			const analysisRes = await app.request("/analysis", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: mockUser.id,
				}),
			});

			expect(analysisRes.status).toBe(200);
			const analysisBody = await analysisRes.json();
			expect(analysisBody.taskResult.type).toBe("analysis");

			// Step 3: Generate daily report
			const reportRes = await app.request("/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: mockUser.id,
				}),
			});

			expect(reportRes.status).toBe(200);
			const reportBody = await reportRes.json();
			expect(reportBody.taskResult.type).toBe("report");

			// Step 4: Generate progress review
			const reviewRes = await app.request("/review", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: mockUser.id,
				}),
			});

			expect(reviewRes.status).toBe(200);
			const reviewBody = await reviewRes.json();
			expect(reviewBody.taskResult.type).toBe("review");

			// Verify all Task Graph invocations occurred
			expect(mockTaskGraphService.invoke).toHaveBeenCalledTimes(4);
		});
	});
});
