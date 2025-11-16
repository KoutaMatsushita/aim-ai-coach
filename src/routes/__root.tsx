import { AuthQueryProvider } from "@daveyplate/better-auth-tanstack";
import { AuthUIProviderTanstack } from "@daveyplate/better-auth-ui/tanstack";
import { Container, Theme } from "@radix-ui/themes";
import radixCss from "@radix-ui/themes/styles.css?url";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
	useRouter,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth/client";
import appCss from "../styles.css?url";

export interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Aim Ai Coach",
			},
			{
				name: "theme-color",
				content: "#000000",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
			},
			{
				rel: "apple-touch-icon",
				href: "/logo192.png",
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "stylesheet",
				href: radixCss,
			},
		],
	}),
	component: RootComponent,
});

const queryClient = new QueryClient();

function RootComponent() {
	const router = useRouter();

	return (
		<RootDocument>
			<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
				<Theme accentColor="cyan" grayColor="slate">
					<QueryClientProvider client={queryClient}>
						<AuthQueryProvider>
							<AuthUIProviderTanstack
								authClient={authClient}
								navigate={(href) => router.navigate({ href })}
								replace={(href) => router.navigate({ href, replace: true })}
								Link={({ href, ...props }) => <Link to={href} {...props} />}
								social={{ providers: ["discord"] }}
								passkey={true}
								magicLink={true}
								persistClient={true}
							>
								<Outlet />
							</AuthUIProviderTanstack>
						</AuthQueryProvider>
					</QueryClientProvider>
				</Theme>
			</ThemeProvider>
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="ja">
			<head>
				<HeadContent />
			</head>
			<body className="pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
				{children}
				<Scripts />
			</body>
		</html>
	);
}
