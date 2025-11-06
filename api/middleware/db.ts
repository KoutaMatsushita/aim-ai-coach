import type { CloudflareBindings } from "api/bindings";
import { env } from "hono/adapter";
import { createMiddleware } from "hono/factory";
import { createDB } from "../db";
import type { Variables } from "../variables";

export const setupDB = createMiddleware<{
	Bindings: CloudflareBindings;
	Variables: Variables;
}>(async (c, next) => {
	const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = env<CloudflareBindings>(c);
	c.set("db", createDB(TURSO_DATABASE_URL, TURSO_AUTH_TOKEN));
	return next();
});
