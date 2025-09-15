import {LibSQLStore, LibSQLVector} from '@mastra/libsql';
import {getEnv} from '../env.ts';
import {logger} from '../logger.ts';

// Validate environment variables
const env = getEnv();

export const storage = new LibSQLStore({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
});

export const vector = new LibSQLVector({
    connectionUrl: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
});

logger.info('Mastra stores initialized');

export const VECTOR_STORE_NAME = 'AimAICoachVectorStore';
