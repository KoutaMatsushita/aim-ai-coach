import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
	Table,
	Select,
	Container,
	Heading,
	Text,
	Box,
	Flex,
	Card,
	TextField,
} from "@radix-ui/themes";
import type { ChangeEvent } from "react";
import { client } from "@/lib/client";
import { format, addMonth } from "@formkit/tempo";

// Define search params validation
type StatsSearch = {
	period?: "day" | "week" | "month";
	startDate?: string;
	endDate?: string;
};

export const Route = createFileRoute("/stats")({
	component: StatsPage,
	validateSearch: (search: Record<string, unknown>): StatsSearch => {
		return {
			period: (search.period as "day" | "week" | "month") || "day",
			startDate: (search.startDate as string) || undefined,
			endDate: (search.endDate as string) || undefined,
		};
	},
});

function StatsPage() {
	const search = useSearch({ from: "/stats" });
	const navigate = useNavigate({ from: "/stats" });
	const period = search.period || "day";

	// Default to last 3 months
	const now = new Date();
	const defaultStartDate = format(addMonth(now, -3), "YYYY-MM-DD");
	const defaultEndDate = format(now, "YYYY-MM-DD");

	const startDate = search.startDate || defaultStartDate;
	const endDate = search.endDate || defaultEndDate;

	const { data, isLoading } = useQuery({
		queryKey: ["stats", period, startDate, endDate],
		queryFn: async () => {
			const res = await client.api.stats.$get({
				query: {
					period,
					startDate,
					endDate,
				},
			});
			if (!res.ok) throw new Error("Failed to fetch stats");
			return res.json();
		},
	});

	const handlePeriodChange = (value: string) => {
		navigate({
			search: { ...search, period: value as "day" | "week" | "month" },
		});
	};

	const handleDateChange = (key: "startDate" | "endDate", value: string) => {
		navigate({
			search: { ...search, [key]: value || undefined },
		});
	};

	return (
		<Container size="4" className="py-8 px-4">
			<Flex direction="column" gap="6">
				<Flex
					justify="between"
					align="center"
					direction={{ initial: "column", sm: "row" }}
					gap="4"
				>
					<Heading size="6">Task Statistics</Heading>
					<Flex
						gap="4"
						align="center"
						direction={{ initial: "column", sm: "row" }}
						width={{ initial: "100%", sm: "auto" }}
					>
						<Flex gap="2" align="center" width={{ initial: "100%", sm: "auto" }}>
							<Text size="2" color="gray">
								Range:
							</Text>
							<Box flexGrow="1">
								<TextField.Root
									type="date"
									className="text-sm"
									value={startDate}
									onChange={(e: ChangeEvent<HTMLInputElement>) =>
										handleDateChange("startDate", e.target.value)
									}
								/>
							</Box>
							<Text size="2" color="gray">
								-
							</Text>
							<Box flexGrow="1">
								<TextField.Root
									type="date"
									className="text-sm"
									value={endDate}
									onChange={(e: ChangeEvent<HTMLInputElement>) =>
										handleDateChange("endDate", e.target.value)
									}
								/>
							</Box>
						</Flex>
						<Flex
							gap="2"
							align="center"
							width={{ initial: "100%", sm: "auto" }}
							justify={{ initial: "between", sm: "start" }}
						>
							<Text size="2" color="gray">
								Period:
							</Text>
							<Select.Root value={period} onValueChange={handlePeriodChange}>
								<Select.Trigger />
								<Select.Content>
									<Select.Item value="day">Daily</Select.Item>
									<Select.Item value="week">Weekly</Select.Item>
									<Select.Item value="month">Monthly</Select.Item>
								</Select.Content>
							</Select.Root>
						</Flex>
					</Flex>
				</Flex>

				<Card>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.ColumnHeaderCell>Task Name</Table.ColumnHeaderCell>
								<Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
								<Table.ColumnHeaderCell>Count</Table.ColumnHeaderCell>
								<Table.ColumnHeaderCell>p10</Table.ColumnHeaderCell>
								<Table.ColumnHeaderCell>p25</Table.ColumnHeaderCell>
								<Table.ColumnHeaderCell>p50</Table.ColumnHeaderCell>
								<Table.ColumnHeaderCell>p75</Table.ColumnHeaderCell>
								<Table.ColumnHeaderCell>p90</Table.ColumnHeaderCell>
								<Table.ColumnHeaderCell>p99</Table.ColumnHeaderCell>
							</Table.Row>
						</Table.Header>

						<Table.Body>
							{isLoading ? (
								<Table.Row>
									<Table.Cell colSpan={9}>
										<Text align="center">Loading...</Text>
									</Table.Cell>
								</Table.Row>
							) : data?.data?.length === 0 ? (
								<Table.Row>
									<Table.Cell colSpan={9}>
										<Text align="center">No data found</Text>
									</Table.Cell>
								</Table.Row>
							) : (
								data?.data?.map((item) => (
									<Table.Row key={`${item.taskName}-${item.date}`}>
										<Table.Cell>
											<Text weight="bold">{item.taskName}</Text>
										</Table.Cell>
										<Table.Cell>{item.date}</Table.Cell>
										<Table.Cell>{item.count}</Table.Cell>
										<Table.Cell>{Math.round(item.p10)}</Table.Cell>
										<Table.Cell>{Math.round(item.p25)}</Table.Cell>
										<Table.Cell>{Math.round(item.p50)}</Table.Cell>
										<Table.Cell>{Math.round(item.p75)}</Table.Cell>
										<Table.Cell>{Math.round(item.p90)}</Table.Cell>
										<Table.Cell>{Math.round(item.p99)}</Table.Cell>
									</Table.Row>
								))
							)}
						</Table.Body>
					</Table.Root>
				</Card>
			</Flex>
		</Container>
	);
}
