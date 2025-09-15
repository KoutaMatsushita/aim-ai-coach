/**
 * Environment variable validation and configuration for coach
 */

type RequiredEnvVar = {
	name: string;
	description: string;
};

const requiredEnvVars: RequiredEnvVar[] = [
	{ name: "TURSO_DATABASE_URL", description: "Turso database connection URL" },
	{
		name: "TURSO_AUTH_TOKEN",
		description: "Turso database authentication token",
	},
];

class EnvValidationError extends Error {
	constructor(missingVars: string[]) {
		const message =
			`Missing required environment variables: ${missingVars.join(", ")}\n` +
			"Please set these variables in your .env file or environment.";
		super(message);
		this.name = "EnvValidationError";
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
		TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL!,
		TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN!,
	} as const;
}
