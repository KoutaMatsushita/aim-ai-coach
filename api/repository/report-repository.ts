import { addDay, addHour, format } from "@formkit/tempo";
import { and, eq, gte } from "drizzle-orm";
import {
	type DBType,
	dailyReportTable,
	monthlyReportTable,
	weeklyReportTable,
} from "../db";

export class ReportRepository {
	constructor(private readonly db: DBType) {}

	async getRecentDailyReport(userId: string) {
		return this.db
			.select()
			.from(dailyReportTable)
			.where(
				and(
					eq(dailyReportTable.userId, userId),
					gte(
						dailyReportTable.createdAt,
						format(addHour(new Date(), -12), "YYYY-MM-DD"),
					),
				),
			)
			.orderBy(dailyReportTable.createdAt);
	}

	async saveDailyReport(userId: string, report: string) {
		return this.db.insert(dailyReportTable).values([{ userId, report }]);
	}

	async getRecentWeeklyReport(userId: string) {
		return this.db
			.select()
			.from(weeklyReportTable)
			.where(
				and(
					eq(weeklyReportTable.userId, userId),
					gte(
						weeklyReportTable.createdAt,
						format(addDay(new Date(), -3), "YYYY-MM-DD"),
					),
				),
			)
			.orderBy(weeklyReportTable.createdAt);
	}

	async saveWeeklyReport(userId: string, report: string) {
		return this.db.insert(weeklyReportTable).values([{ userId, report }]);
	}

	async getRecentMonthlyReport(userId: string) {
		return this.db
			.select()
			.from(monthlyReportTable)
			.where(
				and(
					eq(monthlyReportTable.userId, userId),
					gte(
						monthlyReportTable.createdAt,
						format(addDay(new Date(), -10), "YYYY-MM-DD"),
					),
				),
			)
			.orderBy(monthlyReportTable.createdAt);
	}

	async saveMonthlyReport(userId: string, report: string) {
		return this.db.insert(monthlyReportTable).values([{ userId, report }]);
	}
}
