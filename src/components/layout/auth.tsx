"use client";

import { authClient } from "@/lib/auth/client";
import type { Auth } from "../../../api/variables";

export const { useSession } = authClient;

export const AuthLayout = ({
	children,
}: {
	children: (user: Auth["$Infer"]["Session"]["user"]) => React.ReactNode;
}) => {
	const { data, isPending, error: authError } = useSession();

	if (isPending) return <span>loading...</span>;
	if (authError) return <span>error: {String(authError)}</span>;
	if (!data) return <a href="/login">Login</a>;

	return <>{children(data.user)}</>;
};
