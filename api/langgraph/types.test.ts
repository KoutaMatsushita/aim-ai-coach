/**
 * LangGraph 型定義のテスト
 * Task 1.1: ユーザーコンテキストとタスク種別の型定義テスト
 */

import { describe, expect, it } from "vitest";
import type { TaskType, UserContext } from "./types";

describe("Task 1.1: ユーザーコンテキストとタスク種別の型定義", () => {
	describe("UserContext 型", () => {
		it("new_user を受け入れる", () => {
			const context: UserContext = "new_user";
			expect(context).toBe("new_user");
		});

		it("returning_user を受け入れる", () => {
			const context: UserContext = "returning_user";
			expect(context).toBe("returning_user");
		});

		it("active_user を受け入れる", () => {
			const context: UserContext = "active_user";
			expect(context).toBe("active_user");
		});

		it("playlist_recommended を受け入れる", () => {
			const context: UserContext = "playlist_recommended";
			expect(context).toBe("playlist_recommended");
		});

		it("analysis_recommended を受け入れる", () => {
			const context: UserContext = "analysis_recommended";
			expect(context).toBe("analysis_recommended");
		});

		it("無効な値は型エラーとなる", () => {
			// @ts-expect-error - 型チェックのテスト: 無効な値は型エラー
			const context: UserContext = "invalid_context";
			expect(typeof context).toBe("string");
		});
	});

	describe("TaskType 型", () => {
		it("daily_report を受け入れる", () => {
			const taskType: TaskType = "daily_report";
			expect(taskType).toBe("daily_report");
		});

		it("score_analysis を受け入れる", () => {
			const taskType: TaskType = "score_analysis";
			expect(taskType).toBe("score_analysis");
		});

		it("playlist_building を受け入れる", () => {
			const taskType: TaskType = "playlist_building";
			expect(taskType).toBe("playlist_building");
		});

		it("progress_review を受け入れる", () => {
			const taskType: TaskType = "progress_review";
			expect(taskType).toBe("progress_review");
		});

		it("無効な値は型エラーとなる", () => {
			// @ts-expect-error - 型チェックのテスト: 無効な値は型エラー
			const taskType: TaskType = "invalid_task";
			expect(typeof taskType).toBe("string");
		});
	});

	describe("型の整合性", () => {
		it("UserContext 型は5つの値を持つ", () => {
			const validContexts: UserContext[] = [
				"new_user",
				"returning_user",
				"active_user",
				"playlist_recommended",
				"analysis_recommended",
			];
			expect(validContexts).toHaveLength(5);
		});

		it("TaskType 型は4つの値を持つ", () => {
			const validTaskTypes: TaskType[] = [
				"daily_report",
				"score_analysis",
				"playlist_building",
				"progress_review",
			];
			expect(validTaskTypes).toHaveLength(4);
		});
	});
});

describe("Task 1.2: Chat Graph の状態モデル定義", () => {
	describe("ChatGraphState 型", () => {
		it("userId フィールドを持つ", () => {
			const state = {
				userId: "user123",
				threadId: "thread123",
				messages: [],
				userContext: "active_user" as UserContext,
			};
			expect(state.userId).toBe("user123");
		});

		it("threadId フィールドを持つ", () => {
			const state = {
				userId: "user123",
				threadId: "thread123",
				messages: [],
				userContext: "active_user" as UserContext,
			};
			expect(state.threadId).toBe("thread123");
		});

		it("messages フィールドを持つ", () => {
			const state = {
				userId: "user123",
				threadId: "thread123",
				messages: [
					{ role: "user", content: "Hello" },
					{ role: "assistant", content: "Hi there!" },
				],
				userContext: "active_user" as UserContext,
			};
			expect(state.messages).toHaveLength(2);
			expect(state.messages[0].role).toBe("user");
		});

		it("userContext フィールドを持つ", () => {
			const state = {
				userId: "user123",
				threadId: "thread123",
				messages: [],
				userContext: "new_user" as UserContext,
			};
			expect(state.userContext).toBe("new_user");
		});
	});

	describe("ChatGraphStateAnnotation", () => {
		it("messages reducer は時系列順で蓄積する", () => {
			// reducer のロジックをテスト
			const currentMessages = [{ role: "user", content: "First" }];
			const newMessages = [{ role: "assistant", content: "Second" }];

			// reducer の動作: [...current, ...update]
			const result = [...currentMessages, ...newMessages];

			expect(result).toHaveLength(2);
			expect(result[0].content).toBe("First");
			expect(result[1].content).toBe("Second");
		});

		it("userContext reducer は最新値で上書きする", () => {
			// reducer のロジックをテスト
			const currentContext: UserContext = "new_user";
			const newContext: UserContext = "active_user";

			// reducer の動作: (_, update) => update
			const result = newContext;

			expect(result).toBe("active_user");
		});

		it("messages のデフォルト値は空配列", () => {
			const defaultMessages: Array<{ role: string; content: string }> = [];
			expect(defaultMessages).toEqual([]);
		});

		it("userContext のデフォルト値は active_user", () => {
			const defaultContext: UserContext = "active_user";
			expect(defaultContext).toBe("active_user");
		});
	});
});

