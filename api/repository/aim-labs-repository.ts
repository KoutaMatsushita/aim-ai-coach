import { format } from "@formkit/tempo";
import { and, count, eq, gte, like, lte } from "drizzle-orm";
import { aimlabTaskTable, type DBType } from "../db";
import type { taskFilter } from "./task-filter.ts";

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
}
