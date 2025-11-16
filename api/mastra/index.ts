import { Mastra } from "@mastra/core/mastra";
import type { MastraStorage } from "@mastra/core/storage";
import type { MastraVector } from "@mastra/core/vector";
import { createAimAiCoachAgent } from "./agents/aim-ai-coach-agent";
import { createDailyReportAgent } from "./agents/daily-report-agent.ts";
import { createWeeklyReportAgent } from "./agents/weekly-report-agent.ts";
import { logger } from "./logger";
import { dailyReportWorkflow, weeklyReportWorkflow } from "./workflows";

export const createMastra = (storage: MastraStorage, vector: MastraVector) =>
	new Mastra({
		agents: {
			aimAiCoachAgent: createAimAiCoachAgent(storage, vector),
			dailyReportWorkflow: createDailyReportAgent(storage, vector),
			weeklyReportWorkflow: createWeeklyReportAgent(storage, vector),
		},
		workflows: {
			weeklyReportWorkflow,
			dailyReportWorkflow,
		},
		storage: storage,
		logger: logger,
		vectors: {
			vector,
		},
		telemetry: {
			enabled: false,
		},
		observability: {
			default: { enabled: false },
		},
	});
