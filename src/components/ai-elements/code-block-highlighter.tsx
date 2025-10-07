import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
	oneDark,
	oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

type HighlighterProps = {
	code: string;
	language: string;
	showLineNumbers: boolean;
};

export default function CodeBlockHighlighter({
	code,
	language,
	showLineNumbers,
}: HighlighterProps) {
	return (
		<>
			<SyntaxHighlighter
				className="overflow-hidden dark:hidden"
				codeTagProps={{
					className: "font-mono text-sm",
				}}
				customStyle={{
					margin: 0,
					padding: "1rem",
					fontSize: "0.875rem",
					background: "hsl(var(--background))",
					color: "hsl(var(--foreground))",
				}}
				language={language}
				lineNumberStyle={{
					color: "hsl(var(--muted-foreground))",
					paddingRight: "1rem",
					minWidth: "2.5rem",
				}}
				showLineNumbers={showLineNumbers}
				style={oneLight}
			>
				{code}
			</SyntaxHighlighter>
			<SyntaxHighlighter
				className="hidden overflow-hidden dark:block"
				codeTagProps={{
					className: "font-mono text-sm",
				}}
				customStyle={{
					margin: 0,
					padding: "1rem",
					fontSize: "0.875rem",
					background: "hsl(var(--background))",
					color: "hsl(var(--foreground))",
				}}
				language={language}
				lineNumberStyle={{
					color: "hsl(var(--muted-foreground))",
					paddingRight: "1rem",
					minWidth: "2.5rem",
				}}
				showLineNumbers={showLineNumbers}
				style={oneDark}
			>
				{code}
			</SyntaxHighlighter>
		</>
	);
}
