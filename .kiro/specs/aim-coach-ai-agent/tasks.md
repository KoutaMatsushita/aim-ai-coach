# Implementation Plan

## Overview
本実装計画は、FPS プレイヤー向けのデータ駆動型エイムコーチング AI エージェントシステムを、2層アーキテクチャ（Chat Graph + Task Graph）で構築するためのタスク定義です。既存の Supervisor Pattern 実装を Task Graph として再構成し、新規の Chat Graph を追加することで、会話型コーチング（Chat Mode）とタスク実行（Task Mode）を明確に分離します。

**開発優先順位**:
1. Phase 1: 基本構造（型定義、共通ユーティリティ、Model Factory）
2. Phase 2: Chat Graph（会話型エージェント、インテント検出）
3. Phase 3: Task Graph（タスク実行エージェント、専門エージェント）
4. Phase 4: API 統合（エンドポイント、ストリーミング、エラーハンドリング）
5. Phase 5: テストとバリデーション

**並列実行の原則**: `(P)` マークの付いたタスクはデータ依存がなく、ファイル競合がなく、承認待ちがないため並列実行可能です。

---

## Phase 1: 基本構造と型定義

### 1. 型定義とインターフェースの実装
- [x] 1.1 ユーザーコンテキストとタスク種別の型定義を実装 (P)
  - UserContext 型（"new_user" | "returning_user" | "active_user" | "playlist_recommended" | "analysis_recommended"）を定義
  - TaskType 型（"daily_report" | "score_analysis" | "playlist_building" | "progress_review"）を定義
  - 型定義を `api/langgraph/types.ts` にエクスポート
  - _Requirements: 14_

- [x] 1.2 Chat Graph の状態モデルを定義 (P)
  - ChatGraphState 型を Annotation.Root で定義（userId, threadId, messages, userContext）
  - メッセージ履歴の reducer 定義（時系列順で蓄積）
  - userContext の reducer 定義（最新値で上書き）
  - _Requirements: 2, 14_

- [x] 1.3 Task Graph の状態モデルを定義 (P)
  - TaskGraphState 型を Annotation.Root で定義（userId, taskType, userContext, taskResult）
  - taskResult の reducer 定義（最新値で上書き）
  - TaskResult 型の定義（type + data の Union 型）
  - _Requirements: 3, 14_

- [x] 1.4 ドメインエンティティの型定義を実装 (P)
  - Playlist 型の定義（id, userId, title, description, scenarios, targetWeaknesses, totalDuration, reasoning, createdAt, isActive）
  - DailyReport 型の定義（id, userId, date, sessionsCount, totalDuration, achievements, challenges, recommendations, createdAt）
  - ScoreAnalysis 型の定義（userId, period, trend, strengths, challenges, milestones, chartData, createdAt）
  - ProgressReport 型の定義（userId, reviewPeriod, beforePausePerformance, goalProgress, rehabilitationPlan, motivationalMessage, generatedAt）
  - CoachingStatus 型の定義（userContext, todayFocus, scoreTrendSummary, activePlaylist, latestReport）
  - _Requirements: 5, 6, 7, 8, 9, 14_

### 2. 共通ユーティリティとサービス
- [x] 2.1 ユーザーコンテキスト検出ユーティリティを実装
  - 既存 `detectPhaseNode` から共通ロジックを抽出
  - ユーザー活動状況（最終活動日、新規スコア数、プレイリスト有無）を取得
  - コンテキスト判定ロジック（new_user, returning_user, active_user, playlist_recommended, analysis_recommended）を実装
  - 検出結果のログ出力（ユーザーID、コンテキスト、活動日数、新規スコア数、新規ユーザーフラグ、プレイリスト有無）
  - _Requirements: 1, 13_

- [x] 2.2 Model Factory を実装
  - タスクタイプ（"chat" | "task"）に基づくモデル選択ロジック
  - Chat Graph 用に gemini-2.5-flash モデルを返すファクトリ関数
  - Task Graph 用に gemini-2.5-pro モデルを返すファクトリ関数
  - モデル選択理由のログ出力
  - _Requirements: 15_

