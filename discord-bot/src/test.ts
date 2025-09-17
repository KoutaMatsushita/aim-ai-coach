import { MastraClient } from "@mastra/client-js";

const client = new MastraClient({
	baseUrl: process.env.MASTRA_BASE_URL!,
});

const tool = client.getTool("find-user-by-discord-user-id-tool");
console.log(await tool.execute({ data: {}, runtimeContext: { discordId: "560816524835684382" } }));

const agent = client.getAgent("aimAiCoachAgent");

const stream = await agent.generateVNext({
	messages: [
		{
			role: "user",
			content: "私の discord ID わかる？",
		},
	],
	resourceId: "560816524835684382",
	threadId: "123",
	runtimeContext: {
		discordId: "560816524835684382",
	},
});

console.log(stream);
