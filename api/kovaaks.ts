import { Hono } from "hono";
import type { Variables } from "./variables";
import { kovaaksScoresTable } from "./mastra/db";

export const kovaaksApp = new Hono<{ Variables: Variables }>()
    .post(
        "/",
        async (c) => {
            c.json(c.var.db.insert(kovaaksScoresTable).values(await c.req.json()))
        },
    )
