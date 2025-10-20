import { Container } from "@radix-ui/themes";
import type { QueryClient } from "@tanstack/react-query";
import {Link, Outlet, createRootRouteWithContext, useRouter } from "@tanstack/react-router";
import { AuthQueryProvider } from "@daveyplate/better-auth-tanstack"
import { AuthUIProviderTanstack } from "@daveyplate/better-auth-ui/tanstack"
import { authClient } from "@/lib/auth/client";

export interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootComponent,
});

function RootComponent() {
    const router = useRouter()

	return (
        <AuthQueryProvider>
            <AuthUIProviderTanstack
                authClient={authClient}
                navigate={(href) => router.navigate({ href })}
                replace={(href) => router.navigate({ href, replace: true })}
                Link={({ href, ...props }) => <Link to={href} {...props} />}
                social={{providers: ["discord"]}}
                passkey={true}
                magicLink={true}
                persistClient={true}
                baseURL={window.location.origin}
            >
                <Container className="pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
                    <Outlet />
                </Container>
            </AuthUIProviderTanstack>
        </AuthQueryProvider>
	);
}
