import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_PUBLIC_",
	client: {
		VITE_PUBLIC_API_URL: z.string(),
		VITE_PUBLIC_AUTH_BASE_URL: z.string(),
	},
	runtimeEnvStrict: {
		VITE_PUBLIC_API_URL: import.meta.env.VITE_PUBLIC_API_URL,
		VITE_PUBLIC_AUTH_BASE_URL: import.meta.env.VITE_PUBLIC_AUTH_BASE_URL,
	},
	emptyStringAsUndefined: true,
});
