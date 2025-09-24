import HomePage from "@/components/page/HomePage"
import {mastra} from "@/lib/mastra"
import {requireAuth} from "../lib/auth";
import {redirect} from "next/navigation";
import { UIMessage } from "ai";

export default async function Home() {
    const session = await requireAuth()
    if (!session?.user) {
        redirect("/login")
    }

    const resourceId = session.user.id
    const threadId = session.user.id

    const agent = mastra.getAgent("aimAiCoachAgent")

    const storage = mastra.getStorage()
    if (!storage) {
        throw new Error("Storage not found")
    }
    const memory = await agent.getMemory()
    if (!memory) {
        throw new Error("Memory not found")
    }

    let currentThread = (await memory.getThreadsByResourceId({resourceId: resourceId}))
        .find((thread) => thread.id === threadId)
    if (!currentThread) {
        const newThread = await memory.createThread({threadId: threadId, resourceId: resourceId})
        if (!newThread) {
            throw new Error("Thread not created")
        }
    }

    const messages = await storage.getMessages({
        format: "v2",
        threadId: threadId,
        resourceId: resourceId,
    }).then((messages) => messages.map((message) => ({
        ...message,
        ...message.content,
    } as UIMessage )))

    return <div className="h-screen">
        <HomePage
            initialMessages={messages}
            resource={resourceId}
            thread={threadId}
        />
    </div>
}
