import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
		YOUTUBE_API_KEY: z.string(),
		DISCORD_CLIENT_ID: z.string(),
		DISCORD_CLIENT_SECRET: z.string(),
		BETTER_AUTH_SECRET: z.string(),
		API_URL: z.string(),
		AUTH_BASE_URL: z.string(),
		FRONT_URL: z.string(),
		TURSO_DATABASE_URL: z.string(),
		TURSO_AUTH_TOKEN: z.string(),
	},
	runtimeEnvStrict: {
		GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
		YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
		DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
		DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		API_URL:  process.env.API_URL,
		AUTH_BASE_URL:  process.env.AUTH_BASE_URL,
		FRONT_URL:  process.env.FRONT_URL,
		TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
		TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
	},
	emptyStringAsUndefined: true,
});
