import { authClient } from "@/lib/auth/client.ts";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const DeviceSearchSchema = z.object({
	userCode: z.string().min(1),
});

export const Route = createFileRoute("/device/")({
	component: Device,
	validateSearch: DeviceSearchSchema,
});

function Device() {
	const { userCode } = Route.useSearch();

	const { data, error, isLoading } = useQuery({
		queryKey: ["device-approve", userCode],
		enabled: !!userCode,
		queryFn: async () => {
			return await authClient.device.approve({ userCode: userCode });
		},
	});

	if (isLoading) return <p>processing…</p>;

	if (data?.data) {
		return <p>success</p>;
	}

	return <p>error: {JSON.stringify(error ?? data?.error, null, 2)}</p>;
}
