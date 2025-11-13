"use client";

/**
 * Aim AI Coach Assistant
 * Simple custom chat UI with LangGraph streaming
 */

import { ArrowUpIcon, Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

interface AimAssistantProps {
	userId: string;
}

export function AimAssistant({ userId }: AimAssistantProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-scroll to bottom
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	// Auto-resize textarea
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
		}
	}, [input]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		const userMessage: Message = {
			id: crypto.randomUUID(),
			role: "user",
			content: input.trim(),
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					id: userId,
					messages: [...messages, userMessage].map((msg) => ({
						id: msg.id,
						role: msg.role,
						content: msg.content,
					})),
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			if (!response.body) {
				throw new Error("No response body");
			}

			// Create assistant message placeholder
			const assistantMessageId = crypto.randomUUID();
			const assistantMessage: Message = {
				id: assistantMessageId,
				role: "assistant",
				content: "",
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, assistantMessage]);

			// Process SSE stream
			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(6));

							if (data.type === "message" && data.role === "assistant") {
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantMessageId
											? { ...msg, content: msg.content + data.content }
											: msg,
									),
								);
							}
						} catch (e) {
							console.error("Failed to parse SSE data:", e);
						}
					}
				}
			}
		} catch (error) {
			console.error("Failed to send message:", error);
			// Add error message
			setMessages((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					role: "assistant",
					content:
						"申し訳ございません。エラーが発生しました。もう一度お試しください。",
					timestamp: new Date(),
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<div className="flex h-full flex-col bg-background">
			{/* Messages Area */}
			<ScrollArea className="flex-1 p-4" ref={scrollRef}>
				<div className="mx-auto max-w-3xl space-y-6">
					{messages.length === 0 && (
						<div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
							<h1 className="text-3xl font-bold">Aim AI Coach</h1>
							<p className="text-muted-foreground">
								FPSプレイヤーのためのAIコーチです。
								<br />
								エイム改善のためのアドバイスをお手伝いします。
							</p>
						</div>
					)}

					{messages.map((message) => (
						<MessageBubble key={message.id} message={message} />
					))}

					{isLoading && messages[messages.length - 1]?.role === "assistant" && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2Icon className="size-4 animate-spin" />
							<span>入力中...</span>
						</div>
					)}
				</div>
			</ScrollArea>

			{/* Input Area */}
			<div className="border-t bg-background p-4">
				<form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
					<div className="relative flex items-end gap-2 rounded-lg border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
						<Textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="メッセージを入力..."
							className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent p-2 focus-visible:ring-0"
							disabled={isLoading}
						/>
						<Button
							type="submit"
							size="icon"
							disabled={!input.trim() || isLoading}
							className="shrink-0 rounded-full"
						>
							<ArrowUpIcon className="size-5" />
							<span className="sr-only">送信</span>
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

function MessageBubble({ message }: { message: Message }) {
	const isUser = message.role === "user";

	return (
		<div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
			<Avatar className="size-8 shrink-0">
				<AvatarFallback className={cn(isUser ? "bg-primary" : "bg-muted")}>
					{isUser ? "U" : "AI"}
				</AvatarFallback>
			</Avatar>

			<div
				className={cn(
					"rounded-2xl px-4 py-2 max-w-[80%]",
					isUser
						? "bg-primary text-primary-foreground"
						: "bg-muted text-foreground",
				)}
			>
				<div className="whitespace-pre-wrap break-words">{message.content}</div>
			</div>
		</div>
	);
}
