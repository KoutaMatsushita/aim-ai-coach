import { RuntimeContext } from "@mastra/core/di";
import type { Variables } from "api/variables";
import { Hono } from "hono";
import { requireUser } from "../middleware/require-user.ts";
import { ReportRepository } from "../repository/report-repository.ts";

export const reportsApp = new Hono<{ Variables: Variables }>()
	.use("*", requireUser)
	.post("/daily", async (c) => {
		const force = c.req.query("force") === "true";
		const repository = new ReportRepository(c.var.db);
		const report = (await repository.getRecentDailyReport(c.var.user.id))?.[-1];

		if (!force && report) {
			return c.json({
				status: "success",
				message: report.report,
			});
		}

		const workflow = c.var.mastra.getWorkflow("dailyReportWorkflow");
		const run = await workflow.createRunAsync();
		const result = await run.start({
			inputData: {
				days: 1,
			},
			runtimeContext: new RuntimeContext([["userId", c.var.user.id]]),
		});

		if (result.status === "success") {
			await repository.saveDailyReport(c.var.user.id, result.result.message);

			return c.json({
				status: result.status,
				message: result.result.message,
			});
		} else {
			console.log(result);
			c.status(500);
			return c.json({
				...result,
				message: "error",
			});
		}
	})
	.post("/weekly", async (c) => {
		const force = c.req.query("force") === "true";
		const repository = new ReportRepository(c.var.db);
		const report = (await repository.getRecentWeeklyReport(c.var.user.id))?.[
			-1
		];

		if (!force && report) {
			return c.json({
				status: "success",
				message: report.report,
			});
		}

		const workflow = c.var.mastra.getWorkflow("weeklyReportWorkflow");
		const run = await workflow.createRunAsync();
		const result = await run.start({
			inputData: {
				days: 7,
			},
			runtimeContext: new RuntimeContext([["userId", c.var.user.id]]),
		});

		if (result.status === "success") {
			await repository.saveWeeklyReport(c.var.user.id, result.result.message);

			return c.json({
				status: result.status,
				message: result.result.message,
			});
		} else {
			console.log(result);
			c.status(500);
			return c.json({
				...result,
				message: "error",
			});
		}
	})
	.post("/monthly", async (c) => {
		const force = c.req.query("force") === "true";
		const repository = new ReportRepository(c.var.db);
		const report = (await repository.getRecentMonthlyReport(c.var.user.id))?.[
			-1
		];

		if (!force && report) {
			return c.json({
				status: "success",
				message: report.report,
			});
		}

		const workflow = c.var.mastra.getWorkflow("monthlyReportWorkflow");
		const run = await workflow.createRunAsync();
		const result = await run.start({
			inputData: {
				days: 1,
			},
			runtimeContext: new RuntimeContext([["userId", c.var.user.id]]),
		});

		if (result.status === "success") {
			await repository.saveMonthlyReport(c.var.user.id, result.result.message);

			return c.json({
				status: result.status,
				message: result.result.message,
			});
		} else {
			console.log(result);
			c.status(500);
			return c.json({
				...result,
				message: "error",
			});
		}
	});
