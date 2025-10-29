import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import type { CloudflareBindings } from "api/bindings";
import { createMiddleware } from "hono/factory";
import { createMastra } from "../mastra";
import type { Variables } from "../variables";

export const setupMastra = createMiddleware<{
	Bindings: CloudflareBindings;
	Variables: Variables;
}>(async (c, next) => {
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
});
