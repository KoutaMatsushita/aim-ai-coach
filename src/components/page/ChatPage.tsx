/**
 * Chat Page with assistant-ui + LangGraph integration
 */

import { AimAssistant } from "@/components/AimAssistant";

interface ChatPageProps {
	userId: string;
}

export function ChatPage({ userId }: ChatPageProps) {
	return (
		<div className="h-full w-full">
			<AimAssistant userId={userId} />
		</div>
	);
}
