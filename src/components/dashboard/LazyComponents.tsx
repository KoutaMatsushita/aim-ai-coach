import { lazy } from "react";

/**
 * パフォーマンス最適化のためのReact.lazy遅延ロードコンポーネント
 *
 * 大きなコンポーネントをコード分割し、初回バンドルサイズを削減する:
 * - AnalysisDialog: スコア分析結果表示（チャート含む）
 * - PlaylistDialog: プレイリスト生成結果表示
 * - ChatModal: チャット機能（AimAssistant統合）
 */

export const LazyAnalysisDialog = lazy(() =>
	import("./AnalysisDialog").then((module) => ({
		default: module.AnalysisDialog,
	})),
);

export const LazyPlaylistDialog = lazy(() =>
	import("./PlaylistDialog").then((module) => ({
		default: module.PlaylistDialog,
	})),
);

export const LazyChatModal = lazy(() =>
	import("./ChatModal").then((module) => ({
		default: module.ChatModal,
	})),
);
