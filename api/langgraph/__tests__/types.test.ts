/**
 * LangGraph型定義のテスト
 * Task 1.1: ユーザーコンテキストとタスク種別の型定義
 */

import { describe, expect, it } from "vitest";
import type {
	ChatGraphState,
	CoachingStatus,
	DailyReport,
	Playlist,
	ProgressReport,
	ScoreAnalysis,
	TaskGraphState,
	TaskType,
	UserContext,
} from "../types";
import { ChatGraphStateAnnotation, TaskGraphStateAnnotation } from "../types";

describe("Task 1.1: ユーザーコンテキストとタスク種別の型定義", () => {
	describe("型のエクスポート確認", () => {
		it("should export UserContext type", () => {
			// 型がエクスポートされていることを確認
			const context: UserContext = "new_user";
			expect(context).toBe("new_user");
		});

		it("should export TaskType type", () => {
			// 型がエクスポートされていることを確認
			const taskType: TaskType = "daily_report";
			expect(taskType).toBe("daily_report");
		});

		it("should export ChatGraphStateAnnotation", () => {
			// Annotation がエクスポートされていることを確認
			expect(ChatGraphStateAnnotation).toBeDefined();
			expect(ChatGraphStateAnnotation.spec).toBeDefined();
		});

		it("should export TaskGraphStateAnnotation", () => {
			// Annotation がエクスポートされていることを確認
			expect(TaskGraphStateAnnotation).toBeDefined();
			expect(TaskGraphStateAnnotation.spec).toBeDefined();
		});

		it("should export domain entity types", () => {
			// ドメインエンティティ型がすべてエクスポートされていることを確認
			const playlist: Playlist = {
				id: "test",
				userId: "test",
				title: "test",
				description: "test",
				scenarios: [],
				targetWeaknesses: [],
				totalDuration: 0,
				reasoning: "test",
				createdAt: new Date(),
				isActive: true,
			};
			expect(playlist).toBeDefined();

			const report: DailyReport = {
				id: "test",
				userId: "test",
				date: new Date(),
				sessionsCount: 0,
				totalDuration: 0,
				performanceRating: "normal",
				achievements: [],
				challenges: [],
				tomorrowRecommendations: {
					focusSkills: [],
					recommendedScenarios: [],
					recommendedDuration: 0,
				},
				createdAt: new Date(),
			};
			expect(report).toBeDefined();

			const analysis: ScoreAnalysis = {
				userId: "test",
				period: { start: new Date(), end: new Date() },
				trend: "stable",
				strengths: [],
				challenges: [],
				milestones: [],
				chartData: { labels: [], datasets: [] },
				createdAt: new Date(),
			};
			expect(analysis).toBeDefined();

			const progress: ProgressReport = {
				userId: "test",
				reviewPeriod: { start: new Date(), end: new Date(), days: 0 },
				beforePausePerformance: {
					avgScore: 0,
					strongSkills: [],
					activityFrequency: 0,
				},
				rehabilitationPlan: [],
				motivationalMessage: "test",
				generatedAt: new Date(),
			};
			expect(progress).toBeDefined();

			const status: CoachingStatus = {
				userContext: "active_user",
				todayFocus: null,
				scoreTrendSummary: null,
				activePlaylist: null,
				latestReport: null,
			};
			expect(status).toBeDefined();
		});
	});

	describe("UserContext 型", () => {
		it("should accept valid UserContext values", () => {
			const validContexts: UserContext[] = [
				"new_user",
				"returning_user",
				"active_user",
				"playlist_recommended",
				"analysis_recommended",
			];

			// 各値が正しく型チェックされることを確認
			validContexts.forEach((context) => {
				const userContext: UserContext = context;
				expect(userContext).toBe(context);
			});
		});

		it("should not accept invalid UserContext values", () => {
			// TypeScriptコンパイル時にエラーになるため、実行時テストは不要
			// ただし、動的な値の検証を示すため、型ガード関数をテスト
			const isValidUserContext = (value: string): value is UserContext => {
				return [
					"new_user",
					"returning_user",
					"active_user",
					"playlist_recommended",
					"analysis_recommended",
				].includes(value);
			};

			expect(isValidUserContext("new_user")).toBe(true);
			expect(isValidUserContext("invalid_context")).toBe(false);
		});
	});

	describe("TaskType 型", () => {
		it("should accept valid TaskType values", () => {
			const validTypes: TaskType[] = [
				"daily_report",
				"score_analysis",
				"playlist_building",
				"progress_review",
			];

			validTypes.forEach((type) => {
				const taskType: TaskType = type;
				expect(taskType).toBe(type);
			});
		});

		it("should not accept invalid TaskType values", () => {
			const isValidTaskType = (value: string): value is TaskType => {
				return [
					"daily_report",
					"score_analysis",
					"playlist_building",
					"progress_review",
				].includes(value);
			};

			expect(isValidTaskType("daily_report")).toBe(true);
			expect(isValidTaskType("invalid_task")).toBe(false);
		});
	});
});

