/**
 * 環境変数の検証と設定
 */

type RequiredEnvVar = {
	name: string;
	description: string;
};

const requiredEnvVars: RequiredEnvVar[] = [
	{ name: "DISCORD_CLIENT_ID", description: "Discord OAuth2 client ID" },
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
 * 必要な環境変数がすべて存在することを検証
 * @throws {EnvValidationError} 必要な変数が異失している場合
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
 * PKCE認証用の検証済み環境変数を取得
 */
export function getEnv() {
	validateEnv();

	return {
		DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID!,
	} as const;
}
