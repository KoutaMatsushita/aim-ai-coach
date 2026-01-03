import { relations, sql } from "drizzle-orm";
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

export const passkeys = sqliteTable("passkeys", {
	id: text("id").primaryKey(),
	name: text("name"),
	publicKey: text("publicKey").notNull(),
	userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
	credentialID: text("credentialID").notNull(),
	counter: integer("counter"),
	deviceType: text("deviceType").notNull(),
	backedUp: integer("backedUp", { mode: "boolean" }).notNull(),
	transports: text("transports").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.defaultNow()
		.notNull(),
	aaguid: text("aaguid"),
});

// ========================================
// Chat History テーブル
// ========================================

export const chatThreads = sqliteTable(
	"chat_threads",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: text("title"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [index("chat_threads_user_id_idx").on(t.userId)],
);

export const chatMessages = sqliteTable(
	"chat_messages",
	{
		id: text("id").primaryKey(),
		threadId: text("thread_id")
			.notNull()
			.references(() => chatThreads.id, { onDelete: "cascade" }),
		role: text("role").notNull(), // 'user' | 'assistant' | 'system' | 'tool'
		parts: text("parts", { mode: "json" }),
		metadata: text("metadata", { mode: "json" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("chat_messages_thread_id_idx").on(t.threadId),
		index("chat_messages_user_id_idx").on(t.userId),
		index("chat_messages_created_at_idx").on(t.createdAt),
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

		// セッション全体情報（CSVフッター由来）
		score: real("score").default(0).notNull(),
		sessionAccuracy: real("session_accuracy").default(0).notNull(),
		meta: text("meta"), // JSON string
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

export const dailyReportTable = sqliteTable(
	"daily_report",
	{
		id: integer().primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		report: text().notNull(),
		createdAt: text().notNull().default(sql`(current_timestamp)`),
	},
	(t) => [
		index("daily_report_user_id_idx").on(t.userId),
		index("daily_report_user_started_idx").on(t.userId, t.createdAt),
	],
);

export const weeklyReportTable = sqliteTable(
	"weekly_report",
	{
		id: integer().primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		report: text().notNull(),
		createdAt: text().notNull().default(sql`(current_timestamp)`),
	},
	(t) => [
		index("weekly_report_user_id_idx").on(t.userId),
		index("weekly_report_user_started_idx").on(t.userId, t.createdAt),
	],
);

export const monthlyReportTable = sqliteTable(
	"monthly_report",
	{
		id: integer().primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		report: text().notNull(),
		createdAt: text().notNull().default(sql`(current_timestamp)`),
	},
	(t) => [
		index("monthly_report_user_id_idx").on(t.userId),
		index("monthly_report_user_started_idx").on(t.userId, t.createdAt),
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
	dailyReports: many(dailyReportTable),
	weeklyReports: many(weeklyReportTable),
	monthlyReports: many(monthlyReportTable),
	chatThreads: many(chatThreads),
	chatMessages: many(chatMessages),
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

export const dailyReportRelation = relations(dailyReportTable, ({ one }) => ({
	user: one(users, {
		fields: [dailyReportTable.userId],
		references: [users.id],
	}),
}));

export const weeklyReportRelation = relations(weeklyReportTable, ({ one }) => ({
	user: one(users, {
		fields: [weeklyReportTable.userId],
		references: [users.id],
	}),
}));

export const monthlyReportRelation = relations(
	monthlyReportTable,
	({ one }) => ({
		user: one(users, {
			fields: [monthlyReportTable.userId],
			references: [users.id],
		}),
	}),
);

export const chatThreadsRelation = relations(chatThreads, ({ one, many }) => ({
	user: one(users, {
		fields: [chatThreads.userId],
		references: [users.id],
	}),
	messages: many(chatMessages),
}));

export const chatMessagesRelation = relations(chatMessages, ({ one }) => ({
	user: one(users, {
		fields: [chatMessages.userId],
		references: [users.id],
	}),
	thread: one(chatThreads, {
		fields: [chatMessages.threadId],
		references: [chatThreads.id],
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

// Reports
export const DailyReportInsertSchema = createInsertSchema(dailyReportTable);
export const DailyReportSelectSchema = createSelectSchema(dailyReportTable);
export type DailyReportInsert = z.infer<typeof DailyReportInsertSchema>;
export type DailyReportSelectSchema = z.infer<typeof DailyReportSelectSchema>;

export const WeeklyReportInsertSchema = createInsertSchema(weeklyReportTable);
export const WeeklyReportSelectSchema = createSelectSchema(weeklyReportTable);
export type WeeklyReportInsert = z.infer<typeof WeeklyReportInsertSchema>;
export type WeeklyReportSelectSchema = z.infer<typeof WeeklyReportSelectSchema>;

export const MonthlyReportInsertSchema = createInsertSchema(monthlyReportTable);
export const MonthlyReportSelectSchema = createSelectSchema(monthlyReportTable);
export type MonthlyReportSelectSchema = z.infer<
	typeof MonthlyReportSelectSchema
>;

// Chat Messages
export const ChatMessageInsertSchema = createInsertSchema(chatMessages);
export const ChatMessageSelectSchema = createSelectSchema(chatMessages);
export type ChatMessageInsert = z.infer<typeof ChatMessageInsertSchema>;
export type ChatMessageSelect = z.infer<typeof ChatMessageSelectSchema>;

// ========================================
// Benchmark Tables (Viscose Benches etc.)
// ========================================

export const benchmarks = sqliteTable(
	"benchmarks",
	{
		id: text("id").primaryKey(), // e.g. "viscose_v4"
		name: text("name").notNull(), // e.g. "Viscose Benches Season 4"
		description: text("description"),
		version: text("version").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.defaultNow()
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [unique().on(t.name, t.version)],
);

export const benchmarkScenarios = sqliteTable(
	"benchmark_scenarios",
	{
		id: text("id").primaryKey(), // e.g. "viscose_v4_vt_minigod"
		benchmarkId: text("benchmark_id")
			.notNull()
			.references(() => benchmarks.id, { onDelete: "cascade" }),
		name: text("name").notNull(), // Scene name in KovaaKs/Aimlab e.g. "VT MiniGod"
		category: text("category").notNull(), // e.g. "Clicking", "Tracking", "Switching"
		subCategory: text("sub_category"), // e.g. "Static", "Dynamic", "Precise"
		description: text("description"),
		game: text("game").notNull(), // "KovaaKs" or "Aimlab"
	},
	(t) => [
		index("benchmark_scenarios_benchmark_id_idx").on(t.benchmarkId),
		// Index for looking up scenarios by name (important for matching with scores)
		index("benchmark_scenarios_name_idx").on(t.name),
	],
);

export const benchmarkRanks = sqliteTable(
	"benchmark_ranks",
	{
		id: text("id").primaryKey(), // e.g. "viscose_v4_gold"
		benchmarkId: text("benchmark_id")
			.notNull()
			.references(() => benchmarks.id, { onDelete: "cascade" }),
		name: text("name").notNull(), // e.g. "Gold", "Diamond"
		order: integer("order").notNull(), // 1, 2, 3... (higher is better)
		color: text("color"), // Hex code for UI
		imageUrl: text("image_url"), // Icon URL
	},
	(t) => [
		index("benchmark_ranks_benchmark_id_idx").on(t.benchmarkId),
		unique().on(t.benchmarkId, t.order),
	],
);

export const benchmarkScenarioRequirements = sqliteTable(
	"benchmark_scenario_requirements",
	{
		id: text("id").primaryKey(),
		scenarioId: text("scenario_id")
			.notNull()
			.references(() => benchmarkScenarios.id, { onDelete: "cascade" }),
		rankId: text("rank_id")
			.notNull()
			.references(() => benchmarkRanks.id, { onDelete: "cascade" }),
		minScore: real("min_score").notNull(),
	},
	(t) => [
		index("benchmark_reqs_scenario_id_idx").on(t.scenarioId),
		index("benchmark_reqs_rank_id_idx").on(t.rankId),
		unique().on(t.scenarioId, t.rankId),
	],
);

// ========================================
// Benchmark Relations
// ========================================

export const benchmarksRelations = relations(benchmarks, ({ many }) => ({
	scenarios: many(benchmarkScenarios),
	ranks: many(benchmarkRanks),
}));

export const benchmarkScenariosRelations = relations(
	benchmarkScenarios,
	({ one, many }) => ({
		benchmark: one(benchmarks, {
			fields: [benchmarkScenarios.benchmarkId],
			references: [benchmarks.id],
		}),
		requirements: many(benchmarkScenarioRequirements),
	}),
);

export const benchmarkRanksRelations = relations(
	benchmarkRanks,
	({ one, many }) => ({
		benchmark: one(benchmarks, {
			fields: [benchmarkRanks.benchmarkId],
			references: [benchmarks.id],
		}),
		requirements: many(benchmarkScenarioRequirements),
	}),
);

export const benchmarkScenarioRequirementsRelations = relations(
	benchmarkScenarioRequirements,
	({ one }) => ({
		scenario: one(benchmarkScenarios, {
			fields: [benchmarkScenarioRequirements.scenarioId],
			references: [benchmarkScenarios.id],
		}),
		rank: one(benchmarkRanks, {
			fields: [benchmarkScenarioRequirements.rankId],
			references: [benchmarkRanks.id],
		}),
	}),
);

// ========================================
// Benchmark Zod Schemas
// ========================================

export const BenchmarkInsertSchema = createInsertSchema(benchmarks);
export const BenchmarkSelectSchema = createSelectSchema(benchmarks);
export type Benchmark = z.infer<typeof BenchmarkSelectSchema>;
export type BenchmarkInsert = z.infer<typeof BenchmarkInsertSchema>;

export const BenchmarkScenarioInsertSchema =
	createInsertSchema(benchmarkScenarios);
export const BenchmarkScenarioSelectSchema =
	createSelectSchema(benchmarkScenarios);
export type BenchmarkScenario = z.infer<typeof BenchmarkScenarioSelectSchema>;
export type BenchmarkScenarioInsert = z.infer<
	typeof BenchmarkScenarioInsertSchema
>;

export const BenchmarkRankInsertSchema = createInsertSchema(benchmarkRanks);
export const BenchmarkRankSelectSchema = createSelectSchema(benchmarkRanks);
export type BenchmarkRank = z.infer<typeof BenchmarkRankSelectSchema>;
export type BenchmarkRankInsert = z.infer<typeof BenchmarkRankInsertSchema>;

export const BenchmarkRequirementInsertSchema = createInsertSchema(
	benchmarkScenarioRequirements,
);
export const BenchmarkRequirementSelectSchema = createSelectSchema(
	benchmarkScenarioRequirements,
);
export type BenchmarkRequirement = z.infer<
	typeof BenchmarkRequirementSelectSchema
>;
export type BenchmarkRequirementInsert = z.infer<
	typeof BenchmarkRequirementInsertSchema
>;
