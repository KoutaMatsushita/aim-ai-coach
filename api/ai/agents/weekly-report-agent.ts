import { google } from "@ai-sdk/google";
import * as ai from "ai";
import { getStats } from "../tools/stats-tool";
import type { UserRepository } from "../../repository/user-repository.ts";
import { z } from "zod";
import { addDay, format } from "@formkit/tempo";
import type { AimLabsRepository } from "../../repository/aim-labs-repository.ts";
import type { KovaaksRepository } from "../../repository/kovaaks-repository.ts";
import { wrapAISDK } from "langsmith/experimental/vercel";

const { ToolLoopAgent } = wrapAISDK(ai);

export const createWeeklyReportAgent = (
	userRepository: UserRepository,
	aimlabsRepository: AimLabsRepository,
	kovaaksRepository: KovaaksRepository,
) => {
	return new ToolLoopAgent({
		id: "weekly-report",
		model: google("gemini-3-flash-preview"),
		callOptionsSchema: z.object({
			userId: z.string(),
			date: z.date().optional().default(new Date()),
		}),
		prepareCall: async ({ options, ...settings }) => {
			const user = await userRepository.findById(options.userId);
			if (!user) throw new Error(`User not found: ${options.userId}`);

			const startDate = format(addDay(options.date, -7), "YYYY-MM-DD");
			const endDate = format(addDay(options.date, 0), "YYYY-MM-DD");

			const currentStats = await getStats(
				aimlabsRepository,
				kovaaksRepository,
				{
					userId: user.id,
					period: "week",
					game: "all",
					startDate: startDate,
					endDate: endDate,
					limit: 10,
				},
			);

			const pastStats = await getStats(aimlabsRepository, kovaaksRepository, {
				userId: user.id,
				period: "week",
				game: "all",
				startDate: format(addDay(startDate, -70), "YYYY-MM-DD"),
				endDate: format(addDay(startDate, 0), "YYYY-MM-DD"),
				limit: 10,
			});

			if (!currentStats || !pastStats) {
				return {
					...settings,
					instructions: `stats が取得できなかった旨をユーザに伝える`,
				};
			}

			if (currentStats.length == 0 && pastStats.length == 0) {
				return {
					...settings,
					instructions: `過去分含めて stats が記録されていない旨をユーザに伝える`,
				};
			}

			return {
				...settings,
				instructions: `
				あなたは「Weekly Report Agent」。FPS プレイヤーのエイム上達をデータ駆動で指導する userId: ${user.id} のスコアを解析し、ウィークリーレポートを提供する。
                (User: ${user.name || "Unknown"})
                
                # CurrentStats
                ${JSON.stringify(currentStats, null, 2)}
                
                # PastStats
                ${JSON.stringify(pastStats, null, 2)}

                # 目的
                - 一週間の練習成果、成長、課題を包括的に分析する
                - 日付: ${startDate} から ${endDate} までの一週間のレポートを作成する
                - 来週に向けての目標やロードマップを提案する
                - 伸びているシナリオのみならず、スコアが下がっていたり伸び悩んでいるシナリオについても指摘する
                
                # 出力フォーマット
                以下のフォーマットに従ってレポートを作成してください。
                
                \`\`\`
                # Weekly AIM Report
                期間: [開始日] - [終了日]
                
                ## 今週の総評
                [今週を通しての成長、停滞、特筆すべき成果など]
                
                ## スキル推移分析
                [Flick/Tracking/Switching などのカテゴリ別の成長度]
                
                ## 注力シナリオ分析
                [シナリオ名]
                - プレイ数: [回数]
                - 平均スコア推移: [具体的数値]
                - 分析コメント: [成長要因や課題点]
                \`\`\`
                `,
			};
		},
	});
};
