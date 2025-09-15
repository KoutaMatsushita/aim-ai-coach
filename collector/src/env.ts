/**
 * Environment variable validation and configuration
 */

type RequiredEnvVar = {
    name: string;
    description: string;
};

const requiredEnvVars: RequiredEnvVar[] = [
    { name: 'DISCORD_CLIENT_ID', description: 'Discord OAuth2 client ID' },
    { name: 'DISCORD_CLIENT_SECRET', description: 'Discord OAuth2 client secret' }
];

class EnvValidationError extends Error {
    constructor(missingVars: string[]) {
        const message = `Missing required environment variables: ${missingVars.join(', ')}\n` +
            'Please set these variables in your .env file or environment.';
        super(message);
        this.name = 'EnvValidationError';
    }
}

/**
 * Validates all required environment variables are present
 * @throws {EnvValidationError} When required variables are missing
 */
export function validateEnv(): void {
    const missingVars = requiredEnvVars
        .filter(({ name }) => !process.env[name])
        .map(({ name }) => name);

    if (missingVars.length > 0) {
        throw new EnvValidationError(missingVars);
    }
}

/**
 * Get validated environment variables
 */
export function getEnv() {
    validateEnv();

    return {
        DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID!,
        DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET!,
    } as const;
}