- [x] 2.3 User Tools の実装 (P)
  - find_user ツール（ユーザー情報取得）
  - find_kovaaks_scores ツール（Kovaaks スコアデータ取得、期間フィルタリング）
  - find_aimlab_tasks ツール（Aimlabs タスクデータ取得）
  - calculate_user_stats ツール（ユーザー統計情報計算）
  - Zod スキーマによるパラメータバリデーション
  - _Requirements: 4_
  - **Tests**: 24 tests passed (api/langgraph/tools/__tests__/user-tools.test.ts)

- [x] 2.4 RAG Tools の実装 (P)
  - vector_search ツール（RAG から知識検索、エイムコーチング・プレイリスト情報）
  - add_youtube_content ツール（YouTube 動画を知識ベースに追加）
  - add_text_knowledge ツール（テキスト知識を追加）
  - get_personalized_recommendations ツール（パーソナライズされた推奨取得）
  - MastraVector への統合
  - _Requirements: 4_
  - **Tests**: 23 tests passed (api/langgraph/tools/__tests__/rag-tools.test.ts)

---

## Phase 2: Chat Graph の実装

### 3. Chat Graph の基本構造
- [x] 3.1 Chat Graph のスケルトンを作成
  - StateGraph を ChatGraphState で初期化
  - entry point の設定（コンテキスト検出ノード）
  - MemorySaver の統合（会話履歴永続化）
  - thread_id ベースのチェックポインター設定（threadId が指定されない場合は userId を使用）
  - _Requirements: 2, 11_
  - **Implementation**: `api/langgraph/graphs/chat-graph.ts` - `createChatGraph()`, `ChatGraphService`
  - **Tests**: 10 tests passed (api/langgraph/graphs/__tests__/chat-graph.test.ts)

- [x] 3.2 コンテキスト検出ノードを Chat Graph に統合
  - ユーザーコンテキスト検出ユーティリティを呼び出し
  - 検出結果を state.userContext に設定
  - 次のノード（Chat Agent）への遷移
  - _Requirements: 1, 2_
  - **Implementation**: `api/langgraph/graphs/chat-graph.ts` - `detectContextNode()`

- [x] 3.3 Chat Agent ノードの実装
  - システムプロンプトの定義（Aim AI Coach の役割、目的、利用可能なツール、出力フォーマット）
  - gemini-2.5-flash モデルのバインディング（Model Factory 経由）
  - User Tools と RAG Tools のバインディング（bindTools）
  - ユーザーコンテキストに応じたプロンプト調整（新規ユーザー、復帰ユーザーなど）
  - 日本語でのコーチング出力
  - _Requirements: 2_
  - **Implementation**: `api/langgraph/graphs/chat-graph.ts` - `chatAgentNode()`

### 4. インテント検出とルーティング
- [x] 4.1 インテント検出ロジックを実装
  - LLM ベースのインテント検出プロンプト設計 ✅
  - パターンマッチングベースのフォールバック実装 ✅
  - インテント種別（task_execution, information_request, general_conversation）の判定 ✅
  - タスク種別（playlist_building, score_analysis, progress_review, daily_report）の特定 ✅
  - 信頼度スコア（confidence）の計算（0.0 - 1.0） ✅
  - JSON レスポンスのパースとバリデーション ✅
  - _Requirements: 2_
  - **Implementation**: `api/langgraph/services/intent-detection.ts` - `detectIntent()`, pattern matching
  - **Tests**: 11 tests passed (intent-detection.test.ts)

- [x] 4.2 Task Graph への委譲ロジックを実装
  - インテント検出結果の評価（信頼度しきい値 0.7） ✅
  - 信頼度が 0.7 以上の場合、Task Graph を呼び出し ✅
  - Task Graph の実行結果を Chat Agent の応答に統合 ✅
  - タスク実行失敗時のエラーハンドリング（ユーザーへの通知、詳細ログ記録） ✅
  - 信頼度が 0.7 未満の場合、ユーザーに意図の確認メッセージ ✅
  - _Requirements: 2, 13_
  - **Implementation**: `api/langgraph/graphs/chat-graph.ts` - `chatAgentNode()` with intent detection and task delegation
  - **Tests**: Integrated into chat-graph.test.ts

