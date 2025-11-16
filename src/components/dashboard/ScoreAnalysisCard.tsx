import { Badge, Button, Card, Flex, ScrollArea, Text } from "@radix-ui/themes";
import {
	ListPlus,
	Minus,
	Play,
	TrendingDown,
	TrendingUp,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useScoreAnalysis } from "./hooks/useScoreAnalysis";
import { usePlaylistGenerator } from "./hooks/usePlaylistGenerator";
import { PlaylistDialog } from "./PlaylistDialog";

interface ScoreAnalysisCardProps {
	userId: string;
}

export function ScoreAnalysisCard({ userId }: ScoreAnalysisCardProps) {
	const {
		analysis,
		isLoading,
		isError,
		error,
		executeAnalysis,
		cancelAnalysis,
	} = useScoreAnalysis(userId);

	const {
		playlist,
		isLoading: isGeneratingPlaylist,
		generatePlaylist,
	} = usePlaylistGenerator(userId);

	const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);

	const getTrendIcon = (trend: "improving" | "stable" | "declining") => {
		switch (trend) {
			case "improving":
				return <TrendingUp size={16} />;
			case "declining":
				return <TrendingDown size={16} />;
			default:
				return <Minus size={16} />;
		}
	};

	const getTrendColor = (
		trend: "improving" | "stable" | "declining",
	): "green" | "red" | "gray" => {
		switch (trend) {
			case "improving":
				return "green";
			case "declining":
				return "red";
			default:
				return "gray";
		}
	};

	const handleGeneratePlaylist = () => {
		if (!analysis?.challenges || analysis.challenges.length === 0) {
			console.warn("課題が見つかりません");
			return;
		}

		generatePlaylist({
			weakAreas: analysis.challenges,
		});
	};

	// プレイリストが生成されたらダイアログを開く
	useEffect(() => {
		if (playlist) {
			console.log("[ScoreAnalysisCard] Playlist generated:", playlist);
			setIsPlaylistDialogOpen(true);
		}
	}, [playlist]);

	return (
		<>
			{/* エラー状態 */}
			{isError ? (
				<Card>
					<Flex direction="column" gap="3" align="center">
						<Text size="5" weight="bold">
							スコア分析
						</Text>
						<Text color="red">エラーが発生しました</Text>
						{error && (
							<Text size="2" color="gray">
								{error.message}
							</Text>
						)}
						<Button onClick={() => executeAnalysis()}>リトライ</Button>
					</Flex>
				</Card>
			) : (
		<Card>
			<Flex direction="column" gap="4">
				<Text size="5" weight="bold">
					スコア分析
				</Text>

				{isLoading ? (
					<Flex direction="column" gap="3" align="center">
						<Text>分析中...</Text>
						<Button color="red" variant="soft" onClick={() => cancelAnalysis()}>
							<X size={16} />
							キャンセル
						</Button>
					</Flex>
				) : analysis ? (
					<ScrollArea style={{ maxHeight: "500px" }}>
						<Flex direction="column" gap="4">
							{/* 分析期間 */}
							<Text size="2" color="gray">
								{new Date(analysis.period.start).toLocaleDateString("ja-JP")} 〜{" "}
								{new Date(analysis.period.end).toLocaleDateString("ja-JP")}
							</Text>

							{/* パフォーマンストレンド */}
							<Flex direction="column" gap="2">
								<Text weight="medium">パフォーマンストレンド</Text>
								<Flex align="center" gap="2">
									{getTrendIcon(analysis.trend)}
									<Badge color={getTrendColor(analysis.trend)} size="2">
										{analysis.trend}
									</Badge>
								</Flex>
							</Flex>

							{/* 強み */}
							{analysis.strengths.length > 0 && (
								<Flex direction="column" gap="2">
									<Text weight="medium" color="green">
										強み
									</Text>
									<Flex direction="column" gap="1" pl="3">
										{analysis.strengths.map((strength, index) => (
											<Text key={index} size="2">
												• {strength}
											</Text>
										))}
									</Flex>
								</Flex>
							)}

							{/* 課題 */}
							{analysis.challenges.length > 0 && (
								<Flex direction="column" gap="2">
									<Text weight="medium" color="orange">
										改善ポイント
									</Text>
									<Flex direction="column" gap="1" pl="3">
										{analysis.challenges.map((challenge, index) => (
											<Text key={index} size="2">
												• {challenge}
											</Text>
										))}
									</Flex>
								</Flex>
							)}

							{/* マイルストーン */}
							{analysis.milestones.length > 0 && (
								<Flex direction="column" gap="2">
									<Text weight="medium">推奨アクション</Text>
									<Flex direction="column" gap="1" pl="3">
										{analysis.milestones.map((milestone, index) => (
											<Text key={index} size="2">
												• {milestone}
											</Text>
										))}
									</Flex>
								</Flex>
							)}

							{/* アクションボタン */}
							<Flex justify="end" gap="2" mt="2">
								<Button variant="soft" onClick={() => cancelAnalysis()}>
									クリア
								</Button>
								<Button
									onClick={handleGeneratePlaylist}
									disabled={
										isGeneratingPlaylist ||
										!analysis?.challenges ||
										analysis.challenges.length === 0
									}
									loading={isGeneratingPlaylist}
								>
									<ListPlus size={16} />
									{isGeneratingPlaylist ? "生成中..." : "プレイリスト生成"}
								</Button>
							</Flex>
						</Flex>
					</ScrollArea>
				) : (
					<Flex direction="column" gap="2">
						<Text size="2" color="gray">
							直近のスコアデータを詳細に分析し、
							パフォーマンストレンド、強み、弱点を確認できます。
						</Text>
						<Button onClick={() => executeAnalysis()}>
							<Play size={16} />
							分析実行
						</Button>
					</Flex>
				)}
			</Flex>
		</Card>
			)}

			{/* プレイリストダイアログ */}
			{playlist && (
				<PlaylistDialog
					playlist={playlist}
					open={isPlaylistDialogOpen}
					onOpenChange={setIsPlaylistDialogOpen}
				/>
			)}
		</>
	);
}
