/**
 * LangGraph Middleware
 * Initialize LangGraph coaching system
 */

import { LibSQLVector } from "@mastra/libsql";
import type { CloudflareBindings } from "api/bindings";
import { env } from "hono/adapter";
import { createMiddleware } from "hono/factory";
import { createCoachingGraph } from "../langgraph";
import type { Variables } from "../variables";

export const setupLangGraph = createMiddleware<{
	Bindings: CloudflareBindings;
	Variables: Variables;
}>(async (c, next) => {
	const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = env<CloudflareBindings>(c);

	// Create vector store (reuse LibSQLVector from Mastra)
	const vectorStore = new LibSQLVector({
		connectionUrl: TURSO_DATABASE_URL,
		authToken: TURSO_AUTH_TOKEN,
	});

	// Get database instance from context (set by setupDB middleware)
	const db = c.var.db;

	// Initialize LangGraph coaching system
	const coachingGraph = createCoachingGraph(vectorStore, db);

	// Set in context
	c.set("langGraph", coachingGraph);

	return next();
});
