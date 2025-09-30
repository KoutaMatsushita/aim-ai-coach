"use client";

import { authClient } from "@/lib/auth/client";
import { Button } from "@radix-ui/themes";

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
