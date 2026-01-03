import { and, eq, inArray, sql } from "drizzle-orm";
import {
	type DBType,
	benchmarkRanks,
	benchmarkScenarioRequirements,
	benchmarkScenarios,
	benchmarks,
	kovaaksScoresTable,
} from "../db";

export type BenchmarkImportData = {
	id: string;
	name: string;
	version: string;
	description?: string;
	ranks: {
		id: string;
		name: string;
		order: number;
		color?: string;
	}[];
	scenarios: {
		id: string;
		name: string;
		category: string;
		subCategory?: string;
		game: string;
		requirements: {
			rankId: string;
			minScore: number;
		}[];
	}[];
};

export class BenchmarkRepository {
	constructor(private readonly db: DBType) {}

	async upsertBenchmark(data: BenchmarkImportData) {
		// 1. Upsert Benchmark
		await this.db
			.insert(benchmarks)
			.values({
				id: data.id,
				name: data.name,
				version: data.version,
				description: data.description,
			})
			.onConflictDoUpdate({
				target: benchmarks.id,
				set: {
					name: data.name,
					version: data.version,
					description: data.description,
				},
			});

		// 2. Upsert Ranks
		if (data.ranks.length > 0) {
			await this.db
				.insert(benchmarkRanks)
				.values(
					data.ranks.map((r) => ({
						...r,
						benchmarkId: data.id,
					})),
				)
				.onConflictDoUpdate({
					target: benchmarkRanks.id,
					set: {
						name: sql`excluded.name`,
						order: sql`excluded.order`,
						color: sql`excluded.color`,
					},
				});
		}

		// 3. Upsert Scenarios & Requirements
		for (const s of data.scenarios) {
			await this.db
				.insert(benchmarkScenarios)
				.values({
					id: s.id,
					benchmarkId: data.id,
					name: s.name,
					category: s.category,
					subCategory: s.subCategory,
					game: s.game,
				})
				.onConflictDoUpdate({
					target: benchmarkScenarios.id,
					set: {
						name: s.name,
						category: s.category,
						subCategory: s.subCategory,
						game: s.game,
					},
				});

			if (s.requirements.length > 0) {
				await this.db
					.insert(benchmarkScenarioRequirements)
					.values(
						s.requirements.map((req) => ({
							id: `${s.id}_${req.rankId}`,
							scenarioId: s.id,
							rankId: req.rankId,
							minScore: req.minScore,
						})),
					)
					.onConflictDoUpdate({
						target: benchmarkScenarioRequirements.id,
						set: { minScore: sql`excluded.min_score` },
					});
			}
		}

		return { success: true, count: data.scenarios.length };
	}

	async getBenchmark(benchmarkId: string) {
		return await this.db.query.benchmarks.findFirst({
			where: eq(benchmarks.id, benchmarkId),
			with: {
				scenarios: {
					with: {
						requirements: {
							with: {
								rank: true,
							},
						},
					},
				},
				ranks: {
					orderBy: (ranks, { asc }) => [asc(ranks.order)],
				},
			},
		});
	}

	async getUserBenchmarkStats(userId: string, benchmarkId: string) {
		const benchmark = await this.getBenchmark(benchmarkId);

		if (!benchmark) {
			return null;
		}

		// Extract all scenario names
		const scenarioNames = benchmark.scenarios.map((s) => s.name);

		// Fetch max score per scenario for user
		const userScores = await this.db
			.select({
				scenarioName: kovaaksScoresTable.scenarioName,
				maxScore: sql<number>`max(${kovaaksScoresTable.score})`.as(
					"max_score",
				),
			})
			.from(kovaaksScoresTable)
			.where(
				and(
					eq(kovaaksScoresTable.userId, userId),
					inArray(kovaaksScoresTable.scenarioName, scenarioNames),
				),
			)
			.groupBy(kovaaksScoresTable.scenarioName);

		const scoreMap = new Map(userScores.map((s) => [s.scenarioName, s.maxScore]));

		// Calculate Ranks
		const resultScenarios = benchmark.scenarios.map((scenario) => {
			const score = scoreMap.get(scenario.name) || 0;
			const reqs = scenario.requirements.sort(
				(a, b) => a.rank.order - b.rank.order,
			);

			let currentRank: string | null = null;
			let nextRank: string | null = null;
			let nextRankScore: number | null = null;

			// Find highest achieved rank
			for (const req of reqs) {
				if (score >= req.minScore) {
					currentRank = req.rank.name;
				} else {
					// First unachieved rank is the next target
					nextRank = req.rank.name;
					nextRankScore = req.minScore;
					break;
				}
			}

			// If no rank achieved, next is the lowest rank
			if (!currentRank && reqs.length > 0) {
				nextRank = reqs[0].rank.name;
				nextRankScore = reqs[0].minScore;
			}

			return {
				scenarioName: scenario.name,
				category: scenario.category,
				userHighScore: score > 0 ? score : null,
				currentRank,
				nextRank,
				nextRankScore,
			};
		});

		return {
			benchmarkName: benchmark.name,
			scenarios: resultScenarios,
		};
	}
}
