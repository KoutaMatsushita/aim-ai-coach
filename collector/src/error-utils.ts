/**
 * Type-safe error handling utilities
 */

/**
 * Convert unknown error to Error instance
 * @param error Unknown error value from catch clause
 * @returns Error instance
 */
export function toError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	// Handle string errors
	if (typeof error === "string") {
		return new Error(error);
	}

	// Handle objects with message property
	if (error && typeof error === "object" && "message" in error) {
		return new Error(String(error.message));
	}

	// Fallback for any other type
	return new Error(`Unknown error: ${String(error)}`);
}


/**
 * Extract error message safely from unknown error
 * @param error Unknown error value
 * @returns Error message string
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
 * Create a structured error with additional context
 * @param message Primary error message
 * @param originalError Original error from catch clause
 * @param context Additional context data
 * @returns Structured error object
 */
export function createStructuredError(
	message: string,
	originalError: unknown,
	context?: Record<string, unknown>
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