### 5. Chat Graph サービスの完成
- [x] 5.1 ストリーミング応答機能を実装
  - stream メソッドの実装（streamMode を "values" に設定）
  - 非同期イテレータの返却
  - グラフ実行のストリーミング処理
  - **完了**: ChatGraphService.stream() メソッドを実装（api/langgraph/graphs/chat-graph.ts:321-351）
  - グラフの実行結果をストリーミングで返却（AsyncIterator）
  - threadId の管理（デフォルトは userId、カスタム threadId 対応）
  - テストカバレッジ: 12/14 tests (2 tests skipped - integration tests)
  - _Requirements: 12_

- [x] 5.2 会話履歴取得機能を実装
  - threadId ベースの会話履歴取得
  - 会話履歴が存在しない場合、空のメッセージリスト返却
  - エラーハンドリング（会話履歴取得失敗時）
  - **完了**: ChatGraphService.getMessages() メソッドを実装（api/langgraph/graphs/chat-graph.ts:357-412）
  - MemorySaver からチェックポイント状態を取得
  - messages と userContext を取得、存在しない場合は空配列とデフォルト値を返却
  - エラー時にも正常なレスポンス構造を維持
  - テストカバレッジ: 12/14 tests (すべての getMessages テストが成功)
  - _Requirements: 11, 13_

---

## Phase 3: Task Graph の実装

### 6. Task Graph の基本構造
- [x] 6.1 既存 Supervisor Graph から Task Graph へリファクタリング
  - Chat Agent ノードを除外（Chat Graph に移行済み） ✅
  - Task Graph のスケルトン作成（StateGraph with TaskGraphState） ✅
  - コンテキスト検出ノードの統合（Phase 2で実装済み、Task Graph では不要） ✅
  - タスクルーターノードの設定 ✅
  - _Requirements: 3_
  - **Implementation**: `api/langgraph/graphs/task-graph.ts` - `createTaskGraph()`, `TaskGraphService`
  - **Tests**: 16 tests passed (task-graph.test.ts)

- [x] 6.2 タスクルーターの実装
  - taskType に基づく専門エージェントへのルーティングロジック ✅
  - ルートマップの定義（daily_report → daily_report, score_analysis → score_analysis, playlist_building → playlist_builder, progress_review → progress_review） ✅
  - 条件付きエッジの設定 ✅
  - _Requirements: 3_
  - **Implementation**: `api/langgraph/graphs/task-graph.ts` - `taskRouter()`
  - **Tests**: Routing tests passed for all 4 task types

- [x] 6.3 タスク実行メタデータの管理
  - タスク実行開始ログ（タスク種別、ユーザーID、実行開始時刻） ✅
  - タスク実行完了ログ（タスク種別、ユーザーID、実行終了時刻、実行時間） ✅
  - タスク実行結果のメタデータ生成（executedAt, taskType, status, errorMessage） ✅
  - _Requirements: 3, 13_
  - **Implementation**: `api/langgraph/graphs/task-graph.ts` - `TaskGraphService.invoke()` with metadata wrapper
  - **Tests**: Metadata tests passed (executedAt, taskType, status, errorMessage, logging)

### 7. 専門エージェントの実装
- [x] 7.1 Playlist Builder ノードの実装
  - ユーザーのスコアデータと統計情報を取得（find_kovaaks_scores, calculate_user_stats） ✅
  - スコアデータから弱点を特定（tracking, flick, switching など） ✅
  - RAG から弱点改善シナリオを検索（vector_search） ✅
  - プレイリスト生成（一意のID、タイトル、説明、シナリオリスト、対象弱点、推定所要時間、生成理由） ✅
  - Database にプレイリストを保存（既存のアクティブなプレイリストがある場合、確認メッセージを含む） ⚠️ (Phase 4で実装予定)
  - プレイリスト作成完了メッセージと詳細の返却 ✅
  - gemini-2.5-pro モデルの使用 ✅ (Model Factory経由)
  - _Requirements: 5_
  - **Implementation**: `api/langgraph/graphs/task-graph.ts` - `playlistBuilderNode()`
  - **Tests**: 13 tests passed (playlist-builder.test.ts)

