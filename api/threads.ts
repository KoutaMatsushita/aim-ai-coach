import { Hono } from "hono";
import type {StorageThreadType, MastraMemory} from "@mastra/core";
import { convertMessages } from "@mastra/core/agent";
import type { Variables } from "./variables";
import { requireUser } from "./middleware/require-user";

type ThreadVariables = Variables & {
    memory: MastraMemory
    thread: StorageThreadType
}

export const threadApp = new Hono<{ Variables: ThreadVariables }>()
    .use("*", requireUser)
    .use("/:threadId/*", async (c, next) => {
        const mastra = c.var.mastra
        const threadId = c.req.param("threadId");

        const agent = mastra.getAgent("aimAiCoachAgent")
        const memory = await agent.getMemory()
        if (!memory) return c.json({ error: "memory is not found" }, 500);

        let thread = await memory.getThreadById({threadId})
        if (!thread) {
           thread = await memory.createThread({ threadId, resourceId: c.var.user.id})
        }

        c.set("memory", memory);
        c.set("thread", thread);
        return next()
    })
    .get(
        "/:threadId",
        async (c) => {
            return c.json(c.var.thread)
        })
    .delete(
        "/:threadId",
        async (c) => {
            c.var.memory.deleteThread(c.req.param("threadId"))
            return c.body(null, 204)
        })
    .get(
        "/:threadId/messages",
        async (c) => {
            const agentId = "aimAiCoachAgent";
            const agent = c.var.mastra.getAgent(agentId);

            const memory = await agent.getMemory()
            if (!memory) throw new Error("memory is not found");

            const result = await memory.query({ threadId: c.var.thread.id })
            const messages = convertMessages(
                result?.uiMessages || []
            ).to('AIV5.UI');

            return c.json(messages);
        })
