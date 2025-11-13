import { Hono } from "hono";
import { logger } from "hono/logger";
import type { CloudflareBindings } from "./bindings";
import { setupAuth } from "./middleware/auth";
import { setupCors } from "./middleware/cors";
import { setupDB } from "./middleware/db";
import { setupLangGraph } from "./middleware/langgraph";
import { setupSession } from "./middleware/session";
import { aimlabsApp } from "./routes/aimlabs";
import { chatApp } from "./routes/chat";
import { coachingApp } from "./routes/coaching";
import { knowledgesApp } from "./routes/knowledges";
import { kovaaksApp } from "./routes/kovaaks";
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
	.use("/coaching/*", setupSession)
	.use("/knowledges/*", setupSession)
	.route("/aimlabs", aimlabsApp)
	.route("/kovaaks", kovaaksApp)
	// LangGraph-powered routes
	.use("/chat/*", setupLangGraph)
	.use("/coaching/*", setupLangGraph)
	.use("/knowledges/*", setupLangGraph)
	.route("/chat", chatApp)
	.route("/coaching", coachingApp)
	.route("/knowledges", knowledgesApp);

export type APIType = typeof apiApp;

export default apiApp;
