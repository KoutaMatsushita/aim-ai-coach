import { relations } from "drizzle-orm";
import {
	index,
	integer,
	numeric,
	real,
	sqliteTable,
	text,
	unique,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

// ========================================
// Better Auth テーブル
// ========================================

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" })
		.default(false)
		.notNull(),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.defaultNow()
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const sessions = sqliteTable(
	"sessions",
	{
		id: text("id").primaryKey(),
		expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
		token: text("token").notNull().unique(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
	},
	(t) => [
		// Better Auth標準的なJOIN用（user_id外部キー）
		index("sessions_user_id_idx").on(t.userId),
		// セッション期限切れクリーンアップ用
		index("sessions_expires_at_idx").on(t.expiresAt),
	],
);

export const accounts = sqliteTable(
	"accounts",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: integer("access_token_expires_at", {
			mode: "timestamp",
		}),
		refreshTokenExpiresAt: integer("refresh_token_expires_at", {
			mode: "timestamp",
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: integer("created_at", { mode: "timestamp" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		// Discord認証ユーザーの高速検索用
		index("accounts_provider_account_idx").on(t.providerId, t.accountId),
		// Better Auth標準的なJOIN用（user_id外部キー）
		index("accounts_user_id_idx").on(t.userId),
	],
);

export const verifications = sqliteTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.defaultNow()
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const deviceCodes = sqliteTable(
	"device_codes",
	{
		id: text("id").primaryKey(),
		deviceCode: text("device_code").notNull(),
		userCode: text("user_code").notNull(),
		userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
		clientId: text("client_id"),
		scope: text("scope"),
		status: text("status").notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp" })
			.defaultNow()
			.notNull(),
		lastPolledAt: integer("last_polled_at", { mode: "timestamp" }),
		pollingInterval: integer("polling_interval"),
		createdAt: integer("created_at", { mode: "timestamp" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		// Better Auth標準的なJOIN用（user_id外部キー）
		index("device_codes_user_id_idx").on(t.userId),
	],
);

// ========================================
// AIM AI Coach データテーブル
// ========================================

export const kovaaksScoresTable = sqliteTable(
	"kovaaks_scores",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),

		// メタ情報（ファイル名など）
		scenarioName: text("scenario_name").notNull(),
		mode: text("mode").notNull(),
		runDatetimeText: text("run_datetime_text").notNull(),
		runEpochSec: integer("run_epoch_sec").notNull(),
		sourceFilename: text("source_filename").notNull(),

		// スコア情報（元キーとの対応をコメントで示す）
		accuracy: real("accuracy").notNull(), // "Accuracy": "1.000000"
		bot: text("bot").notNull(), // "Bot": "target"
		cheated: integer("cheated").notNull(), // "Cheated": "0"（0/1 を integer で保持）
		damageDone: real("damage_done").notNull(), // "Damage Done": "25.000000"
		damagePossible: real("damage_possible").notNull(), // "Damage Possible": "50.000000"
		efficiency: real("efficiency").notNull(), // "Efficiency": "0.500000"
		hits: integer("hits").notNull(), // "Hits": "1"
		killNumber: integer("kill_number").notNull(), // "Kill #": "183"
		overShots: integer("overshots").notNull(), // "OverShots": "0"
		shots: integer("shots").notNull(), // "Shots": "1"
		ttk: text("ttk").notNull(), // "TTK": "0.000000s"（末尾 s を含むため text）
		timestamp: text("timestamp").notNull(), // "Timestamp": "17:34:32.573"
		weapon: text("weapon").notNull(), // "Weapon": "pistol"
	},
	(t) => [
		unique().on(t.sourceFilename, t.timestamp),
		index("kovaaks_scores_user_id_idx").on(t.userId),
		// 時系列分析用（最新スコア、期間検索）
		index("kovaaks_scores_epoch_idx").on(t.runEpochSec),
		// User ID + 時系列の複合検索用
		index("kovaaks_scores_user_epoch_idx").on(t.userId, t.runEpochSec),
	],
);

export const aimlabTaskTable = sqliteTable(
	"aimlab_task_data",
	{
		taskId: integer().primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		klutchId: text(),
		createDate: numeric(),
		taskName: text(),
		score: integer(),
		mode: integer(),
		aimlabMap: integer("aimlab_map"),
		aimlabVersion: text("aimlab_version"),
		weaponType: text(),
		weaponName: text(),
		performanceClass: text(),
		workshopId: text(),
		performance: text(),
		playId: text(),
		startedAt: text(),
		endedAt: text(),
		hasReplay: integer(),
		weaponSkin: text(),
		appId: text(),
	},
	(t) => [
		index("aimlab_task_user_id_idx").on(t.userId),
		// 時系列分析用（タスク開始・終了時間）
		index("aimlab_task_started_at_idx").on(t.startedAt),
		// Discord ID + 時系列の複合検索用
		index("aimlab_task_user_started_idx").on(t.userId, t.startedAt),
	],
);

// ========================================
// AI Coach Feature テーブル (Task 8)
// ========================================

/**
 * Playlists テーブル
 * Task 8.1: プレイリストの永続化
 */
export const playlistsTable = sqliteTable(
	"playlists",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description").notNull(),
		// JSON 型フィールド（scenarios, targetWeaknesses）
		scenarios: text("scenarios", { mode: "json" }).notNull().$type<
			Array<{
				scenarioName: string;
				platform: "kovaaks" | "aimlab";
				purpose: string;
				expectedEffect: string;
				duration: number;
				order: number;
				difficultyLevel: "beginner" | "intermediate" | "advanced" | "expert";
			}>
		>(),
		targetWeaknesses: text("target_weaknesses", { mode: "json" })
			.notNull()
			.$type<string[]>(),
		totalDuration: integer("total_duration").notNull(),
		reasoning: text("reasoning").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.defaultNow()
			.notNull(),
		isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
	},
	(t) => [
		// userId と isActive のインデックス
		index("playlists_user_id_idx").on(t.userId),
		index("playlists_is_active_idx").on(t.isActive),
		// 複合インデックス（アクティブなプレイリスト検索）
		index("playlists_user_active_idx").on(t.userId, t.isActive),
	],
);

/**
 * Daily Reports テーブル
 * Task 8.2: デイリーレポートの永続化
 */
export const dailyReportsTable = sqliteTable(
	"daily_reports",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		date: integer("date", { mode: "timestamp" }).notNull(),
		sessionsCount: integer("sessions_count").notNull(),
		totalDuration: integer("total_duration").notNull(),
		performanceRating: text("performance_rating", {
			enum: ["good", "normal", "needs_improvement"],
		}).notNull(),
		// JSON 型フィールド（achievements, challenges, tomorrowRecommendations）
		achievements: text("achievements", { mode: "json" })
			.notNull()
			.$type<string[]>(),
		challenges: text("challenges", { mode: "json" })
			.notNull()
			.$type<string[]>(),
		tomorrowRecommendations: text("tomorrow_recommendations", { mode: "json" })
			.notNull()
			.$type<{
				focusSkills: string[];
				recommendedScenarios: string[];
				recommendedDuration: number;
			}>(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		// userId と date のインデックス
		index("daily_reports_user_id_idx").on(t.userId),
		index("daily_reports_date_idx").on(t.date),
		// 複合インデックス（ユーザーごとの日次レポート検索）
		index("daily_reports_user_date_idx").on(t.userId, t.date),
	],
);

// ========================================
// Relations
// ========================================

// Better Auth テーブル間のリレーション
export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	accounts: many(accounts),
	kovaaksScores: many(kovaaksScoresTable),
	aimlabTasks: many(aimlabTaskTable),
	playlists: many(playlistsTable),
	dailyReports: many(dailyReportsTable),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

export const deviceCodesRelations = relations(deviceCodes, ({ one }) => ({
	user: one(users, {
		fields: [deviceCodes.userId],
		references: [users.id],
	}),
}));

// 独自のリレーション
export const kovaaksScoresRelation = relations(
	kovaaksScoresTable,
	({ one }) => ({
		user: one(users, {
			fields: [kovaaksScoresTable.userId],
			references: [users.id],
		}),
	}),
);

export const aimlabTaskRelation = relations(aimlabTaskTable, ({ one }) => ({
	user: one(users, {
		fields: [aimlabTaskTable.userId],
		references: [users.id],
	}),
}));

// AI Coach Feature リレーション
export const playlistsRelation = relations(playlistsTable, ({ one }) => ({
	user: one(users, {
		fields: [playlistsTable.userId],
		references: [users.id],
	}),
}));

export const dailyReportsRelation = relations(dailyReportsTable, ({ one }) => ({
	user: one(users, {
		fields: [dailyReportsTable.userId],
		references: [users.id],
	}),
}));

// ========================================
// Local Processing テーブル (collector用)
// ========================================

// KovaaKs CSV処理完了追跡用
export const localCompleteKovaaksScore = sqliteTable(
	"local_complete_kovaaks_score",
	{
		fileName: text("file_name").primaryKey(),
		fileHash: text("file_hash").notNull(),
	},
	(t) => [
		index("local_complete_kovaaks_score_file_name_file_hash_idx").on(
			t.fileName,
			t.fileHash,
		),
	],
);

// AimLab タスク処理完了追跡用
export const localCompleteAimlabTask = sqliteTable(
	"local_complete_aimlab_task",
	{
		taskId: integer("task_id").primaryKey(),
	},
);

// ========================================
// Zod Schemas for Type Safety
// ========================================

// Better Auth
export const UserInsertSchema = createInsertSchema(users);
export const UserSelectSchema = createSelectSchema(users);
export type User = z.infer<typeof UserSelectSchema>;
export type UserInsert = z.infer<typeof UserInsertSchema>;

// Kovaaks Scores
export const KovaaksScoreInsertSchema = createInsertSchema(kovaaksScoresTable);
export const KovaaksScoreSelectSchema = createSelectSchema(kovaaksScoresTable);
export type KovaaksScore = z.infer<typeof KovaaksScoreSelectSchema>;
export type KovaaksScoreInsert = z.infer<typeof KovaaksScoreInsertSchema>;

// Aimlab Tasks
export const AimlabTaskInsertSchema = createInsertSchema(aimlabTaskTable);
export const AimlabTaskSelectSchema = createSelectSchema(aimlabTaskTable);
export type AimlabTask = z.infer<typeof AimlabTaskSelectSchema>;
export type AimlabTaskInsert = z.infer<typeof AimlabTaskInsertSchema>;

// Local Processing
export const LocalCompleteKovaaksScoreInsertSchema = createInsertSchema(
	localCompleteKovaaksScore,
);
export const LocalCompleteKovaaksScoreSelectSchema = createSelectSchema(
	localCompleteKovaaksScore,
);
export type LocalCompleteKovaaksScore = z.infer<
	typeof LocalCompleteKovaaksScoreSelectSchema
>;
export type LocalCompleteKovaaksScoreInsert = z.infer<
	typeof LocalCompleteKovaaksScoreInsertSchema
>;

export const LocalCompleteAimlabTaskInsertSchema = createInsertSchema(
	localCompleteAimlabTask,
);
export const LocalCompleteAimlabTaskSelectSchema = createSelectSchema(
	localCompleteAimlabTask,
);
export type LocalCompleteAimlabTask = z.infer<
	typeof LocalCompleteAimlabTaskSelectSchema
>;
export type LocalCompleteAimlabTaskInsert = z.infer<
	typeof LocalCompleteAimlabTaskInsertSchema
>;

// AI Coach Features
export const PlaylistInsertSchema = createInsertSchema(playlistsTable);
export const PlaylistSelectSchema = createSelectSchema(playlistsTable);
export type Playlist = z.infer<typeof PlaylistSelectSchema>;
export type PlaylistInsert = z.infer<typeof PlaylistInsertSchema>;

export const DailyReportInsertSchema = createInsertSchema(dailyReportsTable);
export const DailyReportSelectSchema = createSelectSchema(dailyReportsTable);
export type DailyReport = z.infer<typeof DailyReportSelectSchema>;
export type DailyReportInsert = z.infer<typeof DailyReportInsertSchema>;
