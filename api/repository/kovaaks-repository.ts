import { format } from "@formkit/tempo";
import { and, count, eq, gte, like, lte } from "drizzle-orm";
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

		const tasks = await this.db
			.select({
				scenarioName: kovaaksScoresTable.scenarioName,
				score: kovaaksScoresTable.score,
				sessionAccuracy: kovaaksScoresTable.sessionAccuracy,
				runEpochSec: kovaaksScoresTable.runEpochSec,
			})
			.from(kovaaksScoresTable)
			.where(whereClause);

		const groupedData = tasks.reduce(
			(acc, task) => {
				if (!task.scenarioName) return acc;

				const date = new Date(task.runEpochSec * 1000);
				const dateStr = this.formatPeriod(date, period);
				const key = `${task.scenarioName}::${dateStr}`;

				if (!acc[key]) {
					acc[key] = {
						taskName: task.scenarioName,
						date: dateStr,
						scores: [],
						accuracies: [],
					};
				}
				acc[key].scores.push(task.score);
				acc[key].accuracies.push(task.sessionAccuracy);

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
