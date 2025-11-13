/**
 * ユーザーコンテキスト検出ユーティリティのテスト
 * Task 2.1: ユーザーコンテキスト検出ユーティリティを実装
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "../../types";
import { detectUserContext } from "../context-detection";

// DBモックの型定義
type MockDB = {
	query: {
		kovaaksScoresTable: {
			findMany: ReturnType<typeof vi.fn>;
		};
		aimlabTaskTable: {
			findMany: ReturnType<typeof vi.fn>;
		};
	};
};

describe("Task 2.1: ユーザーコンテキスト検出ユーティリティ", () => {
	describe("detectUserContext 関数", () => {
		let mockDb: MockDB;

		beforeEach(() => {
			// DBモックのセットアップ
			mockDb = {
				query: {
					kovaaksScoresTable: {
						findMany: vi.fn(),
					},
					aimlabTaskTable: {
						findMany: vi.fn(),
					},
				},
			};
		});

		it("should detect new_user when no scores exist", async () => {
			// スコアが存在しない（新規ユーザー）
			mockDb.query.kovaaksScoresTable.findMany.mockResolvedValue([]);
			mockDb.query.aimlabTaskTable.findMany.mockResolvedValue([]);

			const result = await detectUserContext("test-user", false, mockDb as any);

			expect(result.userContext).toBe("new_user");
			expect(result.isNewUser).toBe(true);
			expect(result.daysInactive).toBeGreaterThan(0);
			expect(result.newScoresCount).toBe(0);
		});

		it("should detect playlist_recommended when user has scores but no playlist", async () => {
			// スコアは存在するが、プレイリストなし
			const oneWeekAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
			mockDb.query.kovaaksScoresTable.findMany
				.mockResolvedValueOnce([{ runEpochSec: Math.floor(oneWeekAgo / 1000) }]) // 1. 最新スコア
				.mockResolvedValueOnce([]) // 3. 24時間以内の新規スコア
				.mockResolvedValueOnce([{ runEpochSec: 1234567890 }]); // 4. 総スコア存在チェック

			mockDb.query.aimlabTaskTable.findMany
				.mockResolvedValueOnce([]) // 2. 最新タスク
				.mockResolvedValueOnce([]); // 5. 総タスク存在チェック

			const result = await detectUserContext("test-user", false, mockDb as any);

			expect(result.userContext).toBe("playlist_recommended");
			expect(result.isNewUser).toBe(false);
		});

		it("should detect analysis_recommended when user has 6+ new scores in last 24h", async () => {
			// 直近24時間に6件以上のスコア
			const now = Date.now();
			const recentScoreTime = Math.floor((now - 1 * 60 * 60 * 1000) / 1000); // 1時間前

			mockDb.query.kovaaksScoresTable.findMany
				.mockResolvedValueOnce([{ runEpochSec: recentScoreTime }]) // 1. 最新スコア
				.mockResolvedValueOnce(
					Array.from({ length: 6 }, () => ({ runEpochSec: recentScoreTime })),
				) // 3. 24時間以内の新規スコア（6件）
				.mockResolvedValueOnce([{ runEpochSec: 1234567890 }]); // 4. 総スコア存在チェック

			mockDb.query.aimlabTaskTable.findMany
				.mockResolvedValueOnce([]) // 2. 最新タスク
				.mockResolvedValueOnce([]); // 5. 総タスク存在チェック

			const result = await detectUserContext("test-user", true, mockDb as any);

			expect(result.userContext).toBe("analysis_recommended");
			expect(result.newScoresCount).toBeGreaterThanOrEqual(6);
			expect(result.daysInactive).toBeLessThan(1);
		});

		it("should detect returning_user when inactive for 7+ days", async () => {
			// 7日以上非アクティブ
			const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
			mockDb.query.kovaaksScoresTable.findMany
				.mockResolvedValueOnce([
					{ runEpochSec: Math.floor(eightDaysAgo / 1000) },
				]) // 1. 最新スコア
				.mockResolvedValueOnce([]) // 3. 24時間以内の新規スコア
				.mockResolvedValueOnce([{ runEpochSec: 1234567890 }]); // 4. 総スコア存在チェック

			mockDb.query.aimlabTaskTable.findMany
				.mockResolvedValueOnce([]) // 2. 最新タスク
				.mockResolvedValueOnce([]); // 5. 総タスク存在チェック

			const result = await detectUserContext("test-user", true, mockDb as any);

			expect(result.userContext).toBe("returning_user");
			expect(result.daysInactive).toBeGreaterThanOrEqual(7);
		});

		it("should detect active_user for normal activity", async () => {
			// 通常のアクティブユーザー
			const yesterday = Date.now() - 1 * 24 * 60 * 60 * 1000;
			mockDb.query.kovaaksScoresTable.findMany
				.mockResolvedValueOnce([{ runEpochSec: Math.floor(yesterday / 1000) }]) // 最新スコア
				.mockResolvedValueOnce([{ runEpochSec: 1234567890 }]) // 総スコア存在チェック
				.mockResolvedValueOnce([{ runEpochSec: Math.floor(yesterday / 1000) }]); // 24時間以内の新規スコア（1件）

			mockDb.query.aimlabTaskTable.findMany
				.mockResolvedValueOnce([]) // 最新タスク
				.mockResolvedValueOnce([]); // 総タスク存在チェック

			const result = await detectUserContext("test-user", true, mockDb as any);

			expect(result.userContext).toBe("active_user");
			expect(result.isNewUser).toBe(false);
		});

		it("should use aimlabs data when kovaaks data is absent", async () => {
			// Kovaaks データなし、Aimlabs データあり
			const yesterday = Date.now() - 1 * 24 * 60 * 60 * 1000;
			mockDb.query.kovaaksScoresTable.findMany
				.mockResolvedValueOnce([]) // 最新スコア（なし）
				.mockResolvedValueOnce([]) // 総スコア存在チェック（なし）
				.mockResolvedValueOnce([]); // 24時間以内の新規スコア（なし）

			mockDb.query.aimlabTaskTable.findMany
				.mockResolvedValueOnce([
					{ startedAt: new Date(yesterday).toISOString() },
				]) // 最新タスク
				.mockResolvedValueOnce([{ startedAt: "2023-01-01T00:00:00.000Z" }]); // 総タスク存在チェック

			const result = await detectUserContext("test-user", true, mockDb as any);

			expect(result.userContext).toBe("active_user");
			expect(result.isNewUser).toBe(false);
		});

		it("should return structured context detection result", async () => {
			// 返却値の構造検証
			mockDb.query.kovaaksScoresTable.findMany.mockResolvedValue([]);
			mockDb.query.aimlabTaskTable.findMany.mockResolvedValue([]);

			const result = await detectUserContext("test-user", false, mockDb as any);

			// 返却値が必要なフィールドをすべて含むことを確認
			expect(result).toHaveProperty("userContext");
			expect(result).toHaveProperty("daysInactive");
			expect(result).toHaveProperty("newScoresCount");
			expect(result).toHaveProperty("isNewUser");

			// 型チェック
			const validContexts: UserContext[] = [
				"new_user",
				"returning_user",
				"active_user",
				"playlist_recommended",
				"analysis_recommended",
			];
			expect(validContexts).toContain(result.userContext);
			expect(typeof result.daysInactive).toBe("number");
			expect(typeof result.newScoresCount).toBe("number");
			expect(typeof result.isNewUser).toBe("boolean");
		});

		it("should log detection results to console", async () => {
			// コンソールログの検証
			const consoleSpy = vi.spyOn(console, "log");

			mockDb.query.kovaaksScoresTable.findMany.mockResolvedValue([]);
			mockDb.query.aimlabTaskTable.findMany.mockResolvedValue([]);

			await detectUserContext("test-user-123", false, mockDb as any);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("[Context Detection]"),
				expect.objectContaining({
					userId: "test-user-123",
					userContext: "new_user",
					daysInactive: expect.any(Number),
					newScoresCount: 0,
					isNewUser: true,
					hasPlaylist: false,
				}),
			);

			consoleSpy.mockRestore();
		});
	});
});