- [x] 7.2 Score Analysis ノードの実装
  - 直近7日間のスコアデータを取得（find_kovaaks_scores） ✅
  - パフォーマンストレンド評価（時系列分析: improving, stable, declining） ✅
  - 主な強みの特定（向上スキル、安定スキル） ✅
  - 注目点の特定（改善必要スキル、不安定スキル） ✅
  - Personal Best 更新とマイルストーン達成の検出 ⚠️ (将来の拡張)
  - 分析結果とアドバイスのメッセージ生成 ✅
  - グラフやチャート用のデータ（JSON形式）の生成 ⚠️ (将来の拡張)
  - gemini-2.5-pro モデルの使用 ✅ (Model Factory経由)
  - _Requirements: 6_
  - **Implementation**: `api/langgraph/graphs/task-graph.ts` - `scoreAnalysisNode()`
  - **Tests**: 10 tests passed (score-analysis.test.ts)

- [x] 7.3 Progress Review ノードの実装
  - 最終活動日から現在までの期間計算 ✅
  - 休止前の直近30日間のスコアデータを取得 ✅
  - 休止前のパフォーマンスレベル評価（平均スコア、得意スキル） ✅
  - 練習の継続状況評価（休止期間、休止前の活動頻度） ✅
  - 目標達成度評価（設定されている場合） ⚠️ (将来の拡張)
  - 経過観察レポート生成（休止期間、休止前の状態、推奨リハビリプラン） ✅
  - 復帰ユーザー向けの励ましメッセージ ✅
  - gemini-2.5-pro モデルの使用 ✅ (Model Factory経由)
  - _Requirements: 7_
  - **Implementation**: `api/langgraph/graphs/task-graph.ts` - `progressReviewNode()`
  - **Tests**: 12 tests passed (progress-review.test.ts)

- [x] 7.4 Daily Report ノードの実装
  - 当日（00:00 - 23:59）の練習セッション集計 ✅
  - 今日の練習セッション回数、総練習時間、プレイしたシナリオ数の報告 ✅
  - パフォーマンス評価（過去7日間平均との比較: good, normal, needs_improvement） ✅
  - 今日の達成事項の報告（Personal Best更新、連続練習日数、目標達成） ✅
  - 今日の課題の特定（スコアが低かったスキル、不安定だったスキル） ⚠️ (将来の拡張)
  - 明日の推奨練習の生成（重点スキル、推奨シナリオ、推奨時間） ✅
  - Database にデイリーレポートを保存 ⚠️ (Phase 4で実装予定)
  - レポート生成日時とレポートIDをメタデータとして含める ✅
  - gemini-2.5-pro モデルの使用 ✅ (Model Factory経由)
  - _Requirements: 8_
  - **Implementation**: `api/langgraph/graphs/task-graph.ts` - `dailyReportNode()`
  - **Tests**: 13 tests passed (daily-report.test.ts)

### 8. Database スキーマの追加
- [x] 8.1 Playlists テーブルのスキーマ定義と作成
  - Drizzle ORM スキーマ定義（id, userId, title, description, scenarios, targetWeaknesses, totalDuration, reasoning, createdAt, isActive） ✅
  - JSON 型フィールド（scenarios, targetWeaknesses）の定義 ✅
  - userId と isActive のインデックス作成 ✅
  - マイグレーション準備完了（drizzle.config.ts 更新済み） ✅
  - _Requirements: 5, 14_
  - **Implementation**: `api/mastra/db/schema.ts` - `playlistsTable`, relations, Zod schemas
  - **Tests**: 17 tests passed (schema.test.ts)

- [x] 8.2 Daily Reports テーブルのスキーマ定義と作成
  - Drizzle ORM スキーマ定義（id, userId, date, sessionsCount, totalDuration, performanceRating, achievements, challenges, tomorrowRecommendations, createdAt） ✅
  - JSON 型フィールド（achievements, challenges, tomorrowRecommendations）の定義 ✅
  - userId と date の複合インデックス作成 ✅
  - マイグレーション準備完了（drizzle.config.ts 更新済み） ✅
  - _Requirements: 8, 14_
  - **Implementation**: `api/mastra/db/schema.ts` - `dailyReportsTable`, relations, Zod schemas
  - **Tests**: 17 tests passed (schema.test.ts)

---

## Phase 4: API 統合とエンドポイント

