import { Flex, Skeleton } from "@radix-ui/themes";

/**
 * Dialog用のSuspenseフォールバックUI
 * AnalysisDialogとPlaylistDialogの遅延ロード中に表示される
 */
export function DialogSkeleton() {
	return (
		<Flex direction="column" gap="4" p="4" data-testid="dialog-skeleton">
			<Skeleton height="24px" width="60%" />
			<Skeleton height="16px" width="80%" />
			<Skeleton height="200px" width="100%" />
			<Flex gap="2">
				<Skeleton height="16px" width="30%" />
				<Skeleton height="16px" width="30%" />
			</Flex>
		</Flex>
	);
}

/**
 * ChatModal用のSuspenseフォールバックUI
 * ChatModalの遅延ロード中に表示される
 */
export function ChatModalSkeleton() {
	return (
		<Flex
			direction="column"
			gap="3"
			p="4"
			data-testid="chat-modal-skeleton"
			style={{ height: "100%" }}
		>
			<Skeleton height="32px" width="50%" />
			<Skeleton height="16px" width="70%" />
			<Flex direction="column" gap="2" style={{ flex: 1 }}>
				<Skeleton height="60px" width="100%" />
				<Skeleton height="60px" width="100%" />
				<Skeleton height="60px" width="100%" />
			</Flex>
			<Skeleton height="40px" width="100%" />
		</Flex>
	);
}
