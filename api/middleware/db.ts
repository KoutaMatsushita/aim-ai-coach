import type { CloudflareBindings } from "api/bindings";
import { createMiddleware } from "hono/factory";
import { createDB } from "../db";
import type { Variables } from "../variables";

export const setupDB = createMiddleware<{
	Bindings: CloudflareBindings;
	Variables: Variables;
}>(async (c, next) => {
	c.set("db", createDB(c.env.TURSO_DATABASE_URL, c.env.TURSO_AUTH_TOKEN));
	return next();
});
