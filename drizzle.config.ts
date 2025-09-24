import { defineConfig } from "drizzle-kit";

// 環境変数の取得を内部で実装
function getRequiredEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Required environment variable ${key} is not set`);
	}
	return value;
}

export default defineConfig({
	dialect: "turso",
	schema: "./src/schema.ts",
	out: "./drizzle",
	dbCredentials: {
		url: getRequiredEnv("TURSO_DATABASE_URL"),
		authToken: getRequiredEnv("TURSO_AUTH_TOKEN"),
	},
	verbose: true,
	strict: true,
});
