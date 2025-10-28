import type { InferUITool } from "ai";
import type {
	addTextFileKnowledgeTool,
	addTextKnowledgeTool,
	addYoutubeContentTool,
} from "./rag-tool";
import type {
	findAimlabTasksByUserId,
	findKovaaksScoresByUserId,
	findUser,
	getAimlabStatsByUserId,
	getKovaaksStatsByUserId,
} from "./user-tool";

export type FindUserType = InferUITool<typeof findUser>;
export type FindKovaaksScoresByUserIdType = InferUITool<
	typeof findKovaaksScoresByUserId
>;
export type FindAimlabTasksByUserIdType = InferUITool<
	typeof findAimlabTasksByUserId
>;
export type GetKovaaksStatsByUserIdType = InferUITool<
	typeof getKovaaksStatsByUserId
>;
export type GetAimlabStatsByUserIdType = InferUITool<
	typeof getAimlabStatsByUserId
>;

export type AddYoutubeContentToolType = InferUITool<
	typeof addYoutubeContentTool
>;
export type AddTextFileKnowledgeToolType = InferUITool<
	typeof addTextFileKnowledgeTool
>;
export type AddTextKnowledgeToolType = InferUITool<typeof addTextKnowledgeTool>;
