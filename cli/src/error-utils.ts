/**
 * 型安全エラー処理ユーティリティ
 */

/**
 * 未知のエラーをErrorインスタンスに変換
 * @param error catch文からの未知のエラー値
 * @returns Errorインスタンス
 */
export function toError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	// 文字列エラーを処理
	if (typeof error === "string") {
		return new Error(error);
	}

	// messageプロパティを持つオブジェクトを処理
	if (error && typeof error === "object" && "message" in error) {
		return new Error(String(error.message));
	}

	// その他の型のフォールバック
	return new Error(`Unknown error: ${String(error)}`);
}

/**
 * 未知のエラーから安全にエラーメッセージを抽出
 * @param error 未知のエラー値
 * @returns エラーメッセージ文字列
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === "string") {
		return error;
	}

	if (error && typeof error === "object" && "message" in error) {
		return String(error.message);
	}

	return String(error);
}

/**
 * 追加のコンテキストを持つ構造化エラーを作成
 * @param message メインエラーメッセージ
 * @param originalError catch文からの元のエラー
 * @param context 追加のコンテキストデータ
 * @returns 構造化エラーオブジェクト
 */
export function createStructuredError(
	message: string,
	originalError: unknown,
	context?: Record<string, unknown>,
): Error & { originalError: unknown; context?: Record<string, unknown> } {
	const error = new Error(message) as Error & {
		originalError: unknown;
		context?: Record<string, unknown>;
	};

	error.originalError = originalError;
	if (context) {
		error.context = context;
	}

	return error;
}
