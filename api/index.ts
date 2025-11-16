import { Hono } from "hono";
import { logger } from "hono/logger";
import type { CloudflareBindings } from "./bindings";
import { setupAuth } from "./middleware/auth";
import { setupCors } from "./middleware/cors";
import { setupDB } from "./middleware/db";
import { setupMastra } from "./middleware/mastra";
import { setupSession } from "./middleware/session";
import { aimlabsApp } from "./routes/aimlabs";
import { chatApp } from "./routes/chat";
import { knowledgesApp } from "./routes/knowledges";
import { kovaaksApp } from "./routes/kovaaks";
import { reportsApp } from "./routes/reports.ts";
import { threadApp } from "./routes/threads";
import type { Variables } from "./variables";

const apiApp = new Hono<{
	Bindings: CloudflareBindings;
	Variables: Variables;
}>()
	.use("*", setupCors)
	.use("*", setupDB)
	.use("*", setupAuth)
	.basePath("/api")
	.use(logger())
	.on(["POST", "GET"], "/auth/*", (c) => {
		return c.var.auth.handler(c.req.raw);
	})
	.use("/aimlabs/*", setupSession)
	.use("/kovaaks/*", setupSession)
	.use("/chat/*", setupSession)
	.use("/threads/*", setupSession)
	.use("/knowledges/*", setupSession)
	.use("/reports/*", setupSession)
	.route("/aimlabs", aimlabsApp)
	.route("/kovaaks", kovaaksApp)
	.use("/chat/*", setupMastra)
	.use("/threads/*", setupMastra)
	.use("/knowledges/*", setupMastra)
	.use("/reports/*", setupMastra)
	.route("/chat", chatApp)
	.route("/threads", threadApp)
	.route("/knowledges", knowledgesApp)
	.route("/reports", reportsApp);

export type APIType = typeof apiApp;

export default apiApp;
