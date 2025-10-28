"use client";

import { passkeyClient } from "better-auth/client/plugins";
import { deviceAuthorizationClient } from "better-auth/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "@/env.ts";

export const authClient = createAuthClient({
	baseURL: env.VITE_PUBLIC_AUTH_BASE_URL,
	plugins: [deviceAuthorizationClient(), passkeyClient()],
	fetchOptions: {
		credentials: "include",
	},
});
