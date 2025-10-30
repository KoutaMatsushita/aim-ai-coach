import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const createDB = (url: string, authToken: string) =>
	drizzle({
		connection: {
			url,
			authToken,
		},
		schema,
		logger: true,
	});

export * from "./schema";
