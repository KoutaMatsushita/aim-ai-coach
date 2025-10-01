import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { localCompleteAimlabTask, localCompleteKovaaksScore } from "api/db";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { appName } from "./config.ts";

function getAppDataDir() {
	if (process.platform === "darwin") {
		return join(homedir(), "Library", "Application Support", appName);
	}
	if (process.platform === "win32") {
		return join(
			process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
			appName,
		);
	}
	// Linux / その他
	const xdg = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
	return join(xdg, appName);
}

export async function getDbPath() {
	const dir = getAppDataDir();
	await mkdir(dir, { recursive: true });
	return join(dir, "data.sqlite");
}

export const getDB = async () => {
	const dbPath = await getDbPath();
	const client = new Database(dbPath);
	const db = drizzle({
		client,
		schema: {
			localCompleteKovaaksScore,
			localCompleteAimlabTask,
		},
	});
	const drizzlePath = join(__dirname, "..", "drizzle");
    console.log(drizzlePath);
	await migrate(db, { migrationsFolder: drizzlePath });
	return db;
};
