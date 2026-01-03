import type { createAuth } from "./auth";
import type { createDB } from "./db";

export type Auth = ReturnType<typeof createAuth>;

export type Variables = {
	auth: ReturnType<typeof createAuth>;
	user: Auth["$Infer"]["Session"]["user"] | null;
	session: Auth["$Infer"]["Session"]["session"] | null;
	db: ReturnType<typeof createDB>;
};

export type RequiredAuthVariables = Variables & {
	user: Auth["$Infer"]["Session"]["user"];
	session: Auth["$Infer"]["Session"]["session"];
};
