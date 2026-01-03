import { Hono } from "hono";
import { logger } from "hono/logger";
import type { CloudflareBindings } from "./bindings";
import { setupAuth } from "./middleware/auth";
import { setupCors } from "./middleware/cors";
import { setupDB } from "./middleware/db";
import { setupSession } from "./middleware/session";
import { aimlabsApp } from "./routes/aimlabs";
import { knowledgesApp } from "./routes/knowledges";
import { kovaaksApp } from "./routes/kovaaks";
import { reportsApp } from "./routes/reports.ts";
import { statsApp } from "./routes/stats";
import { threadApp } from "./routes/threads";
import { benchmarkApp } from "./routes/benchmarks";
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
	.use("/threads/*", setupSession)
	.use("/knowledges/*", setupSession)
	.use("/reports/*", setupSession)
	.use("/stats/*", setupSession)
	.route("/aimlabs", aimlabsApp)
	.route("/kovaaks", kovaaksApp)
	.route("/threads", threadApp)
	.route("/knowledges", knowledgesApp)
	.route("/reports", reportsApp)
	.route("/stats", statsApp)
	.route("/benchmarks", benchmarkApp);

export type APIType = typeof apiApp;

export default apiApp;
