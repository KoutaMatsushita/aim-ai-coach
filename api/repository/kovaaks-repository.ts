import { and, count, eq, gte, like, lte, sql } from "drizzle-orm";
import { type DBType, kovaaksScoresTable } from "../db";
import type { MetricStats, TaskStatistics } from "./aim-labs-repository";
import type { taskFilter } from "./task-filter.ts";

export class KovaaksRepository {
	constructor(private readonly db: DBType) {}

	async findTasksByUserId(userId: string, taskFilter: taskFilter = {}) {
		const where = and(
			eq(kovaaksScoresTable.userId, userId),
			taskFilter.startDate
				? gte(
						kovaaksScoresTable.runEpochSec,
						taskFilter.startDate.getTime() / 1000,
					)
				: undefined,
			taskFilter.endDate
				? lte(
						kovaaksScoresTable.runEpochSec,
						taskFilter.endDate.getTime() / 1000,
					)
				: undefined,
			taskFilter.scenarioName
				? like(kovaaksScoresTable.scenarioName, `%${taskFilter.scenarioName}%`)
				: undefined,
		);

		const [data, total] = await Promise.all([
			this.db
				.select()
				.from(kovaaksScoresTable)
				.where(where)
				.limit(taskFilter.limit || 100)
				.offset(taskFilter.offset || 0),
			this.db.select({ total: count() }).from(kovaaksScoresTable).where(where),
		]);

		return {
			data,
			...total[0],
		};
	}
	async getTaskStatistics(
		userId: string,
		period: "day" | "week" | "month" = "day",
		options: { startDate?: Date; endDate?: Date } = {},
	): Promise<TaskStatistics[]> {
		const whereClause = and(
			eq(kovaaksScoresTable.userId, userId),
			options.startDate
				? gte(
						kovaaksScoresTable.runEpochSec,
						options.startDate.getTime() / 1000,
					)
				: undefined,
			options.endDate
				? lte(kovaaksScoresTable.runEpochSec, options.endDate.getTime() / 1000)
				: undefined,
		);

		// Prepare date formatter for SQLite
		let dateFormat = "%Y-%m-%d";
		if (period === "month") {
			dateFormat = "%Y-%m";
		} else if (period === "week") {
			dateFormat = "%Y-W%W";
		}

		const dateExpr = sql<string>`strftime(${dateFormat}, ${kovaaksScoresTable.runEpochSec}, 'unixepoch')`;

		const groupedResults = await this.db
			.select({
				taskName: kovaaksScoresTable.scenarioName,
				date: dateExpr,
				scoresStr: sql<string>`GROUP_CONCAT(${kovaaksScoresTable.score})`,
				accuraciesStr: sql<string>`GROUP_CONCAT(${kovaaksScoresTable.sessionAccuracy})`,
			})
			.from(kovaaksScoresTable)
			.where(whereClause)
			.groupBy(kovaaksScoresTable.scenarioName, dateExpr);

		const calculateStats = (values: number[]): MetricStats => {
			const sorted = values.sort((a, b) => a - b);
			const percentiles = [10, 25, 50, 75, 90, 99];
			const result: Partial<MetricStats> = {
				count: sorted.length,
			};

			percentiles.forEach((p) => {
				if (sorted.length === 0) {
					// @ts-ignore
					result[`p${p}`] = 0;
					return;
				}
				const index = Math.ceil((p / 100) * sorted.length) - 1;
				// @ts-ignore
				result[`p${p}`] = sorted[Math.max(0, index)];
			});
			return result as MetricStats;
		};

		const result: TaskStatistics[] = groupedResults.map((group) => {
			const scores = group.scoresStr
				? group.scoresStr
						.split(",")
						.map((s) => Number(s))
						.filter((n) => !isNaN(n))
				: [];
			const accuracies = group.accuraciesStr
				? group.accuraciesStr
						.split(",")
						.map((s) => Number(s))
						.filter((n) => !isNaN(n))
				: [];

			return {
				taskName: group.taskName || "Unknown",
				date: group.date,
				score: calculateStats(scores),
				accuracy: calculateStats(accuracies),
			};
		});

		return result.sort((a, b) => {
			if (a.date !== b.date) return b.date.localeCompare(a.date);
			return a.taskName.localeCompare(b.taskName);
		});
	}

}
