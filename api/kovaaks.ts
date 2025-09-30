import { Hono } from "hono";
import type { Variables } from "./variables";
import { zValidator } from "@hono/zod-validator";
import { KovaaksScoreInsertSchema, kovaaksScoresTable } from "./mastra/db";
import z from "zod";

export const kovaaksApp = new Hono<{ Variables: Variables }>()
    .post(
        "/",
        zValidator("json", z.array(KovaaksScoreInsertSchema)),
        async (c) => {
            c.json(c.var.db.insert(kovaaksScoresTable).values(await c.req.json()))
        },
    )
