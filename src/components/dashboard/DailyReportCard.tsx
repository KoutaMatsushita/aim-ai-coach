import * as Popover from "@radix-ui/react-popover";
import { Badge, Button, Card, Flex, Skeleton, Text } from "@radix-ui/themes";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { useDailyReport } from "./hooks/useDailyReport";
import "react-day-picker/dist/style.css";

interface DailyReportCardProps {
	userId: string;
}

export function DailyReportCard({ userId }: DailyReportCardProps) {
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);

	const { report, isLoading, isError, error, refetch } = useDailyReport(
		userId,
		selectedDate,
	);

	// 日付選択ハンドラー
	const handleDateSelect = (date: Date | undefined) => {
		if (date) {
			setSelectedDate(date);
			setIsCalendarOpen(false);
		}
	};

	// パフォーマンスレーティングの色
	const getRatingColor = (
		rating: "good" | "normal" | "needs_improvement",
	): "green" | "blue" | "orange" => {
		switch (rating) {
			case "good":
				return "green";
			case "normal":
				return "blue";
			case "needs_improvement":
				return "orange";
		}
	};

	// パフォーマンスレーティングのラベル
	const getRatingLabel = (
		rating: "good" | "normal" | "needs_improvement",
	): string => {
		switch (rating) {
			case "good":
				return "良好";
			case "normal":
				return "標準";
			case "needs_improvement":
				return "要改善";
		}
	};

	// ローディング状態
	if (isLoading) {
		return (
			<Card>
				<Flex direction="column" gap="3">
					<Skeleton height="24px" />
					<Skeleton height="80px" />
					<Skeleton height="120px" />
				</Flex>
			</Card>
		);
	}

	// エラー状態
	if (isError || !report) {
		return (
			<Card>
				<Flex direction="column" gap="3" align="center">
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
				{/* ヘッダー: タイトルと日付選択 */}
				<Flex justify="between" align="center">
					<Text size="5" weight="bold">
						デイリーレポート
					</Text>
					<Popover.Root open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
						<Popover.Trigger asChild>
							<Button variant="soft" style={{ cursor: "pointer" }}>
								<CalendarIcon size={16} />
								{format(selectedDate, "yyyy年M月d日(E)", { locale: ja })}
							</Button>
						</Popover.Trigger>
						<Popover.Portal>
							<Popover.Content
								side="bottom"
								align="end"
								style={{
									backgroundColor: "white",
									border: "1px solid var(--gray-6)",
									borderRadius: "8px",
									padding: "12px",
									boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
									zIndex: 50,
								}}
							>
								<DayPicker
									mode="single"
									selected={selectedDate}
									onSelect={handleDateSelect}
									locale={ja}
									disabled={{ after: new Date() }}
									defaultMonth={selectedDate}
								/>
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
				</Flex>

				{/* セッション情報とパフォーマンスレーティング */}
				<Flex justify="between" align="center">
					<Flex direction="column" gap="1">
						<Text size="2" color="gray">
							セッション数
						</Text>
						<Text size="4" weight="bold">
							{report.sessionsCount} 回
						</Text>
					</Flex>
					<Flex direction="column" gap="1" align="end">
						<Text size="2" color="gray">
							合計時間
						</Text>
						<Text size="4" weight="bold">
							{report.totalDuration} 分
						</Text>
					</Flex>
					<Badge color={getRatingColor(report.performanceRating)} size="2">
						{getRatingLabel(report.performanceRating)}
					</Badge>
				</Flex>

				{/* 達成事項 */}
				{report.achievements.length > 0 && (
					<Flex direction="column" gap="2">
						<Text weight="medium">達成事項</Text>
						<Flex direction="column" gap="1" pl="3">
							{report.achievements.map((achievement, index) => (
								<Text
									key={`achievement-${
										// biome-ignore lint/suspicious/noArrayIndexKey: stable order
										index
									}`}
									size="2"
									color="green"
								>
									• {achievement}
								</Text>
							))}
						</Flex>
					</Flex>
				)}

				{/* 課題 */}
				{report.challenges.length > 0 && (
					<Flex direction="column" gap="2">
						<Text weight="medium">課題</Text>
						<Flex direction="column" gap="1" pl="3">
							{report.challenges.map((challenge, index) => (
								<Text
									key={`challenge-${
										// biome-ignore lint/suspicious/noArrayIndexKey: stable order
										index
									}`}
									size="2"
									color="orange"
								>
									• {challenge}
								</Text>
							))}
						</Flex>
					</Flex>
				)}

				{/* 明日の推奨事項 */}
				<Flex direction="column" gap="2">
					<Text weight="medium">明日の推奨練習</Text>
					<Flex direction="column" gap="1">
						<Text size="2" color="gray">
							推奨スキル:{" "}
							{report.tomorrowRecommendations.focusSkills.join(", ")}
						</Text>
						<Text size="2" color="gray">
							推奨時間: {report.tomorrowRecommendations.recommendedDuration}分
						</Text>
						<Text size="2" color="gray">
							推奨シナリオ:{" "}
							{report.tomorrowRecommendations.recommendedScenarios.join(", ")}
						</Text>
					</Flex>
				</Flex>
			</Flex>
		</Card>
	);
}
