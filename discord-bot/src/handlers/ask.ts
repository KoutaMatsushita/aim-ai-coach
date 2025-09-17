import { MastraClient } from "@mastra/client-js";
import { Command, Option } from "discord-hono";
import { factory } from "../init.js";

export const askCommand = factory.command(
	new Command("ask", "Ask aim ai Coach").options(
		new Option("message", "ask for ai message").required()
	),
	(c) => {
		const client = new MastraClient({
			baseUrl: c.env.MASTRA_BASE_URL,
		});

		const agent = client.getAgent("aimAiCoachAgent");

		const user = c.interaction.user || c.interaction.member?.user || c.interaction.message?.author;
		if (!user) {
			return c.res("User not found");
		}

		const message = c.var.message;
		if (!message) {
			return c.res("Message not found");
		}

		return c.resDefer(async (c) => {
			try {
				console.log(user);

				await c.followup("🤖 生成中...");

				console.log(user);

				const response = await agent.generateVNext({
					messages: [
						{
							role: "user",
							content: message,
						},
					],
					threadId: user.id,
					resourceId: user.id,
					memory: {
						resource: user.id,
						thread: user.id,
					},
					runtimeContext: {
						discordId: user.id,
					},
				});

				console.log(response);

				await c.followup(response.text);
			} catch (error) {
				console.error("Error generating response:", error);
				await c.followup("エラーが発生しました。もう一度お試しください。");
			}
		});
	}
);
