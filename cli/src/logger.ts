/**
 * 構造化ログユーティリティ
 */

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

interface LogEntry {
	timestamp: string;
	level: keyof typeof LogLevel;
	message: string;
	data?: Record<string, unknown>;
}

class Logger {
	private currentLevel: LogLevel;

	constructor(level: LogLevel = LogLevel.INFO) {
		this.currentLevel = level;
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.currentLevel;
	}

	private formatLog(
		level: keyof typeof LogLevel,
		message: string,
		data?: Record<string, unknown>,
	): string {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			...(data && { data }),
		};

		return JSON.stringify(entry);
	}

	private log(
		level: LogLevel,
		levelName: keyof typeof LogLevel,
		message: string,
		data?: Record<string, unknown>,
	): void {
		if (!this.shouldLog(level)) return;

		const logMessage = this.formatLog(levelName, message, data);

		switch (level) {
			case LogLevel.ERROR:
				console.error(logMessage);
				break;
			case LogLevel.WARN:
				console.warn(logMessage);
				break;
			case LogLevel.DEBUG:
				console.debug(logMessage);
				break;
			default:
				console.log(logMessage);
		}
	}

	debug(message: string, data?: Record<string, unknown>): void {
		this.log(LogLevel.DEBUG, "DEBUG", message, data);
	}

	info(message: string, data?: Record<string, unknown>): void {
		this.log(LogLevel.INFO, "INFO", message, data);
	}

	warn(message: string, data?: Record<string, unknown>): void {
		this.log(LogLevel.WARN, "WARN", message, data);
	}

	error(message: string, error?: unknown): void {
		const data = this.processError(error);
		this.log(LogLevel.ERROR, "ERROR", message, data);
	}

	/**
	 * 未知のエラー値をロガー対応フォーマットに変換
	 * @param error catch文またはユーザー入力からの未知のエラー値
	 * @returns ログ記録用の構造化エラーデータ
	 */
	private processError(error: unknown): Record<string, unknown> | undefined {
		if (error === undefined || error === null) {
			return undefined;
		}

		// スタックトレース付きのErrorインスタンスを処理
		if (error instanceof Error) {
			return {
				error: error.message,
				stack: error.stack,
				name: error.name,
			};
		}

		// 構造化オブジェクトを処理
		if (error && typeof error === "object") {
			return error as Record<string, unknown>;
		}

		// プリミティブ型を処理
		if (typeof error === "string") {
			return { error: error };
		}

		// その他の型のフォールバック
		return { error: String(error) };
	}

	setLevel(level: LogLevel): void {
		this.currentLevel = level;
	}
}

// シングルトンロガーインスタンスをエクスポート
export const logger = new Logger(
	process.env.NODE_ENV === "development" ? LogLevel.DEBUG : LogLevel.INFO,
);
