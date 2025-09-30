import {Hono} from "hono";
import {logger} from 'hono/logger'
import {LibSQLStore, LibSQLVector} from "@mastra/libsql";
import type {Variables} from "./variables";
import {createMastra} from "./mastra";
import {threadApp} from "./threads"
import {chatApp} from "./chat";
import {createAuth} from "./auth";
import {createDB} from "./db";
import {cors} from "hono/cors";
import {knowledgesApp} from "./knowledges";

type CloudflareBindings = {
    ASSETS: Fetcher

    GOOGLE_GENERATIVE_AI_API_KEY: string
    YOUTUBE_API_KEY: string

    DISCORD_CLIENT_ID: string
    DISCORD_CLIENT_SECRET: string

    AUTH_BASE_URL: string
    BETTER_AUTH_SECRET: string

    FRONT_URL: string

    TURSO_DATABASE_URL: string
    TURSO_AUTH_TOKEN: string
};

const apiApp = new Hono<{
    Bindings: CloudflareBindings,
    Variables: Variables,
}>()
    .use("*", async (c, next) => {
        return cors({
            origin: [c.env.FRONT_URL],
            allowHeaders: ["Content-Type", "Authorization"],
            allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            exposeHeaders: ["Content-Length"],
            credentials: true,
            maxAge: 600,
        })(c, next)
    })
    .use("*", async (c, next) => {
        c.set("db", createDB(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN));
        return next();
    })
    .use("*", async (c, next) => {
        c.set("auth", createAuth(
            {
                db: c.var.db,
                baseURL: c.env.AUTH_BASE_URL,
                secret: c.env.BETTER_AUTH_SECRET,
                trustedOrigins: [c.env.FRONT_URL],
                discord: {
                    clientId: c.env.DISCORD_CLIENT_ID,
                    clientSecret: c.env.DISCORD_CLIENT_SECRET,
                },
            },
        ));
        return next();
    })
    .use("*", async (c, next) => {
        const session = await c.var.auth.api.getSession({headers: c.req.raw.headers});
        if (!session) {
            c.set("user", null);
            c.set("session", null);
            return next();
        }
        c.set("user", session.user);
        c.set("session", session.session);
        return next();
    })
    .use("*", async (c, next) => {
        const mastra = createMastra(
            new LibSQLStore({
                url: c.env.TURSO_DATABASE_URL,
                authToken: c.env.TURSO_AUTH_TOKEN,
            }),
            new LibSQLVector({
                connectionUrl: c.env.TURSO_DATABASE_URL,
                authToken: c.env.TURSO_AUTH_TOKEN,
            }),
        )
        c.set("mastra", mastra);
        return next();
    })
    .basePath("/api")
    .use(logger())
    .on(
        ["POST", "GET"],
        "/auth/*",
        (c) => {
            return c.var.auth.handler(c.req.raw);
        })
    .route("/chat", chatApp)
    .route("/threads", threadApp)
    .route("/knowledges", knowledgesApp)

export type APIType = typeof apiApp;

export default apiApp
