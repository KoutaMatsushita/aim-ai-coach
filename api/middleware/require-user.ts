import { createMiddleware } from "hono/factory";
import type { RequiredAuthVariables } from "../variables";

export const requireUser = createMiddleware<{
	Variables: RequiredAuthVariables;
}>(async (c, next) => {
	if (!c.var.user) return c.json({ error: "Unauthorized" }, 401);
	c.set("user", c.var.user);
	c.set("session", c.var.session);

	return next();
});
