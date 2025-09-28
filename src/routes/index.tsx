import { AuthLayout } from "@/components/layout/auth.tsx";
import HomePage from "@/components/page/HomePage.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	return (
		<AuthLayout>
			{(user) => (
				<div className="h-screen">
					<HomePage resource={user.id} thread={user.id} />
				</div>
			)}
		</AuthLayout>
	);
}
