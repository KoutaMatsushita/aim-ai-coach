import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import type { MastraStorage } from "@mastra/core/storage";
import type { MastraVector } from "@mastra/core/vector";
import { LIBSQL_PROMPT } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { TokenLimiter, ToolCallFilter } from "@mastra/memory/processors";
import { graphTool, vectorTool } from "../tools/rag-tool";
import {
	findAimlabTasksByUserId,
	findKovaaksScoresByUserId,
} from "../tools/user-tool.ts";

// Enhanced memory configuration for personalized coaching
const createEnhancedMemory = (storage: MastraStorage, vector: MastraVector) =>
	new Memory({
		storage: storage,
		vector: vector,
		embedder: google.textEmbedding("text-embedding-004"),
		options: {
			lastMessages: 1,
			semanticRecall: {
				topK: 1,
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
		processors: [new ToolCallFilter(), new TokenLimiter(128_000)],
	});

export const createWeeklyReportAgent = (
	storage: MastraStorage,
	vector: MastraVector,
) =>
	new Agent({
		name: "Weekly Report Agent",
		instructions: ({ runtimeContext }) => {
			const userId = runtimeContext.get("userId") as string | null;
			if (!userId) return "";

			return `
あなたは「Weekly Report Agent」。FPS プレイヤーのエイム上達をデータ駆動で指導する userId: ${userId} のスコアを解析し、ウィークリーレポートを提供する。
ワーキングメモリから個人の特性を理解し、パーソナライズしたレポートを生成する

# 目的
- 傾向や前回の様子からの変化を明確化
- プレイヤーの弱点を定量評価し、改善優先度を明確化
- ワーキングメモリを通じた継続的な成長支援
- kovaaks / aimlabs のスコアを利用して、熟練度に応じたアドバイスの提供

# 出力フォーマット
提供されたスコアデータのシナリオ全て列挙し、以下のフォーマットに起こす。
以下のフォーマットを厳守する。

\`\`\`
[シナリオ名]
- プレイ数
- 平均スコア
- 平均命中率
- 一言コメント
\`\`\`

【GOOD】
-　良かった点を述べる
-　スコアが向上したシナリオなど 

【BAD】
- 改善点を述べる
- スコアが極端に低下したシナリオなど

【TRY】
- 今回の結果を受けて、次回に試してみることの提案
- 目的や意図を明確にすること

【総括】
- 過去データと比較し、スコアが変動したシナリオについて、スコアを比較する。

# Tool について
レポートの作成に過去データが必要な場合、必ず findKovaaksScoresByUserId や findAimlabTasksByUserId を使って取得すること。

ref for vectorTool and graphTool:
${LIBSQL_PROMPT}
`;
		},
		model: google("gemini-3-pro-preview"),
		tools: {
			vectorTool: vectorTool,
			graphTool: graphTool,
			findKovaaksScoresByUserId,
			findAimlabTasksByUserId,
		},
		memory: createEnhancedMemory(storage, vector),
	});
