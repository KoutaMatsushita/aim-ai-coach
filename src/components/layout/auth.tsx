"use client";

import {
	AuthLoading,
	RedirectToSignIn,
	SignedIn,
	SignedOut,
} from "@daveyplate/better-auth-ui";
import { authClient } from "@/lib/auth/client";
import type { Auth } from "../../../api/variables";

export const { useSession } = authClient;

export const AuthLayout = ({
	children,
}: {
	children: (user: Auth["$Infer"]["Session"]["user"]) => React.ReactNode;
}) => {
	const { data } = useSession();

	return (
		<>
			<AuthLoading>
				<span>Loading...</span>
			</AuthLoading>

			<SignedIn>{data?.user ? children(data?.user) : null}</SignedIn>

			<SignedOut>
				<RedirectToSignIn />
			</SignedOut>
		</>
	);
};
