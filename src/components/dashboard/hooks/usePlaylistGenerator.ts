import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/client";
import type { Playlist } from "../../../../api/langgraph/types";

export interface PlaylistGenerationInput {
	targetGame?: string;
	weakAreas: string[];
}

export interface UsePlaylistGeneratorResult {
	playlist: Playlist | undefined;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	generatePlaylist: (input: PlaylistGenerationInput) => void;
}

export function usePlaylistGenerator(
	userId: string
): UsePlaylistGeneratorResult {
	const queryClient = useQueryClient();

	const {
		data: playlist,
		isPending: isLoading,
		isError,
		error,
		mutate: generatePlaylist,
	} = useMutation({
		mutationFn: async (input: PlaylistGenerationInput) => {
			// クライアント側バリデーション
			if (!input.weakAreas || input.weakAreas.length === 0) {
				throw new Error("weakAreas must have at least one item");
			}

			const res = await client.api.coaching.playlist.$post({
				json: {
					userId,
					targetGame: input.targetGame,
					weakAreas: input.weakAreas,
				},
			});

			if (!res.ok) {
				throw new Error(`API error: ${res.status}`);
			}

			return await res.json();
		},
		onSuccess: (data) => {
			// キャッシュ更新
			queryClient.setQueryData(["coaching", "playlist", userId], data);
		},
		// POSTはユーザーアクション必要、自動リトライしない
		retry: false,
	});

	return {
		playlist,
		isLoading,
		isError,
		error: error as Error | null,
		generatePlaylist,
	};
}
