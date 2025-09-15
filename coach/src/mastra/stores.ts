import {LibSQLStore, LibSQLVector} from '@mastra/libsql';

export const storage = new LibSQLStore({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const vector = new LibSQLVector({
    connectionUrl: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const VECTOR_STORE_NAME = 'AimAICoachVectorStore';