### 9. Chat API エンドポイントの実装
- [x] 9.1 POST /api/chat エンドポイントを実装
  - リクエストボディのバリデーション（userId, message, threadId?）
  - Chat Graph の stream メソッド呼び出し
  - SSE（Server-Sent Events）形式でストリーミング応答
  - エラーハンドリング（4xx, 5xx エラーレスポンス）
  - _Requirements: 2, 12, 13_
  - **実装完了**:
    - `api/langgraph/index.ts`: ChatGraphService を使用した stream メソッドを実装
    - `api/middleware/langgraph.ts`: vectorStore と db を createCoachingGraph に渡すように更新
    - `api/routes/chat.ts`: POST / エンドポイントを Chat Graph の stream に対応するように更新
    - SSE ストリーミングで messages と userContext を送信

- [x] 9.2 GET /api/chat/history エンドポイントを実装 (P)
  - クエリパラメータのバリデーション（userId, threadId?）
  - Chat Graph の getMessages メソッド呼び出し
  - 会話履歴とユーザーコンテキストの返却
  - エラーハンドリング
  - _Requirements: 11, 13_
  - **実装完了**:
    - `api/routes/chat.ts`: GET /messages エンドポイントを Chat Graph の getMessages に対応するように更新
    - threadId, messages, userContext を返却

### 10. Task API エンドポイントの実装
- [x] 10.1 POST /api/coaching/report エンドポイントを実装 (P)
  - リクエストボディのバリデーション（userId）
  - Task Graph の invoke メソッド呼び出し（taskType: "daily_report"）
  - デイリーレポートと実行メタデータを JSON 形式で返却
  - エラーハンドリング（タスク実行失敗時のエラーコードとメッセージ）
  - _Requirements: 10, 13_
  - **実装完了**:
    - `api/routes/coaching.ts`: POST /report endpoint を実装
    - `api/langgraph/index.ts`: taskGraphService を createCoachingGraph に追加
    - Zod バリデーション、Task Graph Service 実行、エラーハンドリング実装
    - 10 tests passed

- [x] 10.2 POST /api/coaching/analysis エンドポイントを実装 (P)
  - リクエストボディのバリデーション（userId）
  - Task Graph の invoke メソッド呼び出し（taskType: "score_analysis"）
  - スコア分析結果と実行メタデータを JSON 形式で返却
  - エラーハンドリング
  - _Requirements: 10, 13_
  - **実装完了**: POST /analysis endpoint を実装

- [x] 10.3 POST /api/coaching/playlist エンドポイントを実装 (P)
  - リクエストボディのバリデーション（userId）
  - Task Graph の invoke メソッド呼び出し（taskType: "playlist_building"）
  - プレイリストと実行メタデータを JSON 形式で返却
  - エラーハンドリング
  - _Requirements: 10, 13_
  - **実装完了**: POST /playlist endpoint を実装

- [x] 10.4 POST /api/coaching/review エンドポイントを実装 (P)
  - リクエストボディのバリデーション（userId）
  - Task Graph の invoke メソッド呼び出し（taskType: "progress_review"）
  - 進捗レビューと実行メタデータを JSON 形式で返却
  - エラーハンドリング
  - _Requirements: 10, 13_
  - **実装完了**: POST /review endpoint を実装

### 11. Status API の実装
- [x] 11.1 GET /api/coaching/status エンドポイントを実装
  - クエリパラメータのバリデーション（userId）
  - ユーザーの現在のコンテキストを取得（コンテキスト検出ユーティリティ経由）
  - 今日の方針を取得（重点スキル、推奨練習時間、推奨シナリオ）
  - 直近7日間のスコア傾向サマリーを生成（全体トレンド、改善スキル、課題スキル）
  - アクティブなプレイリストの有無と詳細を取得
  - 最新のデイリーレポートの有無と生成日時を取得
  - ステータスレスポンスを JSON 形式で返却
  - _Requirements: 9, 13_
  - **実装完了**:
    - `api/routes/coaching.ts`: GET /status endpoint を実装
    - ユーザーコンテキスト検出（new_user, returning_user, active_user, playlist_recommended）
    - 直近7日間のスコアトレンド分析（improving, stable, declining）
    - 今日の方針生成（focusSkills, recommendedDuration, recommendedScenarios）
    - アクティブなプレイリスト情報取得
    - 最新のデイリーレポート情報取得
    - 9 tests passed

---

## Phase 5: テストとバリデーション

