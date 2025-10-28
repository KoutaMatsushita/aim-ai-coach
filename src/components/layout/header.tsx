import { UserButton } from "@daveyplate/better-auth-ui";
import { AlertDialog, Button, Flex, Heading } from "@radix-ui/themes";
import { Link } from "@tanstack/react-router";
import { client } from "@/lib/client";

type HeaderProps = {
	threadId?: string;
};

export const Header = ({ threadId }: HeaderProps) => {
	const handleReset = async () => {
		if (!threadId) return;
		await client.api.threads[":threadId"].$delete({
			param: { threadId },
		});
		window.location.reload();
	};

	return (
		<header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
						<Flex gap="4" align="center">
							<Button variant="ghost" size="2" asChild>
								<Link to="/knowledges">Knowledges</Link>
							</Button>

							{threadId && (
								<AlertDialog.Root>
									<AlertDialog.Trigger>
										<Button variant="ghost" size="2" color="orange">
											Reset Chat
										</Button>
									</AlertDialog.Trigger>
									<AlertDialog.Content maxWidth="450px">
										<AlertDialog.Title>Reset Chat</AlertDialog.Title>
										<AlertDialog.Description size="2">
											Are you sure you want to delete all messages? This action
											cannot be undone.
										</AlertDialog.Description>

										<Flex gap="3" mt="4" justify="end">
											<AlertDialog.Cancel>
												<Button variant="soft" color="gray">
													Cancel
												</Button>
											</AlertDialog.Cancel>
											<AlertDialog.Action>
												<Button
													variant="solid"
													color="red"
													onClick={handleReset}
												>
													Delete All
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
