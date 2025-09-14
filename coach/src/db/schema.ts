import {integer, real, sqliteTable, text} from "drizzle-orm/sqlite-core";
import {drizzle} from 'drizzle-orm/libsql';

export const kovaaksScoresTable = sqliteTable("kovaaks_scores", {
    id: integer("id").primaryKey({autoIncrement: true}),

    // メタ情報（ファイル名など）
    scenarioName: text("scenario_name").notNull(),
    mode: text("mode").notNull(),
    runDatetimeText: text("run_datetime_text").notNull(),
    runEpochSec: integer("run_epoch_sec").notNull(),
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
});

// Aim Lab TaskData.csv をそのまま保持するためのテーブル
export const aimlabTaskTable = sqliteTable("aimlab_task_data", {
    // CSV に既存の ID が振られているため、自動採番しない主キー
    id: integer("id").primaryKey(),

    userIdHash: text("user_id_hash").notNull(),       // 例: 40B47FE40A93915E
    playedAt: text("played_at").notNull(),            // 例: 2025-08-15 17:20:19（終了時刻/記録時刻）
    taskName: text("task_name").notNull(),            // 例: sixshot / gridshot / switchtrack
    score: integer("score").notNull(),                // 例: 66336
    difficulty: integer("difficulty").notNull(),      // 例: 10
    cheated: integer("cheated").notNull(),            // 0/1
    gameVersion: text("game_version").notNull(),      // 例: v1.37.4.1
    weapon: text("weapon").notNull(),                 // 例: Pistol
    caliber: text("caliber").notNull(),               // 例: 9mm
    dataType: text("data_type").notNull(),            // 例: SparData / TrackData
    note: text("note"),                               // 空欄が入ることがある列（nullable）
    detailsJson: text("details_json").notNull(),      // 各タスクの詳細 JSON（text として保存）
    sessionId: text("session_id").notNull(),          // 例: UUID
    startTime: text("start_time").notNull(),          // 例: 2025-08-15 17:19:19
    endTime: text("end_time").notNull(),              // 例: 2025-08-15 17:20:19
    attempt: integer("attempt").notNull(),            // 例: 1
    variant: text("variant").notNull(),               // 例: Original
    source: text("source").notNull(),                 // 例: AIMLAB
});

export const db = drizzle({
    connection: {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    },
})