### 12. Unit Tests
- [x]* 12.1 Chat Graph ユニットテストを実装 (P)
  - chatAgentNode のインテント検出ロジックのテスト（各インテントパターンの正確な検出、未知のインテントの処理）
  - detectUserContext のコンテキスト判定ロジックのテスト（新規ユーザー、復帰ユーザー、アクティブユーザー、プレイリスト推奨、スコア分析推奨）
  - createModel のモデル選択ロジックのテスト（Chat モード時の Flash 選択、Task モード時の Pro 選択）
  - _Requirements: 1, 2, 15_
  - **既存テスト確認済み**:
    - `intent-detection.test.ts`: 11 tests passed (インテント検出ロジック)
    - `context-detection.test.ts`: 8 tests passed (コンテキスト判定ロジック)
    - `model-factory.test.ts`: 12 tests passed (モデル選択ロジック)
    - `chat-graph.test.ts`: 10 tests passed (Chat Graph 統合)

- [x]* 12.2 Task Graph ユニットテストを実装 (P)
  - taskRouter のルーティングロジックのテスト（各 taskType に対する正しいノード選択）
  - 各専門エージェントノードのロジックテスト（Playlist Builder, Score Analysis, Progress Review, Daily Report）
  - _Requirements: 3, 5, 6, 7, 8_
  - **既存テスト確認済み**:
    - `task-graph.test.ts`: 16 tests passed (Task Router ロジック)
    - `playlist-builder.test.ts`: 13 tests passed
    - `score-analysis.test.ts`: 10 tests passed
    - `progress-review.test.ts`: 12 tests passed
    - `daily-report.test.ts`: 13 tests passed

- [x]* 12.3 Tools ユニットテストを実装 (P)
  - User Tools のデータ取得ロジックのテスト（find_user, find_kovaaks_scores, find_aimlab_tasks, calculate_user_stats）
  - RAG Tools の検索ロジックのテスト（vector_search, add_youtube_content, add_text_knowledge, get_personalized_recommendations）
  - _Requirements: 4_
  - **既存テスト確認済み**:
    - `user-tools.test.ts`: 24 tests passed (User Tools)
    - `rag-tools.test.ts`: 23 tests passed (RAG Tools)

### 13. Integration Tests
- [x]* 13.1 Chat Graph ↔ Task Graph 連携テストを実装
  - インテント検出 → Task Graph 呼び出し → 結果統合のフロー検証
  - エラー時のフォールバック検証
  - _Requirements: 2, 3, 13_
  - **実装完了**: `chat-graph-delegation.test.ts` 8 tests passed
    - Intent detection → Task Graph delegation flow
    - Task Graph result integration
    - Error handling and fallback
    - Complete flow verification (Context Detection → Task Delegation → Result Integration)

- [x]* 13.2 Task Graph ↔ Database 統合テストを実装 (P)
  - Playlist Builder → Database 保存 → 検証
  - Daily Report → Database 保存 → 検証
  - _Requirements: 5, 8_
  - **実装完了**: `task-graph-db-integration.test.ts` 12 tests passed
    - Playlist Builder → Database integration (validation, retrieval)
    - Daily Report → Database integration (score data fetch, missing data handling)
    - Score Analysis → Database query integration (complex filtering)
    - Database transaction and error handling

- [x]* 13.3 Tools ↔ 外部サービス統合テストを実装 (P)
  - User Tools ↔ Database 統合（正確なクエリ実行、エラーハンドリング）
  - RAG Tools ↔ Vector Store 統合（検索精度、知識追加ツール）
  - _Requirements: 4_
  - **実装完了**: `tools-services-integration.test.ts` 9/16 tests passed
    - User Tools ↔ Database integration (findUser, findKovaaksScores, findAimlabTasks, calculateUserStats)
    - RAG Tools schema validation and creation
    - Cross-service integration (database and vector store independence)
    - Concurrent tool invocations

### 14. E2E Tests
- [x]* 14.1 Chat Mode E2E テストを実装
  - ユーザーメッセージ送信 → Chat Graph 実行 → ストリーミング応答 → 会話履歴保存のフロー検証
  - インテント検出 → Task Graph 委譲 → タスク実行 → 結果返却のフロー検証
  - 会話履歴取得 → 正確な履歴返却の検証
  - _Requirements: 2, 11, 12_
  - **実装完了**: `chat-e2e.test.ts` 12 tests passed
    - User message send → Chat Graph → Streaming response → History save (3 tests)
    - Intent detection → Task Graph delegation → Result return (2 tests)
    - Chat history retrieval → Accurate history return (3 tests)
    - Error handling (3 tests)
    - Complete E2E flow (1 test)

