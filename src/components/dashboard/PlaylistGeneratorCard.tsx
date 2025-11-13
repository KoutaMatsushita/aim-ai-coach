import {
	Button,
	Card,
	Flex,
	Text,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import { ListPlus } from "lucide-react";
import { Suspense, useState } from "react";
import { usePlaylistGenerator } from "./hooks/usePlaylistGenerator";
import { LazyPlaylistDialog } from "./LazyComponents";
import { DialogSkeleton } from "./SuspenseFallback";

interface PlaylistGeneratorCardProps {
	userId: string;
}

export function PlaylistGeneratorCard({ userId }: PlaylistGeneratorCardProps) {
	const { playlist, isLoading, isError, error, generatePlaylist } =
		usePlaylistGenerator(userId);

	const [targetGame, setTargetGame] = useState("");
	const [weakAreasInput, setWeakAreasInput] = useState("");
	const [validationError, setValidationError] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);

	// プレイリスト生成成功時にダイアログを開く
	if (playlist && !dialogOpen) {
		setDialogOpen(true);
	}

	const handleGenerate = () => {
		// バリデーション
		const weakAreas = weakAreasInput
			.split(",")
			.map((area) => area.trim())
			.filter((area) => area.length > 0);

		if (weakAreas.length === 0) {
			setValidationError("少なくとも1つの弱点エリアを入力してください");
			return;
		}

		setValidationError("");
		generatePlaylist({
			targetGame: targetGame || undefined,
			weakAreas,
		});
	};

	// エラー状態
	if (isError) {
		return (
			<Card>
				<Flex direction="column" gap="3" align="center">
					<Text size="5" weight="bold">
						プレイリスト生成
					</Text>
					<Text color="red">エラーが発生しました</Text>
					{error && (
						<Text size="2" color="gray">
							{error.message}
						</Text>
					)}
					<Button onClick={handleGenerate}>リトライ</Button>
				</Flex>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<Flex direction="column" gap="4">
					<Text size="5" weight="bold">
						プレイリスト生成
					</Text>

					{isLoading ? (
						<Flex direction="column" gap="3" align="center">
							<Text>生成中...</Text>
						</Flex>
					) : (
						<Flex direction="column" gap="3">
							<Flex direction="column" gap="2">
								<Text size="2" weight="medium">
									対象ゲーム (任意)
								</Text>
								<TextField.Root
									placeholder="例: Valorant, Apex Legends"
									value={targetGame}
									onChange={(e) => setTargetGame(e.target.value)}
								/>
							</Flex>

							<Flex direction="column" gap="2">
								<Text size="2" weight="medium">
									弱点エリア (必須) *
								</Text>
								<TextArea
									placeholder="弱点エリアをカンマ区切りで入力してください (例: tracking, flicking, target switching)"
									value={weakAreasInput}
									onChange={(e) => setWeakAreasInput(e.target.value)}
									rows={3}
								/>
								{validationError && (
									<Text size="2" color="red">
										{validationError}
									</Text>
								)}
							</Flex>

							<Button onClick={handleGenerate}>
								<ListPlus size={16} />
								生成
							</Button>
						</Flex>
					)}
				</Flex>
			</Card>

			{/* プレイリスト結果ダイアログ（遅延ロード） */}
			{playlist && (
				<Suspense fallback={<DialogSkeleton />}>
					<LazyPlaylistDialog
						playlist={playlist}
						open={dialogOpen}
						onOpenChange={setDialogOpen}
					/>
				</Suspense>
			)}
		</>
	);
}
