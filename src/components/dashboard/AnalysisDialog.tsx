import {
	Badge,
	Button,
	Dialog,
	Flex,
	ScrollArea,
	Text,
} from "@radix-ui/themes";
import { ListPlus, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ScoreAnalysis } from "../../../api/langgraph/types";
import { AnalysisChart } from "./AnalysisChart";

interface AnalysisDialogProps {
	analysis: ScoreAnalysis;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AnalysisDialog({
	analysis,
	open,
	onOpenChange,
}: AnalysisDialogProps) {
	const handleGeneratePlaylist = () => {
		// TODO: プレイリスト生成機能の実装
		// 分析結果の challenges をもとにプレイリストを生成
		console.log("プレイリスト生成:", analysis.challenges);
		// ダイアログを閉じる
		onOpenChange(false);
	};

	const getTrendIcon = (trend: "improving" | "stable" | "declining") => {
		switch (trend) {
			case "improving":
				return <TrendingUp size={20} />;
			case "declining":
				return <TrendingDown size={20} />;
			default:
				return <Minus size={20} />;
		}
	};

	const getTrendColor = (trend: "improving" | "stable" | "declining") => {
		switch (trend) {
			case "improving":
				return "green";
			case "declining":
				return "red";
			default:
				return "gray";
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Content maxWidth="600px">
				<Dialog.Title>スコア分析結果</Dialog.Title>
				<Dialog.Description size="2" mb="4">
					{new Date(analysis.period.start).toLocaleDateString("ja-JP")} 〜{" "}
					{new Date(analysis.period.end).toLocaleDateString("ja-JP")}
				</Dialog.Description>

				<ScrollArea style={{ maxHeight: "60vh" }}>
					<Flex direction="column" gap="4">
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
								<Flex direction="column" gap="1">
									{analysis.strengths.map((strength, index) => (
										<Text key={index} size="2">
											• {strength}
										</Text>
									))}
								</Flex>
							</Flex>
						)}

						{/* 弱点 */}
						{analysis.challenges.length > 0 && (
							<Flex direction="column" gap="2">
								<Text weight="medium" color="orange">
									課題
								</Text>
								<Flex direction="column" gap="1">
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
								<Text weight="medium" color="blue">
									達成マイルストーン
								</Text>
								<Flex direction="column" gap="1">
									{analysis.milestones.map((milestone, index) => (
										<Text key={index} size="2">
											🎉 {milestone}
										</Text>
									))}
								</Flex>
							</Flex>
						)}

						{/* チャート */}
						{analysis.chartData && analysis.chartData.labels.length > 0 && (
							<Flex direction="column" gap="2">
								<Text weight="medium">パフォーマンス推移</Text>
								<AnalysisChart chartData={analysis.chartData} />
							</Flex>
						)}

						{/* プレイリスト生成への導線 */}
						<Flex justify="end" gap="2" mt="4">
							<Button variant="soft" onClick={() => onOpenChange(false)}>
								閉じる
							</Button>
							<Button onClick={handleGeneratePlaylist}>
								<ListPlus size={16} />
								プレイリスト生成
							</Button>
						</Flex>
					</Flex>
				</ScrollArea>
			</Dialog.Content>
		</Dialog.Root>
	);
}
