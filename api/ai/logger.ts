/**
 * Structured logging utility for coach
 */
import { PinoLogger } from "@mastra/loggers";

// Export singleton logger instance
export const logger = new PinoLogger({
	name: "Mastra",
	level: process.env.NODE_ENV === "development" ? "debug" : "info",
});
