import { RuntimeContext } from "@mastra/core/di";
import type { Variables } from "api/variables";
import { Hono } from "hono";
import { requireUser } from "../middleware/require-user.ts";

export const reportsApp = new Hono<{ Variables: Variables }>()
	.use("*", requireUser)
	.post("/daily", async (c) => {
		const workflow = c.var.mastra.getWorkflow("dailyReportWorkflow");
		const run = await workflow.createRunAsync();
		const result = await run.start({
			inputData: {
				days: 1,
			},
			runtimeContext: new RuntimeContext([["userId", c.var.user.id]]),
		});

		if (result.status === "success") {
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
		const workflow = c.var.mastra.getWorkflow("weeklyReportWorkflow");
		const run = await workflow.createRunAsync();
		const result = await run.start({
			inputData: {
				days: 7,
			},
			runtimeContext: new RuntimeContext([["userId", c.var.user.id]]),
		});

		if (result.status === "success") {
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
