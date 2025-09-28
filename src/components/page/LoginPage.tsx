"use client";

import { Button } from "@/components/ui/button.tsx";
import { authClient } from "@/lib/auth/client";

export default () => {
	const handleLogin = async () => {
		await authClient.signIn.social({
			provider: "discord",
			callbackURL: `${window.location.origin}/`,
		});
	};

	return (
		<div>
			<Button onClick={handleLogin}>discord login</Button>
		</div>
	);
};
