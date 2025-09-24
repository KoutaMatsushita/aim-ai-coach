import { mastra } from "@/lib/mastra";
import { RuntimeContext } from "@mastra/core/di";
import type { NextRequest } from "next/server";
import {getServerSession} from "../../../lib/auth";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
	try {
        const session = await getServerSession()
        if (!session?.user) {
            return Response.json("Unauthorized", { status: 401 });
        }

		const { messages, resource, thread } = await req.json();

		if (!resource) {
			return Response.json("required resource", { status: 400 });
		}

		if (!thread) {
			return Response.json("required thread", { status: 400 });
		}

		const agentId = "aimAiCoachAgent";
		const agentObj = mastra.getAgent(agentId);

		if (!agentObj) {
			throw new Error(`Agent ${agentId} not found`);
		}

		const result = await agentObj.streamVNext(messages, {
			format: "aisdk",
			memory: {
				resource,
				thread,
			},
			runtimeContext: new RuntimeContext([
                ["userId", session.user.id],
            ]),
		});

		return result.toUIMessageStreamResponse();
	} catch (e) {
		if (e instanceof Error) {
			console.error("Chat API error:", e);
			return Response.json({ error: e.message }, { status: 500 });
		} else {
			console.error(`Chat API error: ${JSON.stringify(e)}`);
			return Response.json({ error: "unknown error" }, { status: 500 });
		}
	}
}
