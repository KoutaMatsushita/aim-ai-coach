import type { CloudflareBindings } from "api/bindings";
import { env } from "hono/adapter";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import type { Variables } from "../variables";

export const setupCors = createMiddleware<{
	Bindings: CloudflareBindings;
	Variables: Variables;
}>(async (c, next) => {
	return cors({
		origin: [env<CloudflareBindings>(c).FRONT_URL],
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		credentials: true,
		maxAge: 600,
	})(c, next);
});
