"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart, type UIMessage } from "ai";
import {
	type FormEvent,
	Fragment,
	useCallback,
	useEffect,
	useState,
} from "react";
import useSWR from "swr";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation.tsx";
import { Loader } from "@/components/ai-elements/loader.tsx";
import { Message, MessageContent } from "@/components/ai-elements/message.tsx";
import {
	PromptInput,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
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
import { client } from "@/lib/client.ts";
import type { PromptInputMessage } from "../ai-elements/prompt-input.tsx";
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from "../ai-elements/tool.tsx";
import { Text } from "@radix-ui/themes";

function useInitialMessage(threadId: string) {
	return useSWR(["/api/threads/:threads/messages", threadId], async () => {
		const currentThreadResponse = await client.api.threads[":threadId"].$get({
			param: { threadId },
		});
		const currentThread = await currentThreadResponse.json();

		const messagesResponse = await client.api.threads[
			":threadId"
		].messages.$get({ param: { threadId: currentThread.id } });
		// @ts-expect-error
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
			api: "/api/chat",
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
		<div className="max-w-4xl mx-auto relative w-full h-full">
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
															<Text size="1" className="pt-4">{new Date((message.metadata as { createdAt: string })?.createdAt).toLocaleString()}</Text>
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
										default:
											if (part.type?.startsWith("tool-")) {
												const toolPart = part as ToolUIPart<any>;
												const toolName = toolPart.type.replace(/^tool-/, "");

												return (
													<Tool key={toolPart.toolCallId}>
														<ToolHeader
															type={toolPart.type}
															state={toolPart.state}
															title={toolName}
														/>
														<ToolContent>
															{toolPart?.input && (
																<ToolInput input={toolPart.input} />
															)}
															{toolPart?.output && (
																<ToolOutput
																	errorText={toolPart.errorText}
																	output={toolPart.output}
																/>
															)}
														</ToolContent>
													</Tool>
												);
											}
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
					<PromptInputFooter>
						<PromptInputSubmit disabled={!input} status={status} />
					</PromptInputFooter>
				</PromptInput>
			</div>
		</div>
	);
}
