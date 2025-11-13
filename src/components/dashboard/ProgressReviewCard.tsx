import {
	Card,
	Flex,
	Text,
	Skeleton,
	Button,
	Progress,
	Badge,
} from "@radix-ui/themes";
import { Calendar, TrendingUp, Target } from "lucide-react";
import { useProgressReview } from "./hooks/useProgressReview";
import type { UserContext } from "../../../api/langgraph/types";

interface ProgressReviewCardProps {
	userId: string;
	userContext: UserContext;
}

export function ProgressReviewCard({
	userId,
	userContext,
}: ProgressReviewCardProps) {
	// userContext が "returning_user" でない場合は非表示
	const enabled = userContext === "returning_user";

	const { review, isLoading, isError, error, refetch } = useProgressReview(
		userId,
		enabled,
	);

	if (!enabled) {
		return null;
	}

	// ローディング状態
	if (isLoading) {
		return (
			<Card>
				<Flex direction="column" gap="3">
					<Text size="5" weight="bold">
						振り返りレビュー
					</Text>
					<Skeleton height="80px" />
					<Skeleton height="60px" />
					<Skeleton height="100px" />
				</Flex>
			</Card>
		);
	}

	// エラー状態
	if (isError || !review) {
		return (
			<Card>
				<Flex direction="column" gap="3" align="center">
					<Text size="5" weight="bold">
						振り返りレビュー
					</Text>
					<Text color="red">エラーが発生しました</Text>
					{error && (
						<Text size="2" color="gray">
							{error.message}
						</Text>
					)}
					<Button onClick={() => refetch()}>リトライ</Button>
				</Flex>
			</Card>
		);
	}

	return (
		<Card>
			<Flex direction="column" gap="4">
				{/* タイトル */}
				<Text size="5" weight="bold">
					振り返りレビュー
				</Text>

				{/* モチベーションメッセージ */}
				<Flex
					p="3"
					style={{
						backgroundColor: "var(--accent-3)",
						borderRadius: "var(--radius-3)",
					}}
				>
					<Text size="3" weight="medium">
						{review.motivationalMessage}
					</Text>
				</Flex>

				{/* レビュー期間 */}
				<Flex direction="column" gap="2">
					<Flex align="center" gap="2">
						<Calendar size={16} />
						<Text weight="medium">レビュー期間</Text>
					</Flex>
					<Text size="2" color="gray">
						{new Date(review.reviewPeriod.start).toLocaleDateString("ja-JP")} 〜{" "}
						{new Date(review.reviewPeriod.end).toLocaleDateString("ja-JP")} ({review.reviewPeriod.days}
						日間)
					</Text>
				</Flex>

				{/* 休止前パフォーマンス */}
				<Flex direction="column" gap="2">
					<Flex align="center" gap="2">
						<TrendingUp size={16} />
						<Text weight="medium">休止前パフォーマンス</Text>
					</Flex>
					<Flex direction="column" gap="1">
						<Text size="2">
							平均スコア: {review.beforePausePerformance.avgScore}
						</Text>
						<Text size="2" color="green">
							強み: {review.beforePausePerformance.strongSkills.join(", ")}
						</Text>
						<Text size="2">
							活動頻度: 週{review.beforePausePerformance.activityFrequency}回
						</Text>
					</Flex>
				</Flex>

				{/* 目標進捗 */}
				{review.goalProgress && review.goalProgress.length > 0 && (
					<Flex direction="column" gap="3">
						<Flex align="center" gap="2">
							<Target size={16} />
							<Text weight="medium">目標進捗</Text>
						</Flex>
						{review.goalProgress.map((goal, index) => (
							<Flex key={index} direction="column" gap="2">
								<Flex justify="between" align="center">
									<Text size="2" weight="medium">
										{goal.goalTitle}
									</Text>
									<Badge
										color={
											goal.status === "completed"
												? "green"
												: goal.status === "on_track"
													? "blue"
													: goal.status === "ahead"
														? "purple"
														: "orange"
										}
									>
										{goal.status}
									</Badge>
								</Flex>
								<Progress value={goal.progressPercent} />
								<Text size="1" color="gray">
									{goal.currentValue} / {goal.targetValue} ({goal.progressPercent}
									%)
								</Text>
							</Flex>
						))}
					</Flex>
				)}

				{/* リハビリプラン */}
				<Flex direction="column" gap="2">
					<Text weight="medium" color="blue">
						推奨リハビリプラン
					</Text>
					<Flex direction="column" gap="1">
						{review.rehabilitationPlan.map((plan, index) => (
							<Text key={index} size="2">
								• {plan}
							</Text>
						))}
					</Flex>
				</Flex>
			</Flex>
		</Card>
	);
}
