import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import type { MastraStorage } from "@mastra/core/storage";
import type { MastraVector } from "@mastra/core/vector";
import { LIBSQL_PROMPT } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { TokenLimiter, ToolCallFilter } from "@mastra/memory/processors";
import {
	addTextFileKnowledgeTool,
	addTextKnowledgeTool,
	addYoutubeContentTool,
	graphTool,
	vectorTool,
} from "../tools/rag-tool";
import {
	findAimlabTasksByUserId,
	findKovaaksScoresByUserId,
	findUser,
} from "../tools/user-tool";

// Enhanced memory configuration for personalized coaching
const createEnhancedMemory = (storage: MastraStorage, vector: MastraVector) =>
	new Memory({
		storage: storage,
		vector: vector,
		embedder: google.textEmbedding("text-embedding-004"),
		options: {
			lastMessages: 5,
			semanticRecall: {
				topK: 2,
				messageRange: 1,
				scope: "resource",
			},
			workingMemory: {
				enabled: true,
				template: `
# エイム練習者プロファイル

## 基本情報
- 名前: [ニックネーム/呼び方]
- ユーザーID: [認証済みユーザーID]
- 主なゲーム: [VALORANT, CS2, APEX等]
- 競技ランク: [現在のランク]
- 練習経験: [年数/期間]

## 練習習慣と特性
- 通常練習時間: [平日/休日の時間帯と長さ]
- 週間頻度: [回数/週]
- 好きなタスク: [gridshot, 1w6ts等の具体名]
- 苦手なタスク: [tracking, flick等]
- 集中できる時間: [分単位]

## コーチング個人設定
- コミュニケーションスタイル: [厳しめ, 励まし重視, データ重視, バランス型]
- 目標設定傾向: [短期集中, 長期継続, PR更新重視]
- 学習スタイル: [数値分析好き, 感覚重視, 比較分析好き]
- モチベーション要因: [PR更新, ランクアップ, 習慣化等]

## 練習履歴とパターン
- 現在のスキル帯: [Beginner/Intermediate/Advanced/Expert]
- 継続中の改善課題: [過剰射撃, tracking安定性等]
- 過去の成功パターン: [効果的だった練習法や時間帯]
- 失敗・挫折パターン: [避けるべき状況や方法]
- 最近の変化: [技術的改善点や課題]

## セッション記録
- 前回の相談内容: [具体的な相談事項]
- 前回からの変化: [データ的変化や感覚的変化]
- 今回の目標: [セッション終了時の達成目標]
- 次回までの宿題: [具体的な練習計画]

## 振り返り・継続改善記録
- 前回推奨実行状況: [completed/in_progress/not_started]
- パフォーマンス変化: [改善/悪化/安定 - 具体的数値や期間]
- 効果的だった指導: [特に効果の高かった推奨事項]
- 改善が必要な領域: [次回フォーカスすべき弱点]
- コーチング効果: [high/medium/low - 最近の指導の効果測定結果]
- 推奨の遵守率: [0-100% - 前回推奨事項の実行度]
`,
			},
		},
		processors: [
			new ToolCallFilter(),
			new TokenLimiter(1_048_576), // gemini 2.5 pro
		],
	});

export const createAimAiCoachAgent = (
	storage: MastraStorage,
	vector: MastraVector,
) =>
	new Agent({
		name: "Aim Ai Coach Agent",
		instructions: ({ runtimeContext }) => {
			const userId = runtimeContext.get("userId") as string | null;
			if (!userId) return "";

			return `
あなたは「Aim AI Coach」。FPS プレイヤーのエイム上達をデータ駆動で指導する userId: ${userId} の専属パーソナルコーチ。
ワーキングメモリで個人の特性を学習し、継続的な関係性を築いてパーソナライズした指導を行う。

# 目的
- プレイヤーの弱点を定量評価し、改善優先度を明確化
- 個人の特性に基づく練習計画を提示
- Mastra RAGツールにより高品質なコンテンツを活用した包括的指導
- ワーキングメモリを通じた継続的な成長支援
- kovaaks / aimlabs のスコアを利用して、熟練度に応じたアドバイスの提供

# 出力フォーマット
【振り返り&継続改善】【スキル帯&要約】【診断（根拠つき）】【練習プラン】【次のアクション】【計測】
※2回目以降のセッションでは冒頭に振り返り分析結果を表示
※検索結果が限定的な場合は既存知識を中心とした指導を実施

# Tools
- findUser: ユーザ情報の取得
- findKovaaksScoresByUserId: userId の kovaaks のスコアを取得
- findAimlabTasksByUserId: userId の aimlabs のスコアを取得
- vectorTool: RAG からエイムコーチや aimlabs や kovaaks のプレイリストに関する知識を取得
- graphTool: RAG に対して GraphRag を用いた検索を行う

ref for vectorTool and graphTool:
${LIBSQL_PROMPT}
`;
		},
		model: google("gemini-2.5-pro"),
		tools: {
			findUser,
			findKovaaksScoresByUserId,
			findAimlabTasksByUserId,
			// getKovaaksStatsByUserId,
			// getAimlabStatsByUserId,
			vectorTool: vectorTool,
			graphTool: graphTool,
			addYoutubeContentTool,
			addTextFileKnowledgeTool,
			addTextKnowledgeTool,
		},
		memory: createEnhancedMemory(storage, vector),
	});
