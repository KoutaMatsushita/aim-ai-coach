import type { DBType } from "../db";

export class UserRepository {
	constructor(private readonly db: DBType) {}

	async findById(userId: string) {
		return this.db.query.users.findFirst({
			where: (users, { eq }) => eq(users.id, userId),
		});
	}
}
