import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import type { CloudflareBindings } from "api/bindings";
import { env } from "hono/adapter";
import { createMiddleware } from "hono/factory";
import { createMastra } from "../mastra";
import type { Variables } from "../variables";

export const setupMastra = createMiddleware<{
	Bindings: CloudflareBindings;
	Variables: Variables;
}>(async (c, next) => {
	const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = env<CloudflareBindings>(c);

	const mastra = await createMastra(
		new LibSQLStore({
			url: TURSO_DATABASE_URL,
			authToken: TURSO_AUTH_TOKEN,
		}),
		new LibSQLVector({
			connectionUrl: TURSO_DATABASE_URL,
			authToken: TURSO_AUTH_TOKEN,
		}),
	);
	c.set("mastra", mastra);
	return next();
});
