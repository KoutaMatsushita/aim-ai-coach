import { createStep, createWorkflow } from "@mastra/core/workflows";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";
import { kovaaksScoresTable } from "../../db/schema";
import { insertKovaaksTool } from "../tools/kovaaks-tool";

const {
	createInsertSchema: createInsertSchemaCoerce,
	createSelectSchema: createSelectSchemaCoerce,
} = createSchemaFactory({
	coerce: { date: true },
});

const insertKovaaksWorkflow = createWorkflow({
	id: "insert-kovaaks-workflow",
	description: "insert kovaaks scores",
	inputSchema: z.array(createInsertSchemaCoerce(kovaaksScoresTable)),
	outputSchema: z.array(createSelectSchemaCoerce(kovaaksScoresTable)),
}).foreach(createStep(insertKovaaksTool));

insertKovaaksWorkflow.commit();
export { insertKovaaksWorkflow };
