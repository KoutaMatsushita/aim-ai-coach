import { AuthLayout } from "@/components/layout/auth";
import { Header } from "@/components/layout/header";
import HomePage from "@/components/page/HomePage.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	return (
		<AuthLayout>
			{(user) => (
				<div className="h-svh flex flex-col">
					<Header threadId={user.id} />
					<div className="flex-1 overflow-hidden">
						<HomePage resource={user.id} thread={user.id} />
					</div>
				</div>
			)}
		</AuthLayout>
	);
}