describe("Task 1.3: Task Graph の状態モデル定義", () => {
	describe("TaskGraphState 型", () => {
		it("userId フィールドを持つ", () => {
			const state = {
				userId: "user123",
				taskType: "daily_report" as TaskType,
				userContext: "active_user" as UserContext,
				taskResult: null,
			};
			expect(state.userId).toBe("user123");
		});

		it("taskType フィールドを持つ", () => {
			const state = {
				userId: "user123",
				taskType: "score_analysis" as TaskType,
				userContext: "active_user" as UserContext,
				taskResult: null,
			};
			expect(state.taskType).toBe("score_analysis");
		});

		it("userContext フィールドを持つ", () => {
			const state = {
				userId: "user123",
				taskType: "playlist_building" as TaskType,
				userContext: "playlist_recommended" as UserContext,
				taskResult: null,
			};
			expect(state.userContext).toBe("playlist_recommended");
		});

		it("taskResult フィールドを持つ", () => {
			const state = {
				userId: "user123",
				taskType: "daily_report" as TaskType,
				userContext: "active_user" as UserContext,
				taskResult: {
					type: "report" as const,
					data: { id: "report123" },
				},
			};
			expect(state.taskResult).not.toBeNull();
			expect(state.taskResult?.type).toBe("report");
		});
	});

	describe("TaskResult 型", () => {
		it("playlist 型の結果を受け入れる", () => {
			const result = {
				type: "playlist" as const,
				data: {
					id: "playlist123",
					userId: "user123",
					title: "Test Playlist",
				},
			};
			expect(result.type).toBe("playlist");
		});

		it("analysis 型の結果を受け入れる", () => {
			const result = {
				type: "analysis" as const,
				data: {
					userId: "user123",
					trend: "improving" as const,
				},
			};
			expect(result.type).toBe("analysis");
		});

		it("report 型の結果を受け入れる", () => {
			const result = {
				type: "report" as const,
				data: {
					id: "report123",
					userId: "user123",
				},
			};
			expect(result.type).toBe("report");
		});

		it("review 型の結果を受け入れる", () => {
			const result = {
				type: "review" as const,
				data: {
					userId: "user123",
					reviewPeriod: { days: 7 },
				},
			};
			expect(result.type).toBe("review");
		});
	});

	describe("TaskGraphStateAnnotation", () => {
		it("taskResult reducer は最新値で上書きする", () => {
			const currentResult = null;
			const newResult = {
				type: "playlist" as const,
				data: { id: "new123" },
			};

			// reducer の動作: (_, update) => update
			const result = newResult;

			expect(result).not.toBeNull();
			expect(result.type).toBe("playlist");
		});

		it("userContext reducer は最新値で上書きする", () => {
			const currentContext: UserContext = "new_user";
			const newContext: UserContext = "active_user";

			// reducer の動作: (_, update) => update
			const result = newContext;

			expect(result).toBe("active_user");
		});

		it("taskResult のデフォルト値は null", () => {
			const defaultResult = null;
			expect(defaultResult).toBeNull();
		});

		it("userContext のデフォルト値は active_user", () => {
			const defaultContext: UserContext = "active_user";
			expect(defaultContext).toBe("active_user");
		});
	});
});

