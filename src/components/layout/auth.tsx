"use client";

import { authClient } from "@/lib/auth/client";
import type { Auth } from "../../../api/variables";

export const AuthLayout = ({
	children,
}: {
	children: (user: Auth["$Infer"]["Session"]["user"]) => any;
}) => {
	const { useSession } = authClient;
	const { data: session, isPending, error: authError } = useSession();

	if (isPending) return <span>loading...</span>;
	if (authError) return <span>error: {String(authError)}</span>;
	if (!session) return <a href="/login">Login</a>;

	return <>{children(session.user)}</>;
};
