import { Mastra } from "@mastra/core/mastra";
import type { MastraStorage } from "@mastra/core/storage";
import type { MastraVector } from "@mastra/core/vector";
import { createAimAiCoachAgent } from "./agents/aim-ai-coach-agent";
import { logger } from "./logger";

export const createMastra = (storage: MastraStorage, vector: MastraVector) =>
	new Mastra({
		agents: { aimAiCoachAgent: createAimAiCoachAgent(storage, vector) },
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