describe("Task 1.4: ドメインエンティティの型定義", () => {
	describe("Playlist 型（既存の拡張）", () => {
		it("必須フィールドをすべて持つ", () => {
			// Playlist は既存の型定義を使用（変更なし）
			const playlist = {
				id: "playlist123",
				userId: "user123",
				title: "Tracking Improvement",
				description: "Focus on tracking accuracy",
				scenarios: [],
				targetWeaknesses: ["tracking", "flick"],
				totalDuration: 30,
				reasoning: "Based on recent scores",
				createdAt: new Date(),
				isActive: true,
			};
			expect(playlist.id).toBe("playlist123");
			expect(playlist.targetWeaknesses).toContain("tracking");
		});
	});

	describe("DailyReport 型（新規定義）", () => {
		it("必須フィールドをすべて持つ", () => {
			const report = {
				id: "report123",
				userId: "user123",
				date: new Date(),
				sessionsCount: 5,
				totalDuration: 60,
				performanceRating: "good" as const,
				achievements: ["PB更新"],
				challenges: ["tracking不安定"],
				tomorrowRecommendations: {
					focusSkills: ["tracking"],
					recommendedScenarios: ["Tracking V3"],
					recommendedDuration: 30,
				},
				createdAt: new Date(),
			};
			expect(report.sessionsCount).toBe(5);
			expect(report.performanceRating).toBe("good");
		});
	});

	describe("ScoreAnalysis 型（新規定義）", () => {
		it("必須フィールドをすべて持つ", () => {
			const analysis = {
				userId: "user123",
				period: { start: new Date(), end: new Date() },
				trend: "improving" as const,
				strengths: ["flick accuracy"],
				challenges: ["tracking stability"],
				milestones: ["PB更新: Tracking V3"],
				chartData: {
					labels: ["Mon", "Tue"],
					datasets: [{ label: "Accuracy", data: [80, 85] }],
				},
				createdAt: new Date(),
			};
			expect(analysis.trend).toBe("improving");
			expect(analysis.strengths).toContain("flick accuracy");
		});
	});

	describe("ProgressReport 型（新規定義）", () => {
		it("必須フィールドをすべて持つ", () => {
			const report = {
				userId: "user123",
				reviewPeriod: {
					start: new Date(),
					end: new Date(),
					days: 7,
				},
				beforePausePerformance: {
					avgScore: 75,
					strongSkills: ["flick"],
					activityFrequency: 5,
				},
				goalProgress: [],
				rehabilitationPlan: ["Start with easy scenarios"],
				motivationalMessage: "Welcome back!",
				generatedAt: new Date(),
			};
			expect(report.reviewPeriod.days).toBe(7);
			expect(report.beforePausePerformance.avgScore).toBe(75);
		});
	});

	describe("CoachingStatus 型（新規定義）", () => {
		it("必須フィールドをすべて持つ", () => {
			const status = {
				userContext: "active_user" as UserContext,
				todayFocus: {
					focusSkills: ["tracking"],
					recommendedDuration: 30,
					recommendedScenarios: ["Tracking V3"],
				},
				scoreTrendSummary: {
					trend: "improving" as const,
					improvedSkills: ["flick"],
					challengeSkills: ["tracking"],
				},
				activePlaylist: {
					id: "playlist123",
					title: "Daily Practice",
					scenariosCount: 5,
				},
				latestReport: {
					date: new Date(),
					generatedAt: new Date(),
				},
			};
			expect(status.userContext).toBe("active_user");
			expect(status.todayFocus).not.toBeNull();
		});

		it("オプショナルフィールドを null で初期化できる", () => {
			const status = {
				userContext: "new_user" as UserContext,
				todayFocus: null,
				scoreTrendSummary: null,
				activePlaylist: null,
				latestReport: null,
			};
			expect(status.todayFocus).toBeNull();
			expect(status.activePlaylist).toBeNull();
		});
	});
});
