/**
 * HTTP エラー型定義
 */
export interface HttpError extends Error {
	status: number;
}

/**
 * 型ガード: HTTP エラーかどうかを判定
 * @param error - 検査対象のエラー
 * @returns HTTP ステータスコードを持つエラーの場合 true
 */
export function isHttpError(error: unknown): error is HttpError {
	return (
		error !== null &&
		error !== undefined &&
		typeof error === "object" &&
		"status" in error &&
		typeof (error as any).status === "number" &&
		(error as any).status > 0
	);
}

/**
 * エラーメッセージを抽出する
 * @param error - エラーオブジェクト
 * @returns エラーメッセージ文字列
 */
export function getErrorMessage(error: unknown): string {
	if (typeof error === "string") {
		return error;
	}

	if (error && typeof error === "object" && "message" in error) {
		return String(error.message);
	}

	return "エラーが発生しました";
}

/**
 * HTTP ステータスコードを取得する
 * @param error - エラーオブジェクト
 * @returns ステータスコード、存在しない場合は undefined
 */
export function getErrorStatus(error: unknown): number | undefined {
	if (isHttpError(error)) {
		return error.status;
	}
	return undefined;
}

/**
 * エラーをコンソールにログ出力する
 * @param error - エラーオブジェクト
 * @param context - エラーが発生したコンテキスト（コンポーネント名など）
 * @param additionalInfo - 追加のデバッグ情報
 */
export function logError(
	error: unknown,
	context?: string,
	additionalInfo?: Record<string, unknown>,
): void {
	const status = getErrorStatus(error);
	const prefix = context ? `[${context}]` : "";
	const statusInfo = status ? `HTTP ${status} ` : "";

	console.error(`${prefix} ${statusInfo}Error:`.trim(), error);

	if (additionalInfo) {
		console.error("Additional info:", additionalInfo);
	}
}
