import { Database } from "bun:sqlite";
import { localCompleteAimlabTask } from "api/db";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { taskData } from "../../local-aimlab-schema/schema";
import type { User } from "../auth";
import type { ClientType } from "../index";
import { getDB } from "../local-db.ts";
import { logger } from "../logger.ts";
import { chunkArray, findFirstWithExt } from "../util.ts";

export const uploadAimlab = async (
	path: string,
	apiClient: ClientType,
	user: User,
	force = false,
) => {
	try {
		logger.info("Starting Aimlab data upload", {
			path,
			userId: user.id,
			force,
		});

		const dbPath = await findFirstWithExt(path, ".bytes");
		if (!dbPath) {
			throw new Error("No .bytes file found in the specified path");
		}

		logger.info("Found Aimlab database file", { dbPath });

		const client = new Database(dbPath, { readonly: true });
		const aimlabDB = drizzle({
			client,
			schema: { taskData },
		});

		const localDB = await getDB();

		// 既に処理されたタスクIDを取得 (force=true の場合は空配列)
		let completedTaskIds: number[] = [];
		if (!force) {
			completedTaskIds = await localDB.query.localCompleteAimlabTask
				.findMany({
					columns: {
						taskId: true,
					},
				})
				.then((r) => r.map((r) => r.taskId));
		}

		logger.info("Checking for new tasks", {
			completedTasksCount: completedTaskIds.length,
			force,
		});

		// アップロードする新しいタスクを特定
		const uploadTasks = await aimlabDB.query.taskData
			.findMany({
				where: (t, { notInArray }) =>
					completedTaskIds.length > 0
						? notInArray(t.taskId, completedTaskIds)
						: undefined,
			})
			.then((r) =>
				r.map((t) => ({
					...t,
					discordUserId: user.id,
				})),
			);

		if (uploadTasks.length === 0) {
			logger.info("No new Aimlab tasks to upload");
			return;
		}

		logger.info("Uploading new Aimlab tasks", {
			taskCount: uploadTasks.length,
		});

		// タスクをチャンク単位でアップロード
		const chunks = chunkArray(uploadTasks, 100);
		let uploadedChunks = 0;

		for (const chunked of chunks) {
			try {
				chunked.forEach((c) =>
					logger.info("chunked", { taskId: c.taskId, startAt: c.startedAt }),
				);
				const response = await apiClient.api.aimlabs.$post({ json: chunked });
				if (response.ok) {
					uploadedChunks++;
					logger.info("Chunk uploaded successfully", {
						progress: `${uploadedChunks}/${chunks.length}`,
						taskCount: chunked.length,
					});
				} else {
					throw await response.text();
				}
			} catch (error) {
				logger.error("Failed to upload Aimlab chunk", {
					chunkIndex: uploadedChunks,
					error,
				});
				throw error;
			}
		}

		// タスクを処理済みとしてマーク
		await localDB
			.insert(localCompleteAimlabTask)
			.values(uploadTasks.map((t) => ({ taskId: t.taskId })))
			.onConflictDoNothing();

		logger.info("Aimlab upload completed successfully", {
			tasksUploaded: uploadTasks.length,
			chunksUploaded: uploadedChunks,
		});

		// データベース接続を閉じる
		client.close();
	} catch (error) {
		logger.error("Aimlab upload failed", error);
		throw error;
	}
};
