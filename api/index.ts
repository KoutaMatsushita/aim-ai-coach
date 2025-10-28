import { EmailTemplate } from "@daveyplate/better-auth-ui/server";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Resend } from "resend";
import { createAuth } from "./auth";
import { createDB } from "./db";
import { createMastra } from "./mastra";
import { aimlabsApp } from "./routes/aimlabs";
import { chatApp } from "./routes/chat";
import { knowledgesApp } from "./routes/knowledges";
import { kovaaksApp } from "./routes/kovaaks";
import { threadApp } from "./routes/threads";
import type { Variables } from "./variables";

type CloudflareBindings = {
	ASSETS: Fetcher;

	GOOGLE_GENERATIVE_AI_API_KEY: string;
	YOUTUBE_API_KEY: string;

	DISCORD_CLIENT_ID: string;
	DISCORD_CLIENT_SECRET: string;

	AUTH_BASE_URL: string;
	BETTER_AUTH_SECRET: string;

	FRONT_URL: string;

	TURSO_DATABASE_URL: string;
	TURSO_AUTH_TOKEN: string;

	RESEND_API_KEY: string;
};

const apiApp = new Hono<{
	Bindings: CloudflareBindings;
	Variables: Variables;
}>()
	.use("*", async (c, next) => {
		return cors({
			origin: [c.env.FRONT_URL],
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			exposeHeaders: ["Content-Length"],
			credentials: true,
			maxAge: 600,
		})(c, next);
	})
	.use("*", async (c, next) => {
		c.set("db", createDB(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN));
		return next();
	})
	.use("*", async (c, next) => {
		const resend = new Resend(c.env.RESEND_API_KEY);

		c.set(
			"auth",
			createAuth({
				db: c.var.db,
				baseURL: c.env.AUTH_BASE_URL,
				secret: c.env.BETTER_AUTH_SECRET,
				trustedOrigins: [c.env.FRONT_URL],
				discord: {
					clientId: c.env.DISCORD_CLIENT_ID,
					clientSecret: c.env.DISCORD_CLIENT_SECRET,
					redirectURI: `${c.env.AUTH_BASE_URL}/api/auth/callback/discord`,
				},
				sendMail: async ({ email, url }) => {
					await resend.emails.send({
						from: "no-reply@mk2481.dev",
						to: email,
						subject: "Verify your email address",
						react: EmailTemplate({
							action: "Verify Email",
							content: "",
							heading: "Verify Email",
							siteName: "aim-ai-coach",
							baseUrl: c.env.FRONT_URL,
							url,
						}),
					});
				},
			}),
		);
		return next();
	})
	.use("*", async (c, next) => {
		const session = await c.var.auth.api.getSession({
			headers: c.req.raw.headers,
		});
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
		);
		c.set("mastra", mastra);
		return next();
	})
	.basePath("/api")
	.use(logger())
	.on(["POST", "GET"], "/auth/*", (c) => {
		return c.var.auth.handler(c.req.raw);
	})
	.route("/chat", chatApp)
	.route("/threads", threadApp)
	.route("/knowledges", knowledgesApp)
	.route("/aimlabs", aimlabsApp)
	.route("/kovaaks", kovaaksApp);

export type APIType = typeof apiApp;

export default apiApp;