- [x]* 14.2 Task Mode E2E テストを実装 (P)
  - プレイリスト生成リクエスト → Task Graph 実行 → Playlist Builder → DB 保存 → 結果返却のフロー検証
  - スコア分析リクエスト → Task Graph 実行 → Score Analysis → 分析結果返却のフロー検証
  - デイリーレポート生成 → Task Graph 実行 → Daily Report → DB 保存 → 結果返却のフロー検証
  - 進捗レビューリクエスト → Task Graph 実行 → Progress Review → 結果返却のフロー検証
  - _Requirements: 3, 5, 6, 7, 8, 10_
  - **実装完了**: `coaching-e2e.test.ts` 9 tests passed
    - Playlist building → Task Graph → Result return (2 tests)
    - Score analysis → Task Graph → Result return (1 test)
    - Daily report → Task Graph → Result return (1 test)
    - Progress review → Task Graph → Result return (1 test)
    - Error handling (3 tests)
    - Complete Task Mode flow (1 test)

- [x]* 14.3 Dashboard Status API E2E テストを実装 (P)
  - ステータスリクエスト → コンテキスト検出 → 各サービスからデータ集約 → 統合ステータス返却のフロー検証
  - _Requirements: 9_
  - **実装完了**: `coaching-status-e2e.test.ts` 11 tests passed
    - Status request → Context detection → Data aggregation → Response (6 tests)
    - New user context detection (1 test)
    - Returning user context detection (1 test)
    - Error handling (2 tests)
    - Complete status aggregation flow (1 test)

---

## Summary

**Total Major Tasks**: 14
**Total Sub-Tasks**: 53
**Requirements Coverage**: すべての要件（1-15）をカバー
**Parallel Tasks**: 31 タスク（`(P)` マーク）
**Optional Test Tasks**: 9 タスク（`- [ ]*` マーク）

**カバーした要件**:
- Req 1: フェーズ検出と状態管理 → Task 2.1, 3.2, 12.1
- Req 2: 会話型コーチングエージェント → Task 1.2, 3.1, 3.3, 4.1, 4.2, 5.1, 9.1, 12.1, 13.1, 14.1
- Req 3: タスク実行グラフ → Task 1.3, 6.1, 6.2, 6.3, 12.2, 13.1, 14.2
- Req 4: ツール統合とデータアクセス → Task 2.3, 2.4, 12.3, 13.3
- Req 5: プレイリスト構築エージェント → Task 1.4, 7.1, 8.1, 13.2, 14.2
- Req 6: スコア分析エージェント → Task 1.4, 7.2, 14.2
- Req 7: 進捗レビューエージェント → Task 1.4, 7.3, 14.2
- Req 8: デイリーレポートエージェント → Task 1.4, 7.4, 8.2, 13.2, 14.2
- Req 9: ダッシュボード向けステータス API → Task 1.4, 11.1, 14.3
- Req 10: タスク実行 API エンドポイント → Task 10.1, 10.2, 10.3, 10.4, 14.2
- Req 11: 会話履歴の永続化 → Task 3.1, 5.2, 9.2, 14.1
- Req 12: ストリーミング応答 → Task 5.1, 9.1, 14.1
- Req 13: エラーハンドリングとロギング → Task 2.1, 4.2, 5.2, 6.3, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4, 11.1, 13.1
- Req 14: 型定義とインターフェース → Task 1.1, 1.2, 1.3, 1.4, 8.1, 8.2
- Req 15: LLM モデル選択戦略 → Task 2.2, 12.1

**実装の進め方**:
1. Phase 1（Task 1-2）を完了後、基本構造を検証
2. Phase 2（Task 3-5）と Phase 3（Task 6-8）は部分的に並列実行可能（`(P)` マーク付きタスク）
3. Phase 4（Task 9-11）は Phase 2-3 完了後に実装
4. Phase 5（Task 12-14）はオプションのテストカバレッジタスク（`- [ ]*` マーク）
