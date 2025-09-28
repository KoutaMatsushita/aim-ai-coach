import { createDB } from "../../db";

export const db = createDB(process.env.D1Database as any)
export * from "./schema"
