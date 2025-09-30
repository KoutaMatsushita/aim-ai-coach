"use client";

import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation.tsx";
import { Loader } from "@/components/ai-elements/loader.tsx";
import { Message, MessageContent } from "@/components/ai-elements/message.tsx";
import {
	PromptInput,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputToolbar,
} from "@/components/ai-elements/prompt-input.tsx";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning.tsx";
import { Response } from "@/components/ai-elements/response.tsx";
import {
	Source,
	Sources,
	SourcesContent,
	SourcesTrigger,
} from "@/components/ai-elements/sources.tsx";
import { env } from "@/env.ts";
import { client } from "@/lib/client.ts";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
	type FormEvent,
	Fragment,
	useCallback,
	useEffect,
	useState,
} from "react";
import useSWR from "swr";
import type { PromptInputMessage } from "../ai-elements/prompt-input.tsx";
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from "../ai-elements/tool.tsx";

function useInitialMessage(threadId: string) {
	return useSWR(["/api/threads/:threads/messages", threadId], async () => {
		const currentThreadResponse = await client.api.threads[":threadId"].$get({
			param: { threadId },
		});
		const currentThread = await currentThreadResponse.json();

		const messagesResponse = await client.api.threads[
			":threadId"
		].messages.$get({ param: { threadId: currentThread.id } });
		// @ts-ignore
		const messages: UIMessage[] = await messagesResponse.json();

		return messages;
	});
}

export default function HomePage({
	thread,
}: {
	resource: string;
	thread: string;
}) {
	const [input, setInput] = useState("");
	const { data: initialMessages } = useInitialMessage(thread);

	const { messages, sendMessage, setMessages, status } = useChat({
		transport: new DefaultChatTransport({
			api: `${env.VITE_PUBLIC_API_URL}/api/chat`,
			credentials: "include",
		}),
	});

	useEffect(() => {
		if (
			initialMessages &&
			initialMessages.length > 0 &&
			messages.length === 0
		) {
			console.log("Setting initial messages manually:", initialMessages);
			setMessages(initialMessages);
		}
	}, [initialMessages, messages.length, setMessages]);

	const handleSubmit = useCallback(
		(message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();

			if (message.text?.trim()) {
				sendMessage({ text: message.text ?? "" });
				setInput("");
			}
		},
		[sendMessage],
	);

	return (
		<div className="max-w-4xl mx-auto relative size-full h-screen">
			<div className="flex flex-col h-full">
				<Conversation className="h-full">
					<ConversationContent>
						{messages.map((message) => (
							<div key={message.id}>
								{message.role === "assistant" &&
									message.parts.filter((part) => part.type === "source-url")
										.length > 0 && (
										<Sources>
											<SourcesTrigger
												count={
													message.parts.filter(
														(part) => part.type === "source-url",
													).length
												}
											/>
											{message.parts
												.filter((part) => part.type === "source-url")
												.map((part, i) => (
													<SourcesContent key={`${message.id}-${i}`}>
														<Source
															key={`${message.id}-${i}`}
															href={part.url}
															title={part.url}
														/>
													</SourcesContent>
												))}
										</Sources>
									)}
								{message.parts.map((part, i) => {
									switch (part.type) {
										case "text":
											return (
												<Fragment key={`${message.id}-${i}`}>
													<Message from={message.role}>
														<MessageContent>
															<Response>{part.text}</Response>
														</MessageContent>
													</Message>
												</Fragment>
											);
										case "reasoning":
											return (
												<Reasoning
													key={`${message.id}-${i}`}
													className="w-full"
													isStreaming={
														status === "streaming" &&
														i === message.parts.length - 1 &&
														message.id === messages.at(-1)?.id
													}
												>
													<ReasoningTrigger />
													<ReasoningContent>{part.text}</ReasoningContent>
												</Reasoning>
											);
										case "tool-invocation": {
											const toolInvocation: {
												args: { queryText: string; topK: number };
												result: {
													relevantContext: any[];
													sources: any[];
												};
												state: string;
												toolCallId: string;
												toolName: string;
											} = (part as any).toolInvocation;
											if (!toolInvocation) return null;
											return (
												<Tool key={toolInvocation.toolCallId}>
													<ToolHeader
														type={part.type}
														state={toolInvocation.state as any}
														title={toolInvocation.toolName}
													/>
													<ToolContent>
														<ToolInput input={toolInvocation.args} />
														{toolInvocation.result && (
															<ToolOutput
																errorText={part.errorText}
																output={toolInvocation.result}
															/>
														)}
													</ToolContent>
												</Tool>
											);
										}
										default:
											return null;
									}
								})}
							</div>
						))}
						{status === "submitted" && <Loader />}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>

				<PromptInput onSubmit={handleSubmit} className="mt-4">
					<PromptInputTextarea
						onChange={(e) => setInput(e.target.value)}
						value={input}
					/>
					<PromptInputToolbar>
						<PromptInputSubmit disabled={!input} status={status} />
					</PromptInputToolbar>
				</PromptInput>
			</div>
		</div>
	);
}
