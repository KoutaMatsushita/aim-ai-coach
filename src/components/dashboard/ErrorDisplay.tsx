import { Button, Callout, Flex, Text } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, FileQuestion, RefreshCw } from "lucide-react";
import { useEffect } from "react";

interface ErrorDisplayProps {
	error: Error | string;
	onRetry?: () => void;
	"data-testid"?: string;
}

/**
 * 統一エラー表示コンポーネント
 * - 401: ログインページへリダイレクト
 * - 404: エンプティステート表示
 * - 500: リトライボタン表示
 * - その他: エラーメッセージとリトライボタン
 */
export function ErrorDisplay({ error, onRetry, ...props }: ErrorDisplayProps) {
	const navigate = useNavigate();

	// エラーメッセージとステータスコードを抽出
	const errorMessage =
		typeof error === "string" ? error : error.message || "エラーが発生しました";
	const statusCode =
		typeof error === "object" && error !== null
			? (error as any).status
			: undefined;

	// 401エラーの場合、ログインページへリダイレクト
	useEffect(() => {
		if (statusCode === 401) {
			navigate({ to: "/login" });
		}
	}, [statusCode, navigate]);

	// 404エラーの場合、エンプティステート表示
	if (statusCode === 404) {
		return (
			<Callout.Root color="gray" {...props}>
				<Callout.Icon>
					<FileQuestion size={20} />
				</Callout.Icon>
				<Flex direction="column" gap="2">
					<Callout.Text weight="bold">
						データが見つかりませんでした
					</Callout.Text>
					<Text size="2" color="gray">
						{errorMessage}
					</Text>
				</Flex>
			</Callout.Root>
		);
	}

	// 500エラーの場合、サーバーエラーメッセージ
	const displayMessage =
		statusCode === 500 ? "サーバーエラーが発生しました" : errorMessage;

	return (
		<Callout.Root color="red" {...props}>
			<Callout.Icon>
				<AlertCircle size={20} />
			</Callout.Icon>
			<Flex direction="column" gap="3" style={{ flex: 1 }}>
				<Flex direction="column" gap="1">
					<Callout.Text weight="bold">{displayMessage}</Callout.Text>
					{statusCode && (
						<Text size="1" color="gray">
							ステータスコード: {statusCode}
						</Text>
					)}
				</Flex>
				{onRetry && (
					<Flex>
						<Button
							size="2"
							variant="soft"
							color="red"
							onClick={onRetry}
							style={{ cursor: "pointer" }}
						>
							<RefreshCw size={16} />
							再試行
						</Button>
					</Flex>
				)}
			</Flex>
		</Callout.Root>
	);
}
