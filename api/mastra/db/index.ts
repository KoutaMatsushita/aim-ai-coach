import { env } from "api/env";
import { createDB } from "../../db";

export const db = createDB(
    env.TURSO_DATABASE_URL!,
    env.TURSO_AUTH_TOKEN!,
)
export * from "./schema"
