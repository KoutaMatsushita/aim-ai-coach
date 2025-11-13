/**
 * ユーザーコンテキスト検出ユーティリティ
 * Task 2.1: ユーザーコンテキスト検出ユーティリティを実装
 *
 * 既存の detectPhaseNode から共通ロジックを抽出し、
 * Chat Graph と Task Graph の両方で使用できるようにする
 */

import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { UserContext } from "../types";

/**
 * ユーザーコンテキスト検出結果
 */
export interface UserContextDetectionResult {
	userContext: UserContext;
	daysInactive: number;
	newScoresCount: number;
	isNewUser: boolean;
}

/**
 * ユーザーの活動状況とデータ状態からコンテキストを自動検出
 *
 * @param userId - ユーザーID
 * @param hasPlaylist - プレイリストの有無
 * @param db - Drizzle ORM データベースインスタンス
 * @returns ユーザーコンテキスト検出結果
 *
 * @example
 * ```typescript
 * const result = await detectUserContext("user-123", false, db);
 * console.log(result.userContext); // "new_user" | "returning_user" | ...
 * ```
 */
export async function detectUserContext(
	userId: string,
	hasPlaylist: boolean,
	db: DrizzleD1Database<any>,
): Promise<UserContextDetectionResult> {
	// ========================================
	// ユーザー活動状況の取得
	// ========================================

	// 最新のスコアを取得（Kovaaks）
	const recentScores = await db.query.kovaaksScoresTable.findMany({
		where: (t: any, { eq }: any) => eq(t.userId, userId),
		limit: 1,
		orderBy: (t: any, { desc }: any) => desc(t.runEpochSec),
	});

	// 最新のタスクを取得（Aimlabs）
	const recentTasks = await db.query.aimlabTaskTable.findMany({
		where: (t: any, { eq }: any) => eq(t.userId, userId),
		limit: 1,
		orderBy: (t: any, { desc }: any) => desc(t.startedAt),
	});

	// ========================================
	// 最終活動日の計算
	// ========================================

	const lastScoreDate = recentScores[0]
		? new Date(recentScores[0].runEpochSec * 1000)
		: null;
	const lastTaskDate = recentTasks[0]
		? new Date(recentTasks[0].startedAt || "")
		: null;

	// Kovaaks または Aimlabs のいずれか最新の活動日を使用
	const lastActivity = lastScoreDate || lastTaskDate;
	const daysInactive = lastActivity
		? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
		: 999; // データがない場合は大きな数値

	// ========================================
	// 新規スコア数の計算（直近24時間）
	// ========================================

	const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
	const newScoresIn24h = await db.query.kovaaksScoresTable.findMany({
		where: (t: any, { and, eq, gte }: any) =>
			and(eq(t.userId, userId), gte(t.runEpochSec, oneDayAgo)),
	});
	const newScoresCount = newScoresIn24h.length;

	// ========================================
	// 新規ユーザー判定
	// ========================================

	// 総スコア数をチェック（Kovaaks）
	const totalScores = await db.query.kovaaksScoresTable.findMany({
		where: (t: any, { eq }: any) => eq(t.userId, userId),
		limit: 1,
	});

	// 総タスク数をチェック（Aimlabs）
	const totalTasks = await db.query.aimlabTaskTable.findMany({
		where: (t: any, { eq }: any) => eq(t.userId, userId),
		limit: 1,
	});

	const isNewUser = totalScores.length === 0 && totalTasks.length === 0;

	// ========================================
	// コンテキスト判定ロジック
	// ========================================

	let userContext: UserContext;

	if (isNewUser) {
		// 新規ユーザー: スコアデータが存在しない
		userContext = "new_user";
	} else if (!hasPlaylist) {
		// プレイリスト推奨: スコアはあるがプレイリストがない
		userContext = "playlist_recommended";
	} else if (newScoresCount >= 6 && daysInactive < 1) {
		// スコア分析推奨: 直近24時間に6件以上のスコア && 最終活動から1日未満
		userContext = "analysis_recommended";
	} else if (daysInactive >= 7) {
		// 復帰ユーザー: 7日以上非アクティブ
		userContext = "returning_user";
	} else {
		// アクティブユーザー: 上記以外の通常状態
		userContext = "active_user";
	}

	// ========================================
	// ログ出力
	// ========================================

	console.log("[Context Detection]", {
		userId,
		userContext,
		daysInactive,
		newScoresCount,
		isNewUser,
		hasPlaylist,
	});

	// ========================================
	// 結果返却
	// ========================================

	return {
		userContext,
		daysInactive,
		newScoresCount,
		isNewUser,
	};
}
