import { hc } from "hono/client";
import type { APIType } from "../../api";
import { env } from "../env";

export const client = hc<APIType>(env.VITE_PUBLIC_API_URL, {
	init: {
		credentials: "include",
	},
});
