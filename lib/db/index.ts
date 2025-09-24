import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema"
import { getRequiredEnv } from "@/lib/env";

const tursoClient = createClient({
    url: getRequiredEnv("TURSO_DATABASE_URL"),
    authToken: getRequiredEnv("TURSO_AUTH_TOKEN"),
});

export const db = drizzle(tursoClient, {
    schema,
    logger: process.env.NODE_ENV === "development",
});

export * from "./schema";