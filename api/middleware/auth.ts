import { EmailTemplate } from "@daveyplate/better-auth-ui/server";
import type { CloudflareBindings } from "api/bindings";
import { env } from "hono/adapter";
import { createMiddleware } from "hono/factory";
import { Resend } from "resend";
import { createAuth } from "../auth";
import type { Variables } from "../variables";

export const setupAuth = createMiddleware<{
	Bindings: CloudflareBindings;
	Variables: Variables;
}>(async (c, next) => {
	const {
		RESEND_API_KEY,
		AUTH_BASE_URL,
		BETTER_AUTH_SECRET,
		FRONT_URL,
		DISCORD_CLIENT_ID,
		DISCORD_CLIENT_SECRET,
	} = env<CloudflareBindings>(c);
	const resend = new Resend(RESEND_API_KEY);

	c.set(
		"auth",
		createAuth({
			db: c.var.db,
			baseURL: AUTH_BASE_URL,
			secret: BETTER_AUTH_SECRET,
			trustedOrigins: [FRONT_URL],
			discord: {
				clientId: DISCORD_CLIENT_ID,
				clientSecret: DISCORD_CLIENT_SECRET,
				redirectURI: `${AUTH_BASE_URL}/api/auth/callback/discord`,
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
						baseUrl: FRONT_URL,
						url,
					}),
				});
			},
		}),
	);
	return next();
});
