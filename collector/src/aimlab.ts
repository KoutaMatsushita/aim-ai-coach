import type {MastraClient} from "@mastra/client-js";
import type {DiscordUser} from "./discord.ts";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {Database} from "bun:sqlite";
import {getDB} from "./local-db.ts";
import {chunkArray, findFirstWithExt} from "./util.ts";
import {localCompleteAimlabTask} from "./db/schema.ts";
import {taskData} from "../local-aimlab-schema/schema.ts";

export const uploadAimlab = async (
    path: string,
    mastraClient: MastraClient,
    user: DiscordUser,
) => {
    const dbPath = await findFirstWithExt(path, ".bytes")
    if (!dbPath) throw new Error("no bytes file found")
    console.log(`[DB] ${dbPath}`)

    const client = new Database(dbPath, { readonly: true });
    const aimlabDB = drizzle({
        client,
        schema: {taskData}
    })

    const localDB = await getDB()
    const completedTaskIds = await localDB.query.localCompleteAimlabTask.findMany({
        columns: {
            taskId: true,
        }
    }).then(r => r.map(r => r.taskId))

    const uploadTasks = await aimlabDB.query.taskData.findMany({
        where: (t, { notInArray }) => notInArray(t.taskId, completedTaskIds)
    })
        .then(r => r.map(t => ({
            ...t,
            discordUserId: user.id,
        })))

    for (const chunked of chunkArray(uploadTasks, 100)) {
        await mastraClient.request(`/users/${user.id}/aimlab`, {
            method: "POST",
            body: chunked,
        })
    }

    await localDB.insert(localCompleteAimlabTask)
        .values(uploadTasks.map(t => ({ taskId: t.taskId })))
        .onConflictDoNothing()
}