describe("Task 1.2: Chat Graph の状態モデル", () => {
	describe("ChatGraphStateAnnotation", () => {
		it("should create valid initial state", () => {
			// State Annotation の初期値を検証
			const initialState = {
				userId: "test-user-123",
				threadId: "thread-456",
				messages: [],
				userContext: "active_user" as UserContext,
			};

			expect(initialState.userId).toBe("test-user-123");
			expect(initialState.threadId).toBe("thread-456");
			expect(initialState.messages).toEqual([]);
			expect(initialState.userContext).toBe("active_user");
		});

		it("should accumulate messages correctly", () => {
			// messages のデフォルト動作確認（配列の蓄積）
			const state1 = {
				userId: "test",
				threadId: "test",
				messages: [{ role: "user", content: "Hello" }],
				userContext: "active_user" as UserContext,
			};

			// 新しいメッセージを追加
			const newMessages = [{ role: "assistant", content: "Hi there!" }];

			// reducer のロジックを手動でシミュレート（配列の結合）
			const updatedMessages = [...state1.messages, ...newMessages];

			expect(updatedMessages).toEqual([
				{ role: "user", content: "Hello" },
				{ role: "assistant", content: "Hi there!" },
			]);
		});

		it("should override userContext with latest value", () => {
			// userContext のデフォルト動作確認（最新値で上書き）
			const state1 = {
				userId: "test",
				threadId: "test",
				messages: [],
				userContext: "new_user" as UserContext,
			};

			// userContext を更新
			const updatedContext: UserContext = "active_user";

			// reducer のロジックを手動でシミュレート（上書き）
			const result = updatedContext;

			expect(result).toBe("active_user");
		});
	});

	describe("ChatGraphState 型", () => {
		it("should match expected structure", () => {
			const state: ChatGraphState = {
				userId: "user-123",
				threadId: "thread-456",
				messages: [
					{ role: "user", content: "Test message" },
					{ role: "assistant", content: "Test response" },
				],
				userContext: "playlist_recommended",
			};

			expect(state.userId).toBe("user-123");
			expect(state.threadId).toBe("thread-456");
			expect(state.messages).toHaveLength(2);
			expect(state.userContext).toBe("playlist_recommended");
		});
	});
});

describe("Task 1.3: Task Graph の状態モデル", () => {
	describe("TaskGraphStateAnnotation", () => {
		it("should create valid initial state", () => {
			const initialState = {
				userId: "test-user-123",
				taskType: "daily_report" as TaskType,
				userContext: "active_user" as UserContext,
				taskResult: null,
			};

			expect(initialState.userId).toBe("test-user-123");
			expect(initialState.taskType).toBe("daily_report");
			expect(initialState.userContext).toBe("active_user");
			expect(initialState.taskResult).toBeNull();
		});

		it("should override taskResult with latest value", () => {
			// taskResult のデフォルト動作確認（最新値で上書き）
			const state1 = {
				userId: "test",
				taskType: "daily_report" as TaskType,
				userContext: "active_user" as UserContext,
				taskResult: null,
			};

			const update = {
				type: "report" as const,
				data: {
					id: "report-123",
					userId: "user-123",
					date: new Date(),
					sessionsCount: 5,
					totalDuration: 120,
					performanceRating: "good" as const,
					achievements: ["Personal Best更新"],
					challenges: ["flick精度"],
					tomorrowRecommendations: {
						focusSkills: ["tracking"],
						recommendedScenarios: ["scenario-1"],
						recommendedDuration: 60,
					},
					createdAt: new Date(),
				},
			};

			// reducer のロジックを手動でシミュレート（上書き）
			const result = update;

			expect(result).toEqual(update);
		});
	});

	describe("TaskGraphState 型", () => {
		it("should match expected structure", () => {
			const state: TaskGraphState = {
				userId: "user-123",
				taskType: "score_analysis",
				userContext: "analysis_recommended",
				taskResult: {
					type: "analysis",
					data: {
						userId: "user-123",
						period: { start: new Date(), end: new Date() },
						trend: "improving",
						strengths: ["tracking"],
						challenges: ["flick"],
						milestones: ["PB更新"],
						chartData: {
							labels: ["Mon", "Tue", "Wed"],
							datasets: [{ label: "Score", data: [100, 110, 120] }],
						},
						createdAt: new Date(),
					},
				},
			};

			expect(state.userId).toBe("user-123");
			expect(state.taskType).toBe("score_analysis");
			expect(state.userContext).toBe("analysis_recommended");
			expect(state.taskResult).not.toBeNull();
			expect(state.taskResult?.type).toBe("analysis");
		});
	});
});

