import { createMiddleware } from "hono/factory";
import type { Variables } from "../variables";

export const setupSession = createMiddleware<{
	Variables: Variables;
}>(async (c, next) => {
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
});
