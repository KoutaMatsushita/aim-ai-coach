import type { createAuth } from "./auth";
import type { createDB } from "./db";
import type { createCoachingGraph } from "./langgraph";

export type Auth = ReturnType<typeof createAuth>;

export type Variables = {
	auth: ReturnType<typeof createAuth>;
	user: Auth["$Infer"]["Session"]["user"] | null;
	session: Auth["$Infer"]["Session"]["session"] | null;
	langGraph: ReturnType<typeof createCoachingGraph>;
	db: ReturnType<typeof createDB>;
};

export type RequiredAuthVariables = Variables & {
	user: Auth["$Infer"]["Session"]["user"];
	session: Auth["$Infer"]["Session"]["session"];
};