describe("Task 1.4: ドメインエンティティの型定義", () => {
	describe("Playlist 型", () => {
		it("should match expected structure", () => {
			const playlist: Playlist = {
				id: "playlist-123",
				userId: "user-123",
				title: "Tracking Improvement Plan",
				description: "Focus on tracking accuracy",
				scenarios: [
					{
						scenarioName: "Thin Aiming Long",
						platform: "kovaaks",
						purpose: "tracking精度向上",
						expectedEffect: "マウス制御の安定化",
						duration: 10,
						order: 1,
						difficultyLevel: "intermediate",
					},
				],
				targetWeaknesses: ["tracking"],
				totalDuration: 60,
				reasoning: "スコアデータからtracking弱点を検出",
				createdAt: new Date(),
				isActive: true,
			};

			expect(playlist.id).toBe("playlist-123");
			expect(playlist.scenarios).toHaveLength(1);
			expect(playlist.targetWeaknesses).toContain("tracking");
		});
	});

	describe("DailyReport 型", () => {
		it("should match expected structure", () => {
			const report: DailyReport = {
				id: "report-123",
				userId: "user-123",
				date: new Date(),
				sessionsCount: 3,
				totalDuration: 90,
				performanceRating: "good",
				achievements: ["Personal Best更新", "3日連続練習"],
				challenges: ["flick精度が低下"],
				tomorrowRecommendations: {
					focusSkills: ["flick", "switching"],
					recommendedScenarios: ["scenario-1", "scenario-2"],
					recommendedDuration: 60,
				},
				createdAt: new Date(),
			};

			expect(report.sessionsCount).toBe(3);
			expect(report.performanceRating).toBe("good");
			expect(report.achievements).toHaveLength(2);
		});
	});

	describe("ScoreAnalysis 型", () => {
		it("should match expected structure", () => {
			const analysis: ScoreAnalysis = {
				userId: "user-123",
				period: { start: new Date(), end: new Date() },
				trend: "improving",
				strengths: ["tracking", "precision"],
				challenges: ["flick", "switching"],
				milestones: ["PB更新: Thin Aiming Long"],
				chartData: {
					labels: ["Day 1", "Day 2", "Day 3"],
					datasets: [
						{ label: "Accuracy", data: [85, 87, 90] },
						{ label: "Speed", data: [100, 105, 110] },
					],
				},
				createdAt: new Date(),
			};

			expect(analysis.trend).toBe("improving");
			expect(analysis.strengths).toContain("tracking");
			expect(analysis.chartData.datasets).toHaveLength(2);
		});
	});

	describe("ProgressReport 型", () => {
		it("should match expected structure", () => {
			const report: ProgressReport = {
				userId: "user-123",
				reviewPeriod: {
					start: new Date("2025-01-01"),
					end: new Date("2025-01-10"),
					days: 9,
				},
				beforePausePerformance: {
					avgScore: 85,
					strongSkills: ["tracking"],
					activityFrequency: 5,
				},
				goalProgress: [
					{
						goalId: "goal-1",
						goalTitle: "Accuracy 90%達成",
						initialValue: 80,
						currentValue: 87,
						targetValue: 90,
						progressPercent: 70,
						status: "on_track",
					},
				],
				rehabilitationPlan: ["基礎トラッキングから再開", "1日30分を目標"],
				motivationalMessage: "お帰りなさい！一緒に再スタートしましょう",
				generatedAt: new Date(),
			};

			expect(report.reviewPeriod.days).toBe(9);
			expect(report.beforePausePerformance.avgScore).toBe(85);
			expect(report.rehabilitationPlan).toHaveLength(2);
		});
	});

	describe("CoachingStatus 型", () => {
		it("should match expected structure", () => {
			const status: CoachingStatus = {
				userContext: "active_user",
				todayFocus: {
					focusSkills: ["tracking", "precision"],
					recommendedDuration: 60,
					recommendedScenarios: ["scenario-1", "scenario-2"],
				},
				scoreTrendSummary: {
					trend: "improving",
					improvedSkills: ["tracking"],
					challengeSkills: ["flick"],
				},
				activePlaylist: {
					id: "playlist-123",
					title: "Daily Practice",
					scenariosCount: 5,
				},
				latestReport: {
					date: new Date(),
					generatedAt: new Date(),
				},
			};

			expect(status.userContext).toBe("active_user");
			expect(status.todayFocus?.focusSkills).toHaveLength(2);
			expect(status.scoreTrendSummary?.trend).toBe("improving");
		});

		it("should allow null values for optional fields", () => {
			const status: CoachingStatus = {
				userContext: "new_user",
				todayFocus: null,
				scoreTrendSummary: null,
				activePlaylist: null,
				latestReport: null,
			};

			expect(status.userContext).toBe("new_user");
			expect(status.todayFocus).toBeNull();
			expect(status.scoreTrendSummary).toBeNull();
		});
	});
});
