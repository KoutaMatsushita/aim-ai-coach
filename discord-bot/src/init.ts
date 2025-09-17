import { createFactory } from "discord-hono";

type Bindings = {
	MASTRA_BASE_URL: string;
};

export const factory = createFactory<{ Bindings: Bindings }>();
