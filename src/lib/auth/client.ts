"use client";

import { passkeyClient } from "better-auth/client/plugins";
import { deviceAuthorizationClient } from "better-auth/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: "",
	plugins: [deviceAuthorizationClient(), passkeyClient()],
	fetchOptions: {
		credentials: "include",
	},
});
