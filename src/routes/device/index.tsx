import { authClient } from "@/lib/auth/client.ts";
import { Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const DeviceSearchSchema = z.object({
	user_code: z.string().min(1),
});

export const Route = createFileRoute("/device/")({
	component: Device,
	validateSearch: DeviceSearchSchema,
});

function Device() {
	const { user_code: userCode } = Route.useSearch();

	const { data, error, isLoading } = useQuery({
		queryKey: ["device-approve", userCode],
		enabled: !!userCode,
		queryFn: async () => {
			return await authClient.device.approve({ userCode: userCode });
		},
	});

	if (isLoading) return <Text>processing…</Text>;

	if (data?.data) {
		return <Text>success</Text>;
	}

	return <Text>error: {JSON.stringify(error ?? data?.error, null, 2)}</Text>;
}
