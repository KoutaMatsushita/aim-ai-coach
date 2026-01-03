import { Hono } from "hono";
import { requireUser } from "../middleware/require-user.ts";
import { ReportRepository } from "../repository/report-repository.ts";
import type { Variables } from "api/variables";
import { createDailyReportAgent } from "../ai/agents/daily-report-agent";
import { createWeeklyReportAgent } from "../ai/agents/weekly-report-agent";
import { createMonthlyReportAgent } from "../ai/agents/monthly-report-agent";
import { UserRepository } from "../repository/user-repository.ts";
import { AimLabsRepository } from "../repository/aim-labs-repository.ts";
import { KovaaksRepository } from "../repository/kovaaks-repository.ts";

export const reportsApp = new Hono<{ Variables: Variables }>()
	.use("*", requireUser)
	.post("/daily", async (c) => {
		// const force = c.req.query("force") === "true";
		const repository = new ReportRepository(c.var.db);
		// const report = (await repository.getRecentDailyReport(c.var.user.id))?.[-1];

		// if (!force && report) {
		// 	return c.json({
		// 		status: "success",
		// 		message: report.report,
		// 	});
		// }

		try {
			const dailyReportAgent = createDailyReportAgent(
				new UserRepository(c.var.db),
				new AimLabsRepository(c.var.db),
				new KovaaksRepository(c.var.db),
			);
			const message = await dailyReportAgent.generate({
				prompt: "Generate a daily report",
				options: {
					userId: c.var.user.id,
					date: new Date(),
				},
			});

			await repository.saveDailyReport(c.var.user.id, message.text);

			return c.json({
				status: "success",
				message: message,
			});
		} catch (error) {
			console.error(error);
			c.status(500);
			return c.json({
				status: "error",
				message:
					error instanceof Error ? error.message : "Report generation failed",
			});
		}
	})
	// Stub for weekly/monthly or migrate if needed
	.post("/weekly", async (c) => {
		// const force = c.req.query("force") === "true";
		const repository = new ReportRepository(c.var.db);
		// const report = (await repository.getRecentWeeklyReport(c.var.user.id))?.[-1];

		// if (!force && report) {
		// 	return c.json({
		// 		status: "success",
		// 		message: report.report,
		// 	});
		// }

		try {
			const weeklyReportAgent = createWeeklyReportAgent(
				new UserRepository(c.var.db),
				new AimLabsRepository(c.var.db),
				new KovaaksRepository(c.var.db),
			);

			const message = await weeklyReportAgent.generate({
				prompt: "Generate a weekly report",
				options: {
					userId: c.var.user.id,
					date: new Date(),
				},
			});

			await repository.saveWeeklyReport(c.var.user.id, message.text);

			return c.json({
				status: "success",
				message: message,
			});
		} catch (error) {
			console.error(error);
			c.status(500);
			return c.json({
				status: "error",
				message:
					error instanceof Error
						? error.message
						: "Weekly report generation failed",
			});
		}
	})
	.post("/monthly", async (c) => {
		// const force = c.req.query("force") === "true";
		const repository = new ReportRepository(c.var.db);
		// const report = (await repository.getRecentMonthlyReport(c.var.user.id))?.[-1];

		// if (!force && report) {
		// 	return c.json({
		// 		status: "success",
		// 		message: report.report,
		// 	});
		// }

		try {
			const monthlyReportAgent = createMonthlyReportAgent(
				new UserRepository(c.var.db),
				new AimLabsRepository(c.var.db),
				new KovaaksRepository(c.var.db),
			);

			const message = await monthlyReportAgent.generate({
				prompt: "Generate a monthly report",
				options: {
					userId: c.var.user.id,
					date: new Date(),
				},
			});

			await repository.saveMonthlyReport(c.var.user.id, message.text);

			return c.json({
				status: "success",
				message: message,
			});
		} catch (error) {
			console.error(error);
			c.status(500);
			return c.json({
				status: "error",
				message:
					error instanceof Error
						? error.message
						: "Monthly report generation failed",
			});
		}
	});
