import { Container, Flex, Grid } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import {
	CoachingContextProvider,
	useCoachingContext,
} from "@/components/dashboard/CoachingContextProvider";
import { CoachingStatusCard } from "@/components/dashboard/CoachingStatusCard";
import { DailyReportCard } from "@/components/dashboard/DailyReportCard";
import { LazyChatModal } from "@/components/dashboard/LazyComponents";
import { PlaylistGeneratorCard } from "@/components/dashboard/PlaylistGeneratorCard";
import { ProgressReviewCard } from "@/components/dashboard/ProgressReviewCard";
import { ScoreAnalysisCard } from "@/components/dashboard/ScoreAnalysisCard";
import { ChatModalSkeleton } from "@/components/dashboard/SuspenseFallback";
import { AuthLayout } from "@/components/layout/auth";

export const Route = createFileRoute("/dashboard/")({
	component: DashboardPage,
});

function DashboardContent({ userId }: { userId: string }) {
	const { userContext } = useCoachingContext();

	return (
		<>
			<Container size="4">
				<Flex direction="column" gap="4" py="6">
					<Grid
						columns={{ initial: "1", sm: "1", md: "2", lg: "3" }}
						gap="4"
						width="auto"
					>
						<CoachingStatusCard userId={userId} />
						<DailyReportCard userId={userId} />
						<ScoreAnalysisCard userId={userId} />
						<PlaylistGeneratorCard userId={userId} />
						{userContext && (
							<ProgressReviewCard userId={userId} userContext={userContext} />
						)}
					</Grid>
				</Flex>
			</Container>

			{/* 固定チャットボタンとモーダル（遅延ロード） */}
			<Suspense fallback={<ChatModalSkeleton />}>
				<LazyChatModal userId={userId} />
			</Suspense>
		</>
	);
}

function DashboardPage() {
	return (
		<AuthLayout>
			{(user) => (
				<CoachingContextProvider userId={user.id}>
					<DashboardContent userId={user.id} />
				</CoachingContextProvider>
			)}
		</AuthLayout>
	);
}
