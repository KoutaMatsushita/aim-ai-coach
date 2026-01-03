import { createDB } from "api/db";
import { env } from "api/env";

export const db = createDB(env.TURSO_DATABASE_URL!, env.TURSO_AUTH_TOKEN!);
export * from "../../db/schema";
