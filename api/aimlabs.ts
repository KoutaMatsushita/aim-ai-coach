import { Hono } from "hono";
import type { Variables } from "./variables";
import { zValidator } from "@hono/zod-validator";
import {AimlabTaskInsertSchema, aimlabTaskTable} from "./mastra/db";
import z from "zod";

export const aimlabsApp = new Hono<{ Variables: Variables }>()
    .post(
        "/",
        zValidator("json", z.array(AimlabTaskInsertSchema)),
        async (c) => {
            c.json(c.var.db.insert(aimlabTaskTable).values(await c.req.json()))
        },
    )
