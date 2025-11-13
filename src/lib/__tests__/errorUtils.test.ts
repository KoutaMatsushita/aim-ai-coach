import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getErrorMessage,
	getErrorStatus,
	type HttpError,
	isHttpError,
	logError,
} from "../errorUtils";

describe("errorUtils", () => {
	describe("isHttpError", () => {
		it("HTTPエラーを正しく判定する", () => {
			const error = new Error("Test error");
			(error as HttpError).status = 404;

			expect(isHttpError(error)).toBe(true);
		});

		it("HTTPエラーでない場合はfalseを返す", () => {
			const error = new Error("Test error");

			expect(isHttpError(error)).toBe(false);
		});

		it("null/undefinedの場合はfalseを返す", () => {
			expect(isHttpError(null)).toBe(false);
			expect(isHttpError(undefined)).toBe(false);
		});

		it("文字列の場合はfalseを返す", () => {
			expect(isHttpError("error string")).toBe(false);
		});

		it("status=0の場合はfalseを返す", () => {
			const error = new Error("Test error");
			(error as any).status = 0;

			expect(isHttpError(error)).toBe(false);
		});
	});

	describe("getErrorMessage", () => {
		it("Errorオブジェクトからメッセージを抽出する", () => {
			const error = new Error("Custom error message");

			expect(getErrorMessage(error)).toBe("Custom error message");
		});

		it("文字列エラーをそのまま返す", () => {
			expect(getErrorMessage("String error")).toBe("String error");
		});

		it("メッセージがない場合はデフォルトメッセージを返す", () => {
			expect(getErrorMessage({})).toBe("エラーが発生しました");
		});

		it("nullの場合はデフォルトメッセージを返す", () => {
			expect(getErrorMessage(null)).toBe("エラーが発生しました");
		});

		it("undefinedの場合はデフォルトメッセージを返す", () => {
			expect(getErrorMessage(undefined)).toBe("エラーが発生しました");
		});
	});

	describe("getErrorStatus", () => {
		it("HTTPエラーのstatusコードを取得する", () => {
			const error = new Error("Test error");
			(error as HttpError).status = 404;

			expect(getErrorStatus(error)).toBe(404);
		});

		it("statusがない場合はundefinedを返す", () => {
			const error = new Error("Test error");

			expect(getErrorStatus(error)).toBeUndefined();
		});

		it("文字列エラーの場合はundefinedを返す", () => {
			expect(getErrorStatus("error")).toBeUndefined();
		});

		it("null/undefinedの場合はundefinedを返す", () => {
			expect(getErrorStatus(null)).toBeUndefined();
			expect(getErrorStatus(undefined)).toBeUndefined();
		});
	});

	describe("logError", () => {
		let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		});

		afterEach(() => {
			consoleErrorSpy.mockRestore();
		});

		it("エラーをconsole.errorでログ出力する", () => {
			const error = new Error("Test error");

			logError(error, "TestComponent");

			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"[TestComponent] Error:",
				error,
			);
		});

		it("HTTPステータスコードを含むエラーをログ出力する", () => {
			const error = new Error("HTTP error");
			(error as HttpError).status = 500;

			logError(error, "APIComponent");

			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"[APIComponent] HTTP 500 Error:",
				error,
			);
		});

		it("コンテキストなしでエラーをログ出力できる", () => {
			const error = new Error("Test error");

			logError(error);

			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
			expect(consoleErrorSpy).toHaveBeenCalledWith("Error:", error);
		});

		it("文字列エラーをログ出力できる", () => {
			logError("String error message", "TestContext");

			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"[TestContext] Error:",
				"String error message",
			);
		});

		it("追加情報を含めてログ出力できる", () => {
			const error = new Error("Test error");
			const additionalInfo = { userId: "test-123", action: "fetch-data" };

			logError(error, "DataFetcher", additionalInfo);

			expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
			expect(consoleErrorSpy).toHaveBeenNthCalledWith(
				1,
				"[DataFetcher] Error:",
				error,
			);
			expect(consoleErrorSpy).toHaveBeenNthCalledWith(
				2,
				"Additional info:",
				additionalInfo,
			);
		});
	});
});
