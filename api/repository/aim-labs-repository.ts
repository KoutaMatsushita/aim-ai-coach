import { format } from "@formkit/tempo";
import { and, count, eq, gte, like, lte, sql } from "drizzle-orm";
import { aimlabTaskTable, type DBType } from "../db";
import type { taskFilter } from "./task-filter.ts";

export interface MetricStats {
	count: number;
	p10: number;
	p25: number;
	p50: number;
	p75: number;
	p90: number;
	p99: number;
}

export interface TaskStatistics {
	taskName: string;
	date: string;
	score: MetricStats;
	accuracy: MetricStats;
}

export class AimLabsRepository {
	constructor(private readonly db: DBType) {}

	async findTasksByUserId(userId: string, taskFilter: taskFilter = {}) {
		const where = and(
			eq(aimlabTaskTable.userId, userId),
			taskFilter.startDate
				? gte(
						aimlabTaskTable.createDate,
						format(taskFilter.startDate, "YYYY-MM-DD"),
					)
				: undefined,
			taskFilter.endDate
				? lte(
						aimlabTaskTable.createDate,
						format(taskFilter.endDate, "YYYY-MM-DD"),
					)
				: undefined,
			taskFilter.scenarioName
				? like(aimlabTaskTable.taskName, `%${taskFilter.scenarioName}%`)
				: undefined,
		);

		const [data, total] = await Promise.all([
			this.db
				.select()
				.from(aimlabTaskTable)
				.where(where)
				.limit(taskFilter.limit || 100)
				.offset(taskFilter.offset || 0),
			this.db.select({ total: count() }).from(aimlabTaskTable).where(where),
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
			eq(aimlabTaskTable.userId, userId),
			options.startDate
				? gte(
						aimlabTaskTable.createDate,
						options.startDate.toISOString().replace("T", " ").substring(0, 19),
					)
				: undefined,
			options.endDate
				? lte(
						aimlabTaskTable.createDate,
						options.endDate.toISOString().replace("T", " ").substring(0, 19),
					)
				: undefined,
		);

		// Prepare date formatter for SQLite
		let dateFormat = "%Y-%m-%d";
		if (period === "month") {
			dateFormat = "%Y-%m";
		} else if (period === "week") {
			// Simple week emulation for SQLite: %Y-%W
			dateFormat = "%Y-W%W";
		}

		// Convert createDate (string) to date string
		// aimlabTaskTable.createDate is likely stored as a string (YYYY-MM-DD...) based on usage in sorting/filtering
		const dateExpr = sql<string>`strftime(${dateFormat}, ${aimlabTaskTable.createDate}, '+09:00')`;

		// 1. Fetch aggregated data directly from DB
		const groupedResults = await this.db
			.select({
				taskName: aimlabTaskTable.taskName,
				date: dateExpr,
				scoresStr: sql<string>`GROUP_CONCAT(${aimlabTaskTable.score})`,
				accuraciesStr: sql<string>`GROUP_CONCAT(json_extract(${aimlabTaskTable.performance}, '$.accTotal'))`,
			})
			.from(aimlabTaskTable)
			.where(whereClause)
			.groupBy(aimlabTaskTable.taskName, dateExpr);

		// 3. Calculate Percentiles from aggregated strings
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
			// Parse comma-separated strings back to number arrays
			// Filter out empty/null values
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

		// Sort by date desc, then task name
		return result.sort((a, b) => {
			if (a.date !== b.date) return b.date.localeCompare(a.date);
			return a.taskName.localeCompare(b.taskName);
		});
	}
}
