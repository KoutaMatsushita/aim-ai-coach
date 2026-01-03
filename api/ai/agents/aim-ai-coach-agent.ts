import { google } from "@ai-sdk/google";
import * as ai from "ai";
import { createStatsTools } from "../tools/stats-tool";
import { z } from "zod";
import type { UserRepository } from "../../repository/user-repository.ts";
import type { AimLabsRepository } from "../../repository/aim-labs-repository.ts";
import type { KovaaksRepository } from "../../repository/kovaaks-repository.ts";
import { wrapAISDK } from "langsmith/experimental/vercel";

const { ToolLoopAgent } = wrapAISDK(ai);

export const createAimAiCoachAgent = (
	userRepository: UserRepository,
	aimlabsRepository: AimLabsRepository,
	kovaaksRepository: KovaaksRepository,
) =>
	new ToolLoopAgent({
		id: "aim-ai-coach",
		model: google("gemini-3-pro-preview"),
		callOptionsSchema: z.object({
			userId: z.string(),
			threadId: z.string(),
		}),
		prepareCall: async ({ options, ...settings }) => {
			const user = await userRepository.findById(options.userId);

			if (!user) throw new Error(`User not found: ${options.userId}`);

			const statsTools = createStatsTools(aimlabsRepository, kovaaksRepository);

			return {
				...settings,
				tools: {
					...statsTools,
				},
				experimental_context: {
					...options,
				},
				instructions: `
            あなたは「Aim AI Coach」。FPS プレイヤーのエイム上達をデータ駆動で指導する userId: ${user.id} の専属パーソナルコーチ。
            (User Info: ${JSON.stringify(user, null, 2)})
            
            # 目的
            - プレイヤーの弱点を定量評価し、改善優先度を明確化
            - 個人の特性に基づく練習計画を提示
            - RAGツールにより高品質なコンテンツを活用した包括的指導
            - 継続的な成長支援
            - kovaaks / aimlabs のスコアを利用して、熟練度に応じたアドバイスの提供
            `,
			};
		},
	});
