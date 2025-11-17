import { shutdownAITracingRegistry } from "@mastra/core/ai-tracing";
import { Mastra } from "@mastra/core/mastra";
import type { MastraStorage } from "@mastra/core/storage";
import type { MastraVector } from "@mastra/core/vector";
import { LangSmithExporter } from "@mastra/langsmith";
import { createAimAiCoachAgent } from "./agents/aim-ai-coach-agent";
import { createDailyReportAgent } from "./agents/daily-report-agent.ts";
import { createWeeklyReportAgent } from "./agents/weekly-report-agent.ts";
import { logger } from "./logger";
import { dailyReportWorkflow, weeklyReportWorkflow } from "./workflows";
import { monthlyReportWorkflow } from "./workflows/monthly-report.ts";

export const createMastra = async (
	storage: MastraStorage,
	vector: MastraVector,
) => {
	await shutdownAITracingRegistry();
	return new Mastra({
		agents: {
			aimAiCoachAgent: createAimAiCoachAgent(storage, vector),
			dailyReportWorkflow: createDailyReportAgent(storage, vector),
			weeklyReportWorkflow: createWeeklyReportAgent(storage, vector),
		},
		workflows: {
			weeklyReportWorkflow,
			dailyReportWorkflow,
			monthlyReportWorkflow,
		},
		storage: storage,
		logger: logger,
		vectors: {
			vector,
		},
		observability: {
			configs: {
				langsmith: {
					serviceName: "aim-ai-coach",
					exporters: [
						new LangSmithExporter({
							apiKey: process.env.LANGSMITH_API_KEY,
						}),
					],
				},
			},
		},
	});
};
