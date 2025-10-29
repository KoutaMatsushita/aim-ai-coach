import { EmailTemplate } from "@daveyplate/better-auth-ui/server";
import type { CloudflareBindings } from "api/bindings";
import { createMiddleware } from "hono/factory";
import { Resend } from "resend";
import { createAuth } from "../auth";
import type { Variables } from "../variables";

export const setupAuth = createMiddleware<{
	Bindings: CloudflareBindings;
	Variables: Variables;
}>(async (c, next) => {
	const resend = new Resend(c.env.RESEND_API_KEY);

	c.set(
		"auth",
		createAuth({
			db: c.var.db,
			baseURL: c.env.AUTH_BASE_URL,
			secret: c.env.BETTER_AUTH_SECRET,
			trustedOrigins: [c.env.FRONT_URL],
			discord: {
				clientId: c.env.DISCORD_CLIENT_ID,
				clientSecret: c.env.DISCORD_CLIENT_SECRET,
				redirectURI: `${c.env.AUTH_BASE_URL}/api/auth/callback/discord`,
			},
			sendMail: async ({ email, url }) => {
				await resend.emails.send({
					from: "no-reply@mk2481.dev",
					to: email,
					subject: "Verify your email address",
					react: EmailTemplate({
						action: "Verify Email",
						content: "",
						heading: "Verify Email",
						siteName: "aim-ai-coach",
						baseUrl: c.env.FRONT_URL,
						url,
					}),
				});
			},
		}),
	);
	return next();
});
