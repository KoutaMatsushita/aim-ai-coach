import {
	Dialog,
	Flex,
	Text,
	Badge,
	Button,
	ScrollArea,
	Card,
} from "@radix-ui/themes";
import { Clock, Target } from "lucide-react";
import type { Playlist } from "../../../api/langgraph/types";

interface PlaylistDialogProps {
	playlist: Playlist;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function PlaylistDialog({
	playlist,
	open,
	onOpenChange,
}: PlaylistDialogProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Content maxWidth="700px">
				<Dialog.Title>{playlist.title}</Dialog.Title>
				<Dialog.Description size="2" mb="4">
					{playlist.description}
				</Dialog.Description>

				<ScrollArea style={{ maxHeight: "60vh" }}>
					<Flex direction="column" gap="4">
						{/* 対象弱点 */}
						<Flex direction="column" gap="2">
							<Text weight="medium">対象弱点</Text>
							<Flex gap="2" wrap="wrap">
								{playlist.targetWeaknesses.map((weakness, index) => (
									<Badge key={index} color="orange">
										{weakness}
									</Badge>
								))}
							</Flex>
						</Flex>

						{/* 総所要時間 */}
						<Flex align="center" gap="2">
							<Clock size={16} />
							<Text size="2" weight="medium">
								総所要時間: {playlist.totalDuration}分
							</Text>
						</Flex>

						{/* シナリオリスト */}
						<Flex direction="column" gap="2">
							<Text weight="medium">練習シナリオ</Text>
							<Flex direction="column" gap="3">
								{playlist.scenarios
									.sort((a, b) => a.order - b.order)
									.map((scenario, index) => (
										<Card key={index}>
											<Flex direction="column" gap="2">
												<Flex justify="between" align="center">
													<Text weight="bold" size="3">
														{scenario.order}. {scenario.scenarioName}
													</Text>
													<Badge
														color={
															scenario.difficultyLevel === "beginner"
																? "green"
																: scenario.difficultyLevel === "intermediate"
																	? "blue"
																	: scenario.difficultyLevel === "advanced"
																		? "orange"
																		: "red"
														}
													>
														{scenario.difficultyLevel}
													</Badge>
												</Flex>

												<Flex direction="column" gap="1">
													<Flex align="center" gap="2">
														<Target size={14} />
														<Text size="2" color="gray">
															{scenario.purpose}
														</Text>
													</Flex>
													<Flex align="center" gap="2">
														<Clock size={14} />
														<Text size="2" color="gray">
															{scenario.duration}分
														</Text>
													</Flex>
												</Flex>

												<Text size="2" color="blue">
													期待効果: {scenario.expectedEffect}
												</Text>

												<Badge variant="soft" color="gray">
													{scenario.platform}
												</Badge>
											</Flex>
										</Card>
									))}
							</Flex>
						</Flex>

						{/* 推論理由 */}
						<Flex direction="column" gap="2">
							<Text weight="medium">生成理由</Text>
							<Text size="2" color="gray">
								{playlist.reasoning}
							</Text>
						</Flex>

						{/* アクションボタン */}
						<Flex justify="end" gap="2" mt="4">
							<Button variant="soft" onClick={() => onOpenChange(false)}>
								閉じる
							</Button>
							<Button>練習開始</Button>
						</Flex>
					</Flex>
				</ScrollArea>

				<Dialog.Close />
			</Dialog.Content>
		</Dialog.Root>
	);
}
