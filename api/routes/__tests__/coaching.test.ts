/**
 * Task API Endpoints Tests
 * Task 10: Task API エンドポイントの実装
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

// Mock TaskGraphService result
const mockTaskResult = {
	taskResult: {
		type: "report",
		data: {
			userId: "test-user-123",
			date: new Date(),
			sessionsCount: 3,
			totalDuration: 45,
			performanceRating: "good" as const,
			achievements: ["Personal Best"],
			challenges: ["Consistency"],
			tomorrowRecommendations: {
				focusSkills: ["tracking", "flick"],
				recommendedScenarios: ["Tile Frenzy"],
				recommendedDuration: 30,
			},
		},
		content: "レポートが完了しました",
	},
	metadata: {
		executedAt: new Date(),
		taskType: "daily_report",
		status: "success" as const,
	},
};

// Mock LangGraph
const mockLangGraph = {
	chatGraphService: {},
	taskGraphService: {
		invoke: vi.fn().mockResolvedValue(mockTaskResult),
	},
};

describe("Task 10: Task API Endpoints", () => {
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

	describe("Task 10.1: POST /report - Daily Report", () => {
		it("should generate daily report successfully", async () => {
			const res = await app.request("/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: "test-user-123",
				}),
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body).toHaveProperty("taskResult");
			expect(body).toHaveProperty("metadata");
			expect(body.metadata.taskType).toBe("daily_report");
			expect(body.metadata.status).toBe("success");
		});

		it("should validate userId in request body", async () => {
			const res = await app.request("/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});

		it("should handle task execution failure", async () => {
			mockLangGraph.taskGraphService.invoke = vi.fn().mockResolvedValue({
				taskResult: null,
				metadata: {
					executedAt: new Date(),
					taskType: "daily_report",
					status: "failure",
					errorMessage: "Database error",
				},
			});

			const res = await app.request("/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: "test-user-123",
				}),
			});

			expect(res.status).toBe(500);
			const body = await res.json();
			expect(body).toHaveProperty("error");
		});
	});

	describe("Task 10.2: POST /analysis - Score Analysis", () => {
		it("should perform score analysis successfully", async () => {
			mockLangGraph.taskGraphService.invoke = vi.fn().mockResolvedValue({
				taskResult: {
					type: "analysis",
					data: {
						overallTrend: "improving",
						strengths: ["tracking"],
						weaknesses: ["flick"],
					},
					content: "分析が完了しました",
				},
				metadata: {
					executedAt: new Date(),
					taskType: "score_analysis",
					status: "success",
				},
			});

			const res = await app.request("/analysis", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: "test-user-123",
				}),
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body).toHaveProperty("taskResult");
			expect(body).toHaveProperty("metadata");
			expect(body.metadata.taskType).toBe("score_analysis");
		});

		it("should validate userId in request body", async () => {
			const res = await app.request("/analysis", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("Task 10.3: POST /playlist - Playlist Building", () => {
		it("should build playlist successfully", async () => {
			mockLangGraph.taskGraphService.invoke = vi.fn().mockResolvedValue({
				taskResult: {
					type: "playlist",
					data: {
						title: "Training Playlist",
						scenarios: [
							{
								scenarioName: "Tile Frenzy",
								platform: "kovaaks" as const,
								purpose: "Tracking",
								expectedEffect: "Better accuracy",
								duration: 10,
								order: 1,
								difficultyLevel: "intermediate" as const,
							},
						],
						targetWeaknesses: ["tracking"],
						totalDuration: 30,
					},
					content: "プレイリストが作成されました",
				},
				metadata: {
					executedAt: new Date(),
					taskType: "playlist_building",
					status: "success",
				},
			});

			const res = await app.request("/playlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: "test-user-123",
				}),
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body).toHaveProperty("taskResult");
			expect(body.metadata.taskType).toBe("playlist_building");
		});

		it("should validate userId in request body", async () => {
			const res = await app.request("/playlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("Task 10.4: POST /review - Progress Review", () => {
		it("should generate progress review successfully", async () => {
			mockLangGraph.taskGraphService.invoke = vi.fn().mockResolvedValue({
				taskResult: {
					type: "review",
					data: {
						userId: "test-user-123",
						reviewPeriod: "last_7_days",
						daysInactive: 2,
						progressSummary: "Good progress",
						achievements: ["Improved accuracy"],
						areasForImprovement: ["Speed"],
						nextGoals: ["Practice daily"],
						reviewDate: new Date(),
					},
					content: "レビューが完了しました",
				},
				metadata: {
					executedAt: new Date(),
					taskType: "progress_review",
					status: "success",
				},
			});

			const res = await app.request("/review", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: "test-user-123",
				}),
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body).toHaveProperty("taskResult");
			expect(body.metadata.taskType).toBe("progress_review");
		});

		it("should validate userId in request body", async () => {
			const res = await app.request("/review", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("Error Handling", () => {
		it("should handle errors gracefully for all endpoints", async () => {
			mockLangGraph.taskGraphService.invoke = vi
				.fn()
				.mockRejectedValue(new Error("Service unavailable"));

			const endpoints = ["/report", "/analysis", "/playlist", "/review"];

			for (const endpoint of endpoints) {
				const res = await app.request(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						userId: "test-user-123",
					}),
				});

				expect(res.status).toBe(500);
				const body = await res.json();
				expect(body).toHaveProperty("error");
			}
		});
	});
});
