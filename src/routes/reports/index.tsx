import { format } from "@formkit/tempo";
import { Box, Button, Card, Spinner, Text } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import useSWRMutation from "swr/mutation";
import { MessageContent } from "@/components/ai-elements/message.tsx";
import { Response } from "@/components/ai-elements/response.tsx";
import { AuthLayout } from "@/components/layout/auth.tsx";
import { Header } from "@/components/layout/header.tsx";
import { client } from "@/lib/client.ts";

export const Route = createFileRoute("/reports/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<AuthLayout>
			{(user) => (
				<>
					<Header threadId={user.id} />
					<Box py="4">
						<Text>Daily</Text>
						<Box p="4">
							<Card>
								<DailyReportPage userId={user.id} />
							</Card>
						</Box>
					</Box>

					<Box py="4">
						<Text>Weekly</Text>
						<Box p="4">
							<Card>
								<WeeklyReportPage userId={user.id} />
							</Card>
						</Box>
					</Box>

					<Box py="4">
						<Text>Monthly</Text>
						<Box p="4">
							<Card>
								<MonthlyReportPage userId={user.id} />
							</Card>
						</Box>
					</Box>
				</>
			)}
		</AuthLayout>
	);
}

function useDailyReport(userId: string, date: Date) {
	return useSWRMutation(
		["/api/reports/daily", userId, format(date)],
		async () => {
			const response = await client.api.reports.daily.$post({});
			return response.json();
		},
	);
}

function DailyReportPage({ userId }: { userId: string }) {
	const { trigger, data, error, isMutating } = useDailyReport(
		userId,
		new Date(),
	);

	if (isMutating) {
		return <Spinner />;
	}

	if (error) {
		return <Text color="red">{error}</Text>;
	}

	if (data) {
		return (
			<>
				<MessageContent>
					<Response>{data.message._output}</Response>
				</MessageContent>
			</>
		);
	}

	return (
		<>
			<Button onClick={() => trigger()}>Generate Daily Report</Button>
		</>
	);
}

function useWeeklyReport(userId: string, date: Date) {
	return useSWRMutation(
		["/api/reports/weekly", userId, format(date)],
		async () => {
			const response = await client.api.reports.weekly.$post({});
			return response.json();
		},
	);
}

function WeeklyReportPage({ userId }: { userId: string }) {
	const { trigger, data, error, isMutating } = useWeeklyReport(
		userId,
		new Date(),
	);

	if (isMutating) {
		return <Spinner />;
	}

	if (error) {
		return <Text color="red">{error}</Text>;
	}

	if (data) {
		return (
			<>
				<MessageContent>
					<Response>{data.message._output}</Response>
				</MessageContent>
			</>
		);
	}

	return (
		<>
			<Button onClick={() => trigger()}>Generate Weekly Report</Button>
		</>
	);
}

function useMonthlyReport(userId: string, date: Date) {
	return useSWRMutation(
		["/api/reports/monthly", userId, format(date)],
		async () => {
			const response = await client.api.reports.monthly.$post({});
			return response.json();
		},
	);
}

function MonthlyReportPage({ userId }: { userId: string }) {
	const { trigger, data, error, isMutating } = useMonthlyReport(
		userId,
		new Date(),
	);

	if (isMutating) {
		return <Spinner />;
	}

	if (error) {
		return <Text color="red">{error}</Text>;
	}

	if (data) {
		return (
			<>
				<MessageContent>
					<Response>{data.message._output}</Response>
				</MessageContent>
			</>
		);
	}

	return (
		<>
			<Button onClick={() => trigger()}>Generate Weekly Report</Button>
		</>
	);
}
