import { hc } from "hono/client";
import type { APIType } from "../../api";

export const client = hc<APIType>("", {
	init: {
		credentials: "include",
	},
});
