import {Mastra} from "@mastra/core/mastra";
import {createAimAiCoachAgent} from "./agents/aim-ai-coach-agent";
import {logger} from "./logger";
import {MastraVector} from "@mastra/core/vector";
import {MastraStorage} from "@mastra/core/storage";

export const createMastra = (
    storage: MastraStorage,
    vector: MastraVector,
) => new Mastra({
    agents: {aimAiCoachAgent: createAimAiCoachAgent(storage, vector)},
    storage: storage,
    logger: logger,
    vectors: {
        vector,
    },
    telemetry: {
        enabled: process.env.NODE_ENV === "production",
    },
    // server: {
    // 	apiRoutes: [
    // 		registerApiRoute("/chat/:agentId", {
    // 			method: "POST",
    // 			handler: async (c) => {
    // 				try {
    // 					const { messages, resource, thread } = await c.req.json();
    // 					if (!resource) {
    // 						return c.json("required resource", 400);
    // 					}
    // 					if (!thread) {
    // 						return c.json("required thread", 400);
    // 					}
    //
    // 					const mastra = c.get("mastra");
    // 					const agentId = c.req.param("agentId");
    // 					const agentObj = mastra.getAgent(agentId);
    // 					if (!agentObj) {
    // 						throw new Error(`Agent ${agentId} not found`);
    // 					}
    //
    // 					const result = await agentObj.streamVNext(messages, {
    // 						format: "aisdk",
    // 						memory: {
    // 							resource,
    // 							thread,
    // 						},
    // 						runtimeContext: new RuntimeContext([["discordId", resource]]),
    // 					});
    //
    // 					return result.toUIMessageStreamResponse();
    // 				} catch (e) {
    // 					if (e instanceof Error) {
    // 						logger.error("error", e);
    // 						return c.json(e, 500);
    // 					} else {
    // 						logger.error(`error: ${JSON.stringify(e)}`);
    // 						return c.json({ error: "unknown error" }, 500);
    // 					}
    // 				}
    // 			},
    // 		}),
    // 		chatRoute({
    // 			path: "/chat/aim-ai-coach-agent",
    // 			agent: "aimAiCoachAgent",
    // 		}),
    // 		registerApiRoute("/users/:userId/kovaaks", {
    // 			method: "POST",
    // 			handler: async (c) => {
    // 				try {
    // 					const userId = c.req.param("userId");
    // 					const user = await db
    // 						.select()
    // 						.from(userDiscordView)
    // 						.where(or(eq(userDiscordView.discordId, userId), eq(userDiscordView.userId, userId)))
    // 						.limit(1)
    // 						.then((result) => result[0]);
    //
    // 					if (!user) return c.json({ error: "user not found" }, 404);
    //
    // 					const result = z.array(KovaaksScoreInsertSchema).safeParse(await c.req.json());
    // 					if (!result.success) {
    // 						return c.json(result.error, 400);
    // 					}
    //
    // 					return c.json(
    // 						await db
    // 							.insert(kovaaksScores)
    // 							.values(result.data)
    // 							.onConflictDoNothing()
    // 							.returning()
    // 					);
    // 				} catch (e) {
    // 					if (e instanceof Error) {
    // 						logger.error("error", e);
    // 						return c.json(e, 500);
    // 					} else {
    // 						logger.error(`error: ${JSON.stringify(e)}`);
    // 						return c.json({ error: "unknown error" }, 500);
    // 					}
    // 				}
    // 			},
    // 		}),
    // 		registerApiRoute("/users/:userId/aimlab", {
    // 			method: "POST",
    // 			handler: async (c) => {
    // 				try {
    // 					const userId = c.req.param("userId");
    // 					const user = await db
    // 						.select()
    // 						.from(userDiscordView)
    // 						.where(or(eq(userDiscordView.discordId, userId), eq(userDiscordView.userId, userId)))
    // 						.limit(1)
    // 						.then((result) => result[0]);
    //
    // 					if (!user) return c.json({ error: "user not found" }, 404);
    //
    // 					const result = z
    // 						.array(
    // 							AimlabTaskInsertSchema.extend({
    // 								startedAt: z.coerce.date(),
    // 								endedAt: z.coerce.date(),
    // 							})
    // 						)
    // 						.safeParse(await c.req.json());
    // 					if (!result.success) {
    // 						return c.json(result.error, 400);
    // 					}
    //
    // 					return c.json(
    // 						await db
    // 							.insert(aimlabTasks)
    // 							.values(result.data)
    // 							.onConflictDoNothing()
    // 							.returning()
    // 					);
    // 				} catch (e) {
    // 					if (e instanceof Error) {
    // 						logger.error("error", e);
    // 						return c.json(e, 500);
    // 					} else {
    // 						logger.error(`error: ${JSON.stringify(e)}`);
    // 						return c.json({ error: "unknown error" }, 500);
    // 					}
    // 				}
    // 			},
    // 		}),
    // 		registerApiRoute("/upload/text", {
    // 			method: "POST",
    // 			handler: async (c) => {
    // 				try {
    // 					const formData = await c.req.formData();
    // 					const file = formData.get("file") as File;
    // 					const title = formData.get("title") as string;
    // 					const category = formData.get("category") as string;
    // 					const difficultyLevel = formData.get("difficultyLevel") as string;
    //
    // 					if (!file) {
    // 						return c.json({ error: "ファイルが選択されていません" }, 400);
    // 					}
    //
    // 					if (!title) {
    // 						return c.json({ error: "タイトルが入力されていません" }, 400);
    // 					}
    //
    // 					// ファイルの形式チェック
    // 					if (!file.name.endsWith(".txt")) {
    // 						return c.json({ error: "txtファイルのみアップロード可能です" }, 400);
    // 					}
    //
    // 					// ファイルサイズチェック（10MB上限）
    // 					if (file.size > 10 * 1024 * 1024) {
    // 						return c.json({ error: "ファイルサイズは10MB以下にしてください" }, 400);
    // 					}
    //
    // 					// ファイル内容を読み取り
    // 					const fileContent = await file.text();
    //
    // 					if (!fileContent.trim()) {
    // 						return c.json({ error: "ファイルが空です" }, 400);
    // 					}
    //
    // 					// 一時ファイルに保存
    // 					const tempFilePath = join(tmpdir(), `upload-${Date.now()}-${file.name}`);
    // 					await writeFile(tempFilePath, fileContent, "utf-8");
    //
    // 					try {
    // 						const runtimeContext = new RuntimeContext();
    //
    // 						// 既存のツールを使用してナレッジを追加
    // 						const result = await addTextFileKnowledgeLibSQL.execute({
    // 							context: {
    // 								filePath: tempFilePath,
    // 								title,
    // 								category: category || "uploaded",
    // 								difficultyLevel:
    // 									(difficultyLevel as "beginner" | "intermediate" | "advanced" | "expert") ||
    // 									undefined,
    // 								forceOverwrite: false,
    // 							},
    // 							runtimeContext,
    // 						});
    //
    // 						// 一時ファイルを削除
    // 						await unlink(tempFilePath);
    //
    // 						if (result.success) {
    // 							return c.json({
    // 								success: true,
    // 								message: result.message,
    // 								analysis: result.analysis,
    // 							});
    // 						} else {
    // 							return c.json({ error: result.error }, 500);
    // 						}
    // 					} catch (toolError) {
    // 						// 一時ファイル削除（エラー時も確実に）
    // 						try {
    // 							await unlink(tempFilePath);
    // 						} catch {
    // 							// ファイル削除エラーは無視
    // 						}
    // 						throw toolError;
    // 					}
    // 				} catch (e) {
    // 					if (e instanceof Error) {
    // 						c.var.mastra.getLogger().error("ファイルアップロードエラー", e);
    // 						return c.json({ error: e.message }, 500);
    // 					} else {
    // 						c.var.mastra.getLogger().error(`ファイルアップロードエラー: ${JSON.stringify(e)}`);
    // 						return c.json({ error: "アップロード処理でエラーが発生しました" }, 500);
    // 					}
    // 				}
    // 			},
    // 		}),
    // 	],
    // },
});
