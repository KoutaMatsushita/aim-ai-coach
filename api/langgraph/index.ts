/**
 * LangGraph Entry Point
 * Main coaching system initialization
 */

import type { MastraVector } from "@mastra/core/vector";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { ChatGraphService } from "./graphs/chat-graph";
import { TaskGraphService } from "./graphs/task-graph";

/**
 * LangGraph Coaching System
 * Phase 4: Chat Graph を使用した会話システム
 * Task 10: Task Graph Service を追加
 */
export function createCoachingGraph(
	vectorStore: MastraVector,
	db: DrizzleD1Database<any>,
) {
	// Create Chat Graph Service
	const chatGraphService = new ChatGraphService(vectorStore, db);

	// Create Task Graph Service (Task 10 用)
	const taskGraphService = new TaskGraphService(vectorStore, db);

	// Return service methods
	// Note: MemorySaver is for development. Production should use persistent storage.
	return {
		chatGraphService,
		taskGraphService,
		/**
		 * Invoke the graph execution (non-streaming)
		 * For endpoints like daily-report that need complete response
		 */
		async invoke(
			userId: string,
			messages: Array<{ role: string; content: string }>,
			options?: {
				threadId?: string;
				configurable?: Record<string, unknown>;
			},
		) {
			// Delegate to Chat Graph Service
			return chatGraphService.invoke(userId, messages, options);
		},

		/**
		 * Stream the graph execution
		 * Task 9.1: POST /api/chat でのストリーミング応答
		 */
		async *stream(
			userId: string,
			messages: Array<{ role: string; content: string }>,
			options?: {
				threadId?: string;
				configurable?: Record<string, unknown>;
			},
		) {
			// Delegate to Chat Graph Service
			const stream = chatGraphService.stream(userId, messages, options);

			for await (const chunk of stream) {
				yield chunk;
			}
		},

		/**
		 * Get conversation history from checkpointer
		 * Task 9.2: GET /api/chat/history での会話履歴取得
		 */
		async getMessages(
			userId: string,
			options?: {
				threadId?: string;
			},
		) {
			// Delegate to Chat Graph Service
			return chatGraphService.getMessages(userId, options);
		},
	};
}

// Export types
export type { CoachingPhase, GraphState, Playlist } from "./types";
