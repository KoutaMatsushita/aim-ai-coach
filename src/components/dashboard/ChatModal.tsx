import { Dialog, IconButton, Flex } from "@radix-ui/themes";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { AimAssistant } from "../AimAssistant";

interface ChatModalProps {
	userId: string;
}

export function ChatModal({ userId }: ChatModalProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			{/* 固定位置のチャットアイコンボタン */}
			<IconButton
				size="4"
				radius="full"
				onClick={() => setOpen(true)}
				style={{
					position: "fixed",
					bottom: "24px",
					right: "24px",
					zIndex: 1000,
					boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
				}}
				aria-label="チャットを開く"
			>
				<MessageCircle size={24} />
			</IconButton>

			{/* フルスクリーンモーダル */}
			<Dialog.Root open={open} onOpenChange={setOpen}>
				<Dialog.Content
					maxWidth="900px"
					style={{
						maxHeight: "90vh",
						height: "90vh",
					}}
				>
					<Dialog.Title>AI コーチチャット</Dialog.Title>
					<Dialog.Description size="2" mb="3">
						コーチング、練習プラン、スコア分析について質問できます
					</Dialog.Description>

					{/* AimAssistant統合 */}
					<Flex
						direction="column"
						style={{
							height: "calc(90vh - 120px)",
							overflow: "hidden",
						}}
					>
						<AimAssistant userId={userId} />
					</Flex>

					{/* 閉じるボタン */}
					<Dialog.Close>
						<IconButton
							size="2"
							variant="ghost"
							style={{
								position: "absolute",
								top: "12px",
								right: "12px",
							}}
							aria-label="close"
						>
							<X size={18} />
						</IconButton>
					</Dialog.Close>
				</Dialog.Content>
			</Dialog.Root>
		</>
	);
}
