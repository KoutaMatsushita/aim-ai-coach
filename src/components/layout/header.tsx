import { UserButton } from "@daveyplate/better-auth-ui";
import { AlertDialog, Button, Flex, Heading } from "@radix-ui/themes";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, MessageSquare, Library } from "lucide-react";
import { client } from "@/lib/client";

type HeaderProps = {
	threadId?: string;
	showNavigation?: boolean;
};

export const Header = ({ threadId, showNavigation = true }: HeaderProps) => {
	const handleReset = async () => {
		if (!threadId) return;
		await client.api.threads[":threadId"].$delete({
			param: { threadId },
		});
		window.location.reload();
	};

	return (
		<header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
			<div className="max-w-7xl mx-auto">
				<Flex justify="between" align="center" className="h-16">
					<Flex align="center" gap="3">
						<Heading
							size="6"
							className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
						>
							<Link to="/">AIM AI Coach</Link>
						</Heading>
					</Flex>

					<nav>
						<Flex gap="3" align="center">
							{showNavigation && (
								<>
									<Button variant="ghost" size="2" asChild>
										<Link to="/">
											<LayoutDashboard className="w-4 h-4 mr-2" />
											ダッシュボード
										</Link>
									</Button>
									<Button variant="ghost" size="2" asChild>
										<Link to="/chat">
											<MessageSquare className="w-4 h-4 mr-2" />
											チャット
										</Link>
									</Button>
									<Button variant="ghost" size="2" asChild>
										<Link to="/knowledges">
											<Library className="w-4 h-4 mr-2" />
											ナレッジ
										</Link>
									</Button>
								</>
							)}

							{threadId && (
								<AlertDialog.Root>
									<AlertDialog.Trigger>
										<Button variant="ghost" size="2" color="orange">
											リセット
										</Button>
									</AlertDialog.Trigger>
									<AlertDialog.Content maxWidth="450px">
										<AlertDialog.Title>チャットをリセット</AlertDialog.Title>
										<AlertDialog.Description size="2">
											すべてのメッセージを削除してもよろしいですか？
											この操作は取り消せません。
										</AlertDialog.Description>

										<Flex gap="3" mt="4" justify="end">
											<AlertDialog.Cancel>
												<Button variant="soft" color="gray">
													キャンセル
												</Button>
											</AlertDialog.Cancel>
											<AlertDialog.Action>
												<Button
													variant="solid"
													color="red"
													onClick={handleReset}
												>
													削除
												</Button>
											</AlertDialog.Action>
										</Flex>
									</AlertDialog.Content>
								</AlertDialog.Root>
							)}

							<UserButton size={"icon"} />
						</Flex>
					</nav>
				</Flex>
			</div>
		</header>
	);
};
