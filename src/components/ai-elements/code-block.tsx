"use client";

import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { Suspense, createContext, lazy, useContext, useState } from "react";
import type { SyntaxHighlighterProps } from "react-syntax-highlighter";

// 遅延ロード用のラッパーコンポーネント
const LazySyntaxHighlighter = lazy(
	() => import("./code-block-highlighter.tsx"),
);

type CodeBlockContextType = {
	code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
	code: "",
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
	code: string;
	language: string;
	showLineNumbers?: boolean;
	children?: ReactNode;
};

export const CodeBlock = ({
	code,
	language,
	showLineNumbers = false,
	className,
	children,
	...props
}: CodeBlockProps) => (
	<CodeBlockContext.Provider value={{ code }}>
		<div
			className={cn(
				"relative w-full overflow-hidden rounded-md border bg-background text-foreground",
				className,
			)}
			{...props}
		>
			<div className="relative">
				<Suspense
					fallback={
						<pre className="m-0 overflow-hidden p-4">
							<code className="font-mono text-sm">{code}</code>
						</pre>
					}
				>
					<LazySyntaxHighlighter
						code={code}
						language={language}
						showLineNumbers={showLineNumbers}
					/>
				</Suspense>
				{children && (
					<div className="absolute top-2 right-2 flex items-center gap-2">
						{children}
					</div>
				)}
			</div>
		</div>
	</CodeBlockContext.Provider>
);

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
	onCopy?: () => void;
	onError?: (error: Error) => void;
	timeout?: number;
};

export const CodeBlockCopyButton = ({
	onCopy,
	onError,
	timeout = 2000,
	children,
	className,
	...props
}: CodeBlockCopyButtonProps) => {
	const [isCopied, setIsCopied] = useState(false);
	const { code } = useContext(CodeBlockContext);

	const copyToClipboard = async () => {
		if (typeof window === "undefined" || !navigator.clipboard.writeText) {
			onError?.(new Error("Clipboard API not available"));
			return;
		}

		try {
			await navigator.clipboard.writeText(code);
			setIsCopied(true);
			onCopy?.();
			setTimeout(() => setIsCopied(false), timeout);
		} catch (error) {
			onError?.(error as Error);
		}
	};

	const Icon = isCopied ? CheckIcon : CopyIcon;

	return (
		<Button
			className={cn("shrink-0", className)}
			onClick={copyToClipboard}
			size="icon"
			variant="ghost"
			{...props}
		>
			{children ?? <Icon size={14} />}
		</Button>
	);
};
