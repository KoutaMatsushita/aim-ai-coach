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
		CLOUDFLARE_RUNTIME_API_TOKEN: z.string(),
		CLOUDFLARE_ACCOUNT_ID: z.string(),
		CLOUDFLARE_D1_DATABASE_ID: z.string(),
	},
	clientPrefix: "VITE_PUBLIC_",
	client: {
		VITE_PUBLIC_API_URL: z.string(),
		VITE_PUBLIC_AUTH_BASE_URL: z.string(),
	},
	runtimeEnvStrict: {
		GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
		YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
		DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
		DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		API_URL: process.env.API_URL,
		AUTH_BASE_URL: process.env.AUTH_BASE_URL,
		FRONT_URL: process.env.FRONT_URL,
		CLOUDFLARE_RUNTIME_API_TOKEN: process.env.CLOUDFLARE_RUNTIME_API_TOKEN,
		CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
		CLOUDFLARE_D1_DATABASE_ID: process.env.CLOUDFLARE_D1_DATABASE_ID,
		VITE_PUBLIC_API_URL: import.meta.env.VITE_PUBLIC_API_URL,
		VITE_PUBLIC_AUTH_BASE_URL: import.meta.env.VITE_PUBLIC_AUTH_BASE_URL,
	},
	emptyStringAsUndefined: true,
});
