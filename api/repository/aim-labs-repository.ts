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
						format(options.startDate, "YYYY-MM-DD"),
					)
				: undefined,
			options.endDate
				? lte(aimlabTaskTable.createDate, format(options.endDate, "YYYY-MM-DD"))
				: undefined,
		);


		// 1. Fetch all data for the user with optimized query using json_extract
		const tasks = await this.db
			.select({
				taskName: aimlabTaskTable.taskName,
				score: aimlabTaskTable.score,
				// Extract accTotal directly from JSON in DB to avoid transferring huge strings
				accTotal: sql<number>`json_extract(${aimlabTaskTable.performance}, '$.accTotal')`,
				createDate: aimlabTaskTable.createDate,
			})
			.from(aimlabTaskTable)
			.where(whereClause);

		// 2. Group by Task Name and Period
		const groupedData = tasks.reduce(
			(acc, task) => {
				if (!task.taskName || task.score === null || !task.createDate)
					return acc;

				const date = new Date(task.createDate);
				const dateStr = this.formatPeriod(date, period);
				const key = `${task.taskName}::${dateStr}`;

				if (!acc[key]) {
					acc[key] = {
						taskName: task.taskName,
						date: dateStr,
						scores: [],
						accuracies: [],
					};
				}
				acc[key].scores.push(task.score);

				if (task.accTotal !== null && task.accTotal !== undefined) {
					acc[key].accuracies.push(Number(task.accTotal));
				}

				return acc;
			},
			{} as Record<
				string,
				{
					taskName: string;
					date: string;
					scores: number[];
					accuracies: number[];
				}
			>,
		);

		// 3. Calculate Percentiles
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

		const result: TaskStatistics[] = Object.values(groupedData).map((group) => {
			return {
				taskName: group.taskName,
				date: group.date,
				score: calculateStats(group.scores),
				accuracy: calculateStats(group.accuracies),
			};
		});

		// Sort by date desc, then task name
		return result.sort((a, b) => {
			if (a.date !== b.date) return b.date.localeCompare(a.date);
			return a.taskName.localeCompare(b.taskName);
		});
	}

	private formatPeriod(date: Date, period: "day" | "week" | "month"): string {
		switch (period) {
			case "day":
				return format(date, "YYYY-MM-DD");
			case "week": {
				// ISO week format: YYYY-Wxx
				const d = new Date(date);
				d.setHours(0, 0, 0, 0);
				d.setDate(d.getDate() + 4 - (d.getDay() || 7));
				const yearStart = new Date(d.getFullYear(), 0, 1);
				const weekNo = Math.ceil(
					((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
				);
				return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
			}
			case "month":
				return format(date, "YYYY-MM");
			default:
				return format(date, "YYYY-MM-DD");
		}
	}
}
