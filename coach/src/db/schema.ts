import {customType, index, integer, numeric, real, sqliteTable, text, unique} from "drizzle-orm/sqlite-core";
import {drizzle} from 'drizzle-orm/libsql';
import {relations} from "drizzle-orm";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {z} from "zod";
import {getEnv} from "../env.ts";
import {logger} from "../logger.ts";

const epochSeconds = customType<{ data: Date; driverData: number }>({
    dataType() { return "integer"; },
    toDriver: (value) => Math.floor(value.getTime() / 1000),
    fromDriver: (value) => new Date(value * 1000),
});

export const discordUsersTable = sqliteTable("discord_users", {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    avatar: text("avatar").notNull(),
});

export const kovaaksScoresTable = sqliteTable("kovaaks_scores", {
    id: integer("id").primaryKey({autoIncrement: true}),
    discordUserId: text("discord_user_id").notNull(),

    // メタ情報（ファイル名など）
    scenarioName: text("scenario_name").notNull(),
    mode: text("mode").notNull(),
    runDatetimeText: text("run_datetime_text").notNull(),
    runEpochSec: epochSeconds("run_epoch_sec").notNull(),
    sourceFilename: text("source_filename").notNull(),

    // スコア情報（元キーとの対応をコメントで示す）
    accuracy: real("accuracy").notNull(),             // "Accuracy": "1.000000"
    bot: text("bot").notNull(),                       // "Bot": "target"
    cheated: integer("cheated").notNull(),            // "Cheated": "0"（0/1 を integer で保持）
    damageDone: real("damage_done").notNull(),        // "Damage Done": "25.000000"
    damagePossible: real("damage_possible").notNull(),// "Damage Possible": "50.000000"
    efficiency: real("efficiency").notNull(),         // "Efficiency": "0.500000"
    hits: integer("hits").notNull(),                  // "Hits": "1"
    killNumber: integer("kill_number").notNull(),     // "Kill #": "183"
    overShots: integer("overshots").notNull(),        // "OverShots": "0"
    shots: integer("shots").notNull(),                // "Shots": "1"
    ttk: text("ttk").notNull(),                       // "TTK": "0.000000s"（末尾 s を含むため text）
    timestamp: text("timestamp").notNull(),           // "Timestamp": "17:34:32.573"
    weapon: text("weapon").notNull(),                 // "Weapon": "pistol"
}, (t) => [
    unique().on(t.sourceFilename, t.timestamp),
    index("kovaaks_scores_discord_user_idx").on(t.discordUserId),
]);

export const discordUsersKovaaksScoreRelations = relations(discordUsersTable, ({many}) => ({
    scores: many(kovaaksScoresTable),
}))

export const kovaaksScoresDiscordUsersRelations = relations(kovaaksScoresTable, ({one}) => ({
    discordUsers: one(discordUsersTable, {
        fields: [kovaaksScoresTable.discordUserId],
        references: [discordUsersTable.id],
    }),
}))

export const aimlabTaskTable = sqliteTable("aimlab_task_data", {
    taskId: integer().primaryKey().notNull(),
    discordUserId: text("discord_user_id").notNull(),

    klutchId: text(),
    createDate: numeric(),
    taskName: text(),
    score: integer(),
    mode: integer(),
    aimlabMap: integer("aimlab_map"),
    aimlabVersion: text("aimlab_version",),
    weaponType: text(),
    weaponName: text(),
    performanceClass: text(),
    workshopId: text(),
    performance: text(),
    playId: text(),
    startedAt: integer({ mode: "timestamp" }),
    endedAt: integer({ mode: "timestamp" }),
    hasReplay: integer(),
    weaponSkin: text(),
    appId: text(),
}, (t) => [
    index("aimlab_task_discord_user_idx").on(t.discordUserId),
])

export const aimlabTaskDiscordUsersRelations = relations(aimlabTaskTable, ({one}) => ({
    discordUsers: one(discordUsersTable, {
        fields: [aimlabTaskTable.discordUserId],
        references: [discordUsersTable.id],
    }),
}))

// Validate environment variables and create database connection
const env = getEnv();

export const db = drizzle({
    logger: process.env.NODE_ENV === 'development',
    schema: {
        discordUsersTable,
        kovaaksScoresTable,
        kovaaksScoresDiscordUsersRelations,
        aimlabTaskTable,
        aimlabTaskDiscordUsersRelations,
    },
    connection: {
        url: env.TURSO_DATABASE_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    },
});

logger.info('Database connection initialized', {
    hasUrl: !!env.TURSO_DATABASE_URL,
    hasToken: !!env.TURSO_AUTH_TOKEN
});

export const DiscordUserInsertSchema = createInsertSchema(discordUsersTable)
export const DiscordUserSelectSchema = createSelectSchema(discordUsersTable)

export type DiscordUser = z.infer<typeof DiscordUserSelectSchema>
export type DiscordUserInsert = z.infer<typeof DiscordUserInsertSchema>

export const KovaaksScoreInsertSchema = createInsertSchema(kovaaksScoresTable)
export const KovaaksScoreSelectSchema = createSelectSchema(kovaaksScoresTable)

export type KovaaksScore = z.infer<typeof KovaaksScoreSelectSchema>
export type KovaaksScoreInsert = z.infer<typeof KovaaksScoreInsertSchema>

export const AimlabTaskInsertSchema = createInsertSchema(aimlabTaskTable)
export const AimlabTaskSelectSchema = createSelectSchema(aimlabTaskTable)

export type AimlabTask = z.infer<typeof AimlabTaskSelectSchema>
export type AimlabTaskInsert = z.infer<typeof AimlabTaskInsertSchema>
