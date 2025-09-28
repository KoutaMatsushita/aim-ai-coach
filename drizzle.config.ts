import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
    driver: "d1-http",
    schema: "./api/db/schema.ts",
	out: "./migration",
	dbCredentials: {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
        token: process.env.CLOUDFLARE_API_TOKEN!,
    },
	verbose: true,
	strict: true,
});
