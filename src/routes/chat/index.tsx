import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/auth";
import { Header } from "@/components/layout/header";
import { ChatPage } from "@/components/page/ChatPage";

export const Route = createFileRoute("/chat/")({
	component: ChatPageRoute,
});

function ChatPageRoute() {
	return (
		<AuthLayout>
			{(user) => (
				<div className="h-screen flex flex-col">
					<Header />
					<div className="flex-1 overflow-hidden">
						<ChatPage userId={user.id} />
					</div>
				</div>
			)}
		</AuthLayout>
	);
}
