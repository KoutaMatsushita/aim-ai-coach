"use client";

import { env } from "@/env.ts";
import { deviceAuthorizationClient } from "better-auth/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: env.VITE_PUBLIC_AUTH_BASE_URL,
	plugins: [deviceAuthorizationClient()],
});
