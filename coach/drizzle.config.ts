import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { getEnv } from './src/env';

// Validate environment variables
const env = getEnv();

export default defineConfig({
    out: './drizzle',
    schema: './src/db/schema.ts',
    dialect: 'turso',
    dbCredentials: {
        url: env.TURSO_DATABASE_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    },
});
