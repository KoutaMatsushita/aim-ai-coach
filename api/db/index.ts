import {drizzle} from "drizzle-orm/d1";
import * as schema from "./schema"

export const createDB = (d1: D1Database) => drizzle(d1, {
    schema,
    logger: process.env.NODE_ENV === "development",
});

export * from "./schema";