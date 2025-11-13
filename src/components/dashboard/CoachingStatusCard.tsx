import { Card, Badge, Flex, Text, Skeleton, Button } from "@radix-ui/themes";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useCoachingStatus } from "./hooks/useCoachingStatus";

interface CoachingStatusCardProps {
	userId: string;
}

export function CoachingStatusCard({ userId }: CoachingStatusCardProps) {
	const { status, isLoading, isError, error, refetch } =
		useCoachingStatus(userId);

	// ローディング状態
	if (isLoading) {
		return (
			<Card>
				<Flex direction="column" gap="3">
					<Skeleton height="24px" />
					<Skeleton height="60px" />
					<Skeleton height="40px" />
				</Flex>
			</Card>
		);
	}

	// エラー状態
	if (isError || !status) {
		return (
			<Card>
				<Flex direction="column" gap="3" align="center">
					<Text color="red">エラーが発生しました</Text>
					{error && <Text size="2" color="gray">{error.message}</Text>}
					<Button onClick={() => refetch()}>リトライ</Button>
				</Flex>
			</Card>
		);
	}

	// トレンドアイコン
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

	return (
		<Card>
			<Flex direction="column" gap="4">
				{/* ユーザーコンテキスト */}
				<Flex justify="between" align="center">
					<Text size="5" weight="bold">
						コーチングステータス
					</Text>
					<Badge>{status.userContext}</Badge>
				</Flex>

				{/* 今日の推奨練習 */}
				{status.todayFocus && (
					<Flex direction="column" gap="2">
						<Text weight="medium">今日の推奨練習</Text>
						<Flex direction="column" gap="1">
							<Text size="2" color="gray">
								スキル: {status.todayFocus.focusSkills.join(", ")}
							</Text>
							<Text size="2" color="gray">
								推奨時間: {status.todayFocus.recommendedDuration}分
							</Text>
							<Text size="2" color="gray">
								シナリオ: {status.todayFocus.recommendedScenarios.join(", ")}
							</Text>
						</Flex>
					</Flex>
				)}

				{/* スコアトレンドサマリー */}
				{status.scoreTrendSummary && (
					<Flex direction="column" gap="2">
						<Flex align="center" gap="2">
							<Text weight="medium">トレンド</Text>
							{getTrendIcon(status.scoreTrendSummary.trend)}
							<Badge color={status.scoreTrendSummary.trend === "improving" ? "green" : status.scoreTrendSummary.trend === "declining" ? "red" : "gray"}>
								{status.scoreTrendSummary.trend}
							</Badge>
						</Flex>
						{status.scoreTrendSummary.improvedSkills.length > 0 && (
							<Text size="2" color="green">
								改善: {status.scoreTrendSummary.improvedSkills.join(", ")}
							</Text>
						)}
						{status.scoreTrendSummary.challengeSkills.length > 0 && (
							<Text size="2" color="orange">
								課題: {status.scoreTrendSummary.challengeSkills.join(", ")}
							</Text>
						)}
					</Flex>
				)}

				{/* アクティブプレイリスト */}
				{status.activePlaylist && (
					<Flex direction="column" gap="1">
						<Text size="2" weight="medium">
							アクティブプレイリスト
						</Text>
						<Text size="2">
							{status.activePlaylist.title} ({status.activePlaylist.scenariosCount}
							シナリオ)
						</Text>
					</Flex>
				)}

				{/* 最新レポート */}
				{status.latestReport && (
					<Flex direction="column" gap="1">
						<Text size="2" weight="medium">
							最新レポート
						</Text>
						<Text size="2" color="gray">
							{new Date(status.latestReport.date).toLocaleDateString("ja-JP")}
						</Text>
					</Flex>
				)}
			</Flex>
		</Card>
	);
}
