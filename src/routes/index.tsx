import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/auth";
import { ChatPage } from "@/components/page/ChatPage";

export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	return (
		<AuthLayout>
			{(user) => (
				<div className="h-svh flex flex-col">
					<div className="flex-1 overflow-hidden">
						<ChatPage userId={user.id} />
					</div>
				</div>
			)}
		</AuthLayout>
	);
}
