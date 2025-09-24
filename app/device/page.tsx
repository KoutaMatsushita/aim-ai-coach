import { headers } from "next/headers";
import { forbidden } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Device({
	searchParams,
}: {
	searchParams?: Promise<{ [key: string]: string }>;
}) {
	const resolvedSearchParams = await searchParams;
	const userCode = resolvedSearchParams?.user_code;
	if (!userCode) {
		forbidden();
	}

	const { success } = await auth.api.deviceApprove({
		body: { userCode: userCode! },
		headers: await headers(),
	});

	if (success) {
		return <p>success</p>;
	} else {
		return <p>error</p>;
	}
}
