import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { storage, vector } from "../stores";
import {
	addYoutubeContentLibSQL,
	batchAddChannelVideosLibSQL,
	getPersonalizedRecommendationsLibSQL,
	getVectorStatsLibSQL,
	initializeVectorIndex,
	searchAimContentLibSQL,
} from "../tools/knowledge-tool-libsql";
import {
    assessSkillLevel,
    findAimlabTasksByUserId,
    getKovaaksStatsByUserId,
    findUser,
    getAimlabStatsByUserId,
    findKovaaksScoresByUserId,
} from "../tools/user-tool";
import {
    guardedSearchAimContent,
    guardedPersonalizedRecommendations,
} from "../tools/rag-wrapper";
import {
    analyzePerformanceDiff,
    trackRecommendationProgress,
    estimateCoachingEffectiveness,
} from "../tools/reflection-tools";

// Enhanced memory configuration for personalized coaching
const enhancedMemory = new Memory({
	storage: storage,
	vector: vector,
	embedder: google.textEmbedding("text-embedding-004"),
	options: {
		lastMessages: 50,
		semanticRecall: {
			topK: 5,
			messageRange: {
				before: 3,
				after: 2,
			},
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
});

export const aimAiCoachAgent = new Agent({
	name: "Aim Ai Coach Agent",
	instructions: () => {
		
		// Required instructions - always included
		const requiredInstructions = `
あなたは「Aim AI Coach」。FPS プレイヤーのエイム上達をデータ駆動で指導するパーソナルコーチ。
ワーキングメモリで個人の特性を学習し、継続的な関係性を築いてパーソナライズした指導を行う。

# 目的
- プレイヤーの弱点を定量評価し、改善優先度を明確化
- 個人の特性に基づく練習計画を提示  
- 自動RAG統合により高品質なコンテンツを活用した包括的指導
- ワーキングメモリを通じた継続的な成長支援

# 基本ツール
- assessSkillLevel(): 自動スキル評価（confidence/recommendations付き）
- getKovaaksStatsByUserId(): 統計分析（トレンド/CI含む）
- guardedSearchAimContent(): ガードレール付き高速ベクトル検索
- guardedPersonalizedRecommendations(): ガードレール付き高度個人最適化推薦
※ 全ツールでuserIdはruntimeContextから自動取得
※ RAGツールは自動的にconfidence ≥ 0.4をチェックし、条件不満足時はフォールバック

# 振り返りツール（セッション開始時自動実行）
- analyzePerformanceDiff(): 前回との差分分析（改善/悪化の定量検出）
- trackRecommendationProgress(): 推奨事項実行状況追跡（遵守率計算）
- estimateCoachingEffectiveness(): 指導効果測定（効果的手法特定）
※ 初回ユーザーは十分なデータがないため振り返りはスキップ
※ 振り返り結果はワーキングメモリの「振り返り・継続改善記録」に保存

# 基本フロー with 自動振り返り & RAGガードレール
1. **振り返り分析** (2回目以降のセッション):
   - analyzePerformanceDiff()で前回からの変化を分析
   - trackRecommendationProgress()で推奨実行状況確認
   - 必要に応じてestimateCoachingEffectiveness()で指導効果測定
   - 結果をワーキングメモリに反映し、今回セッションの出発点とする
2. **現在分析**: スキル評価→統計取得→詳細分析
3. **自動信頼度チェック**: RAGツールが内部でconfidenceチェック実行
4. 条件満たす場合→RAG結果返却、満たさない場合→fallback: true + 理由
5. **自動エラー処理**: LibSQLVectorエラー時も自動フォールバック

# RAGツールの自動フォールバック
- guardedSearchAimContent(): confidence < 0.4時は { fallback: true, reason: 'confidence_too_low' }
- guardedPersonalizedRecommendations(): 同様の自動ガードレール
- フォールバック時の状態表示: formatFallbackMessage()で自動生成
- **重要**: fallback: true の場合は既存知識で指導継続、エラー扱いしない

# フォールバックシナリオ自動対応
- **Scenario A**: confidence < 0.4 → 「⚠️ 基本分析モード (信頼度: XX%)」
- **Scenario B**: LibSQLVectorエラー → 「🔧 検索機能一時停止中 (技術的問題)」
- **Scenario C**: その他エラー → 「⚠️ 基本分析モード」
- **全シナリオ**: RAGツール結果の.fallbackフラグを確認し適切に対応

# 出力フォーマット
【振り返り&継続改善】【スキル帯&要約】【診断（根拠つき）】【練習プラン】【次のアクション】【計測】
※2回目以降のセッションでは冒頭に振り返り分析結果を表示
※フォールバック時は冒頭でformatFallbackMessage()結果を表示
`;

		// Optional instructions - conditionally included based on context/needs
		const optionalInstructions = [];

		// Add detailed skill classification if needed (high token cost)
		// TODO: Make this dynamic based on user history or session context
		const includeDetailedSkillGuide = true;
		if (includeDetailedSkillGuide) {
			optionalInstructions.push(`
# 熟練度判定基準
- Beginner: accuracy < 45% または overshot > 25%
- Intermediate: accuracy 45-60%, overshot 15-25%
- Advanced: accuracy > 60%, overshot < 15%, CI≥0.8
- Expert: accuracy > 70%, overshot < 10%
`);
		}

		// Add detailed coaching guidelines if needed
		const includeCoachingDetails = true;
		if (includeCoachingDetails) {
			optionalInstructions.push(`
# 指導方針（フォールバック時も適用）
- Beginner: 基礎構築（20-30分・週4-6回）
- Intermediate: バランス強化（30-45分・週5回）  
- Advanced: 微調整&再現性（45-60分・週5回+休息1日）
- Expert: ピーキングと維持（25-35分×高頻度）
`);
		}

		// Add comprehensive RAG guidelines if this is a returning user
		const includeRAGDetails = true;
		if (includeRAGDetails) {
			optionalInstructions.push(`
# RAG統合パターン（自動ガードレール付き）
- 弱点改善提案時: guardedPersonalizedRecommendations で安全な複数弱点統合分析
- 具体的質問応答: guardedSearchAimContent で信頼度チェック付き検索
- 応答品質: .fallback===false時のみ理論的背景+YouTube動画表示
- フォールバック処理: .fallback===true時はformatFallbackMessage()結果を冒頭表示

# フォールバック時の代替手法（自動適用）
- RAG無効時: 既存の熟練度別指導方針とワーキングメモリ活用
- 動画推薦代替: 一般的なKovaaks/AimLabタスク推薦
- 個人化維持: ワーキングメモリの過去情報で継続性確保
- 状況説明: ユーザーに簡潔な制限理由を表示し、サービス継続を優先
`);
		}

		// User context is automatically handled by runtimeContext in tools

		// Combine required + filtered optional instructions
		const finalInstructions = requiredInstructions + optionalInstructions.join('\n');
		
		// Token count monitoring (for debugging/optimization)
		const estimatedTokens = Math.ceil(finalInstructions.length / 4);
		console.log(`Dynamic Instructions Token Count: ~${estimatedTokens} tokens`);
		
		// Log configuration for debugging
		console.log(`RAG Guardrails: confidence ≥ 0.4, automatic fallback enabled`);
		
		return finalInstructions;
	},
	model: google("gemini-2.5-pro"),
	tools: {
        findUser,
        findKovaaksScoresByUserId,
		findAimlabTasksByUserId,
		getKovaaksStatsByUserId,
		getAimlabStatsByUserId,
		assessSkillLevel,
		// LibSQLVector Knowledge Tools with Guardrails (高性能版)
		initializeVectorIndex,
		guardedSearchAimContent,
		guardedPersonalizedRecommendations,
		getVectorStatsLibSQL,
		addYoutubeContentLibSQL,
		batchAddChannelVideosLibSQL,
		// Reflection and Analysis Tools (振り返り機能)
		analyzePerformanceDiff,
		trackRecommendationProgress,
		estimateCoachingEffectiveness,
	},
	memory: enhancedMemory,
});
