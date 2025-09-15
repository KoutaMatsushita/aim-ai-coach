import {index, integer, sqliteTable, text} from "drizzle-orm/sqlite-core";

export const localCompleteKovaaksScore = sqliteTable('local_complete_kovaaks_score', {
    fileName: text("file_name").primaryKey(),
    fileHash: text("file_hash").notNull(),
}, (t) => ([
    index("local_complete_kovaaks_score_file_name_file_hash_idx").on(t.fileName, t.fileHash),
]));

export const localCompleteAimlabTask = sqliteTable('local_complete_aimlab_task', {
    taskId: integer("task_id").primaryKey(),
})
