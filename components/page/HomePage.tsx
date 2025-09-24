"use client";

import {useChat} from "@ai-sdk/react";
import {AssistantRuntimeProvider} from "@assistant-ui/react";
import {useAISDKRuntime} from "@assistant-ui/react-ai-sdk";
import {DefaultChatTransport, type UIMessage} from "ai";
import {useEffect} from "react";
import {Thread} from "@/components/assistant-ui/thread";

export default function AssistantUI(
    {
        initialMessages,
        resource,
        thread,
    }: {
        initialMessages: UIMessage[];
        resource: string;
        thread: string;
    }) {
    // initialMessagesが空の場合はundefinedを渡す
    const chat = useChat({
        transport: new DefaultChatTransport({
            api: "/api/chat",
            body: {
                resource,
                thread,
            },
        }),
        ...(initialMessages && initialMessages.length > 0 ? {messages: initialMessages} : {}),
    });

    // 手動でinitialMessagesを設定（フォールバック）
    useEffect(() => {
        if (initialMessages && initialMessages.length > 0 && chat.messages.length === 0) {
            console.log("Setting initial messages manually:", initialMessages);
            chat.setMessages(initialMessages);
        }
    }, [initialMessages, chat.messages.length, chat.setMessages]);

    const runtime = useAISDKRuntime(chat);

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            <div className="h-full">
                <Thread/>
            </div>
        </AssistantRuntimeProvider>
    );
}
