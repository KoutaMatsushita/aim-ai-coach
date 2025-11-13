"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { client } from "@/lib/client";
import type { CoachingPhase, UserContext } from "../../../api/langgraph/types";

// コンテキスト値の型定義
export interface CoachingContextValue {
	// コンテキストデータ
	userId: string;
	userContext: UserContext | undefined;
	currentPhase: CoachingPhase | undefined;
	daysInactive: number | undefined;
	newScoresCount: number | undefined;
	hasPlaylist: boolean | undefined;
	isNewUser: boolean | undefined;

	// 状態管理
	isLoading: boolean;
	isError: boolean;
	error: Error | null;

	// アクション
	refetch: () => void;
}

// React Context作成
const CoachingContext = createContext<CoachingContextValue | undefined>(
	undefined,
);

// Provider Props
interface CoachingContextProviderProps {
	userId: string;
	children: React.ReactNode;
}

export function CoachingContextProvider({
	userId,
	children,
}: CoachingContextProviderProps) {
	// TanStack Queryでコーチングコンテキストを取得
	const {
		data: contextData,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ["coaching", "context", userId],
		queryFn: async () => {
			const res = await client.api.coaching.context.$get({
				query: { userId },
			});

			if (!res.ok) {
				throw new Error(`API error: ${res.status}`);
			}

			return await res.json();
		},
		staleTime: 5 * 60 * 1000, // 5分
		gcTime: 10 * 60 * 1000, // 10分 (旧 cacheTime)
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
	});

	// UserContext の推定（CoachingContext から導出）
	const userContext: UserContext | undefined = contextData
		? contextData.isNewUser
			? "new_user"
			: contextData.daysInactive >= 7
				? "returning_user"
				: contextData.needsPlaylist
					? "playlist_recommended"
					: contextData.hasRecentScores
						? "analysis_recommended"
						: "active_user"
		: undefined;

	const value: CoachingContextValue = {
		userId,
		userContext,
		currentPhase: contextData?.currentPhase,
		daysInactive: contextData?.daysInactive,
		newScoresCount: contextData?.newScoresCount,
		hasPlaylist: contextData?.currentPlaylist !== null,
		isNewUser: contextData?.isNewUser,
		isLoading,
		isError,
		error: error as Error | null,
		refetch,
	};

	return (
		<CoachingContext.Provider value={value}>
			{children}
		</CoachingContext.Provider>
	);
}

// カスタムフック
export function useCoachingContext(): CoachingContextValue {
	const context = useContext(CoachingContext);

	if (context === undefined) {
		throw new Error(
			"useCoachingContext must be used within a CoachingContextProvider (CoachingContextProviderでラップされていません)",
		);
	}

	return context;
}
