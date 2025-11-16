import { and, count, eq, gte, like, lte } from "drizzle-orm";
import { type DBType, kovaaksScoresTable } from "../db";
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
}
