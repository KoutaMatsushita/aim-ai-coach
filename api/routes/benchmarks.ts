import { zValidator } from "@hono/zod-validator";
import { BenchmarkRepository } from "api/repository/benchmark-repository";
import { Hono } from "hono";
import { z } from "zod";

import type { Variables } from "../variables";

export const benchmarkApp = new Hono<{ Variables: Variables }>()
	.post(
		"/import",
		zValidator(
			"json",
			z.object({
				id: z.string(),
				name: z.string(),
				version: z.string(),
				description: z.string().optional(),
				ranks: z.array(
					z.object({
						id: z.string(),
						name: z.string(),
						order: z.number(),
						color: z.string().optional(),
					}),
				),
				scenarios: z.array(
					z.object({
						id: z.string(),
						name: z.string(),
						category: z.string(),
						subCategory: z.string().optional(),
						game: z.string(),
						requirements: z.array(
							z.object({
								rankId: z.string(),
								minScore: z.number(),
							}),
						),
					}),
				),
			}),
		),
		async (c) => {
			const data = c.req.valid("json");
			const db = c.get("db");
			const repo = new BenchmarkRepository(db);

			const result = await repo.upsertBenchmark(data);

			return c.json(result);
		},
	)
	.get("/:id", async (c) => {
		const id = c.req.param("id");
		const db = c.get("db");
		const repo = new BenchmarkRepository(db);

		const benchmark = await repo.getBenchmark(id);
		if (!benchmark) {
			return c.json({ error: "Benchmark not found" }, 404);
		}

		return c.json(benchmark);
	});
