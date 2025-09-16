import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { getEnv } from "../env";
import { logger } from "../logger";

// Validate environment variables
const env = getEnv();

export const storage = new LibSQLStore({
	url: env.TURSO_DATABASE_URL,
	authToken: env.TURSO_AUTH_TOKEN,
});

export const vector = new LibSQLVector({
	connectionUrl: env.TURSO_DATABASE_URL,
	authToken: env.TURSO_AUTH_TOKEN,
});

logger.info("Mastra stores initialized with enhanced memory support");

export const VECTOR_STORE_NAME = "AimAICoachVectorStore";
