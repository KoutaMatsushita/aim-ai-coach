# Requirements Document

## Project Description (Input)
エイムコーチ AI エージェント

## Introduction
本仕様書は、FPS プレイヤー向けのデータ駆動型エイムコーチング AI エージェントシステムの要件を定義します。既存の Kovaaks・Aimlabs データ統合基盤と LangGraph オーケストレーション基盤を活用し、パーソナライズされたコーチング体験を提供します。

システムは2つの主要なインタラクションモードを提供します：
- **チャットモード**: 自由な会話を通じたコーチング（プレイリスト構築相談など）
- **タスク実行モード**: 明示的な分析・レポート生成（デイリーレポート、スコア分析など）

## Requirements

### Requirement 1: フェーズ検出と状態管理
**Objective:** AI コーチとして、ユーザーの活動状況とデータ状態を自動検出し、適切なコーチングコンテキストを判定したい。これにより、ユーザーの現在の状態に最適化されたコーチング戦略を提供できる。

#### Acceptance Criteria
1. When ユーザーがシステムに初めてアクセスし、スコアデータが存在しない場合、the AI Coach システムは新規ユーザーコンテキストを設定する
2. When ユーザーのスコアデータは存在するが、アクティブなプレイリストが存在しない場合、the AI Coach システムはプレイリスト推奨コンテキストを設定する
3. When 直近24時間に6件以上の新規スコアが記録され、かつ最終活動から1日未満の場合、the AI Coach システムはスコア分析推奨コンテキストを設定する
4. When 最終活動から7日以上経過している場合、the AI Coach システムは復帰ユーザーコンテキストを設定する
5. The AI Coach システムは、コンテキスト検出時にユーザーID、活動日数、新規スコア数、プレイリスト有無、新規ユーザーフラグを状態として保持する
6. The AI Coach システムは、検出されたコンテキストを後続のエージェントに渡す

### Requirement 2: 会話型コーチングエージェント（Chat Graph）
**Objective:** FPS プレイヤーとして、自然言語で AI コーチと対話し、データに基づいたパーソナライズされたアドバイスを受け取りたい。また、会話の中でプレイリスト構築などのタスクを依頼したい。

#### Acceptance Criteria
1. When ユーザーがメッセージを送信した場合、the Chat Agent はユーザーの現在のコンテキストと過去のメッセージ履歴を考慮して応答を生成する
2. The Chat Agent は、簡単な会話や一般的な質問に対して gemini-2.5-flash モデルを使用し、温度パラメータ 0.7 で応答を生成する
3. The Chat Agent は、システムプロンプトで「Aim AI Coach」としての役割、目的、利用可能なツール、出力フォーマットを定義する
4. When ユーザーがプレイリスト構築を依頼した場合（「プレイリスト作って」など）、the Chat Agent はインテントを検出し、Playlist Builder へルーティングする
5. When ユーザーがスコア分析を依頼した場合（「今日のスコアを分析して」など）、the Chat Agent はインテントを検出し、Score Analysis Agent へルーティングする
6. When 会話の生成が完了した場合、the Chat Agent は生成された応答メッセージを返す
7. The Chat Agent は、日本語でコーチングを提供する
8. The Chat Agent は、ユーザーの現在のコンテキスト（新規ユーザー、復帰ユーザーなど）に応じた適切なトーンと内容で応答する

### Requirement 3: タスク実行グラフ（Task Graph）
**Objective:** システムとして、明示的なタスク実行リクエスト（デイリーレポート、スコア分析など）を適切なエージェントにルーティングし、確実に実行したい。

#### Acceptance Criteria
1. The Task Graph は、タスク種別パラメータ（"daily_report" | "score_analysis" | "playlist_building" | "progress_review"）を受け取る
2. When タスク種別が "daily_report" の場合、the Task Graph は Daily Report Agent を実行する
3. When タスク種別が "score_analysis" の場合、the Task Graph は Score Analysis Agent を実行する
4. When タスク種別が "playlist_building" の場合、the Task Graph は Playlist Builder を実行する
5. When タスク種別が "progress_review" の場合、the Task Graph は Progress Review Agent を実行する
6. When タスク実行が完了した場合、the Task Graph は実行結果とメタデータ（実行時刻、タスク種別、成功/失敗）を返す
7. The Task Graph は、各タスク実行前にユーザーコンテキストを取得し、エージェントに渡す

### Requirement 4: ツール統合とデータアクセス
**Objective:** AI コーチとして、ユーザーデータと知識ベースに効率的にアクセスし、データ駆動のアドバイスを提供したい。これにより、客観的で信頼性の高いコーチングが可能になる。

#### Acceptance Criteria
1. The Chat Agent と Task Graph のエージェントは、find_user ツールを使用してユーザー情報を取得できる
2. The Chat Agent と Task Graph のエージェントは、find_kovaaks_scores ツールを使用して Kovaaks スコアデータを取得できる
3. The Chat Agent と Task Graph のエージェントは、find_aimlab_tasks ツールを使用して Aimlabs タスクデータを取得できる
4. The Chat Agent と Task Graph のエージェントは、calculate_user_stats ツールを使用してユーザーの統計情報を計算できる
5. The Chat Agent と Task Graph のエージェントは、vector_search ツールを使用して RAG から知識（エイムコーチング、プレイリスト情報）を検索できる
6. The Chat Agent は、add_youtube_content ツールを使用して YouTube 動画を知識ベースに追加できる
7. The Chat Agent は、add_text_knowledge ツールを使用してテキスト知識を追加できる
8. The Chat Agent と Task Graph のエージェントは、get_personalized_recommendations ツールを使用してパーソナライズされた推奨を取得できる
9. When ツール呼び出しが必要な場合、the エージェントは LangChain の bindTools 機能を使用してツールを実行する

### Requirement 5: プレイリスト構築エージェント
**Objective:** プレイヤーとして、自分の弱点に特化した練習プレイリストを自動生成してほしい。チャットでの会話を通じて、または明示的なタスク実行により生成できる。

#### Acceptance Criteria
1. When Playlist Builder が実行された場合、the Playlist Builder はユーザーのスコアデータと統計情報を取得する
2. The Playlist Builder は、スコアデータから弱点（tracking, flick, switching など）を特定する
3. The Playlist Builder は、RAG から弱点改善に適したシナリオ情報を検索する
4. The Playlist Builder は、プレイリストに一意のID、ユーザーID、タイトル、説明、シナリオリスト、対象弱点、推定所要時間、生成理由、作成日時、有効フラグを含める
5. When プレイリストが生成された場合、the Playlist Builder はプレイリストをデータベースに保存する
6. When プレイリストが保存された場合、the Playlist Builder はプレイリスト作成完了メッセージと詳細をユーザーに返す
7. The Playlist Builder は、既存のアクティブなプレイリストが存在する場合、ユーザーに確認を求めるメッセージを含める

### Requirement 6: スコア分析エージェント
**Objective:** プレイヤーとして、直近のスコアデータを分析し、パフォーマンストレンド、強み、注目点を把握したい。これにより、次の練習方針を決定できる。

#### Acceptance Criteria
1. When Score Analysis Agent が実行された場合、the Score Analysis Agent は直近7日間のスコアデータを取得する
2. The Score Analysis Agent は、パフォーマンストレンド（改善傾向/停滞/悪化傾向）を時系列分析で評価する
3. The Score Analysis Agent は、主な強み（向上しているスキル、安定しているスキル）を特定する
4. The Score Analysis Agent は、注目点（改善が必要なスキル、不安定なスキル）を特定する
5. The Score Analysis Agent は、Personal Best 更新やマイルストーン達成を検出する
6. When 分析が完了した場合、the Score Analysis Agent は分析結果（トレンド、強み、注目点、達成事項）とアドバイスをメッセージとして返す
7. The Score Analysis Agent は、分析結果にグラフやチャート用のデータ（JSON形式）を含める

### Requirement 7: 進捗レビューエージェント
**Objective:** 長期間ログインしていないプレイヤーとして、復帰時に過去の進捗と現在の状態を振り返りたい。これにより、リハビリ計画を立てやすくなる。

#### Acceptance Criteria
1. When Progress Review Agent が実行された場合、the Progress Review Agent は最終活動日から現在までの期間を計算する
2. The Progress Review Agent は、休止前の直近30日間のスコアデータを取得する
3. The Progress Review Agent は、休止前のパフォーマンスレベル（平均スコア、得意スキル）を評価する
4. The Progress Review Agent は、練習の継続状況（休止期間、休止前の活動頻度）を評価する
5. The Progress Review Agent は、目標達成度（設定されている場合）を評価する
6. When レビューが完了した場合、the Progress Review Agent は経過観察レポート（休止期間、休止前の状態、推奨リハビリプラン）をメッセージとして返す
7. The Progress Review Agent は、復帰ユーザー向けの励ましメッセージを含める

### Requirement 8: デイリーレポートエージェント
**Objective:** プレイヤーとして、一日の終わりに練習セッションを振り返り、達成事項と明日の推奨練習を把握したい。これにより、モチベーションを維持できる。

#### Acceptance Criteria
1. When Daily Report Agent が実行された場合、the Daily Report Agent は当日（00:00 - 23:59）の練習セッションを集計する
2. The Daily Report Agent は、今日の練習セッション回数、総練習時間、プレイしたシナリオ数を報告する
3. The Daily Report Agent は、今日のパフォーマンス評価（良好/普通/改善必要）を過去7日間の平均と比較して提供する
4. The Daily Report Agent は、今日の達成事項（Personal Best更新、連続練習日数、目標達成など）を報告する
5. The Daily Report Agent は、今日の課題（スコアが低かったスキル、不安定だったスキル）を特定する
6. The Daily Report Agent は、明日の推奨練習（重点スキル、推奨シナリオ、推奨時間）を生成する
7. When レポートが完了した場合、the Daily Report Agent は本日のデイリーレポートと明日の推奨練習をメッセージとして返す
8. The Daily Report Agent は、レポート生成日時とレポートIDをメタデータとして含める

### Requirement 9: ダッシュボード向けステータス API
**Objective:** ダッシュボードに、現在のコーチング方針、スコア傾向サマリー、最新のデイリーレポートを表示したい。これにより、ユーザーは一目で現在の状態を把握できる。

#### Acceptance Criteria
1. The AI Coach システムは、/api/coaching/status エンドポイントを提供する
2. When /api/coaching/status が呼び出された場合、the AI Coach システムはユーザーの現在のコンテキスト（新規ユーザー、復帰ユーザーなど）を返す
3. When /api/coaching/status が呼び出された場合、the AI Coach システムは今日の方針（重点スキル、推奨練習時間、推奨シナリオ）を返す
4. When /api/coaching/status が呼び出された場合、the AI Coach システムは直近7日間のスコア傾向サマリー（全体トレンド、改善スキル、課題スキル）を返す
5. When /api/coaching/status が呼び出された場合、the AI Coach システムはアクティブなプレイリストの有無と詳細を返す
6. When /api/coaching/status が呼び出された場合、the AI Coach システムは最新のデイリーレポートの有無と生成日時を返す
7. The AI Coach システムは、ステータスレスポンスを JSON 形式で返し、フロントエンドで簡単に表示できる構造にする

### Requirement 10: タスク実行 API エンドポイント
**Objective:** フロントエンドから明示的にタスク実行（デイリーレポート生成、スコア分析など）をトリガーしたい。

#### Acceptance Criteria
1. The AI Coach システムは、/api/coaching/report エンドポイントを提供し、デイリーレポートを生成する
2. The AI Coach システムは、/api/coaching/analysis エンドポイントを提供し、スコア分析を実行する
3. The AI Coach システムは、/api/coaching/playlist エンドポイントを提供し、プレイリストを生成する
4. The AI Coach システムは、/api/coaching/review エンドポイントを提供し、進捗レビューを実行する
5. When タスク実行 API が呼び出された場合、the AI Coach システムは Task Graph を使用してタスクを実行する
6. When タスク実行が完了した場合、the AI Coach システムは実行結果、生成されたコンテンツ、メタデータ（実行時刻、タスク種別）を JSON 形式で返す
7. If タスク実行が失敗した場合、the AI Coach システムはエラーメッセージとエラーコードを返す

### Requirement 11: 会話履歴の永続化
**Objective:** AI Coach システムとして、ユーザーとの会話履歴を保存し、次回のセッションで継続的なコーチング体験を提供したい。これにより、文脈を理解したパーソナライズされたコーチングが可能になる。

#### Acceptance Criteria
1. The Chat Graph は、MemorySaver を使用して会話状態を保存する
2. When Chat Graph が実行される場合、the AI Coach システムは threadId を設定可能にする
3. When threadId が指定されない場合、the AI Coach システムは userId を threadId として使用する
4. When Chat Graph が実行される場合、the AI Coach システムは configurable に thread_id を含めてチェックポインターを使用する
5. When 会話履歴取得が呼び出された場合、the AI Coach システムは指定された threadId の最新状態を取得する
6. If 会話履歴が存在しない場合、the AI Coach システムは空のメッセージリストを返す
7. The Task Graph は、タスク実行結果を会話履歴に追加しない（タスク実行は独立したセッション）

### Requirement 12: ストリーミング応答
**Objective:** ユーザーとして、AI コーチの応答をリアルタイムで受け取りたい。これにより、待ち時間を感じず、自然な会話体験が得られる。

#### Acceptance Criteria
1. The Chat Graph は、stream メソッドを提供し、グラフ実行をストリーム形式で返す
2. When stream が呼び出された場合、the Chat Graph は streamMode を "values" に設定してグラフをストリーム実行する
3. When ストリーミング実行が完了した場合、the Chat Graph は非同期イテレータを返す
4. The Task Graph は、ストリーミングをサポートせず、完全な結果を一度に返す（タスク実行の性質上）

### Requirement 13: エラーハンドリングとロギング
**Objective:** AI Coach システムとして、コンテキスト検出と各エージェントの実行状況をログに記録し、エラー時に適切に対処したい。これにより、システムの信頼性とデバッグ性が向上する。

#### Acceptance Criteria
1. When コンテキスト検出が完了した場合、the AI Coach システムはユーザーID、検出されたコンテキスト、活動日数、新規スコア数、新規ユーザーフラグ、プレイリスト有無をコンソールログに出力する
2. When タスク実行が開始された場合、the Task Graph はタスク種別、ユーザーID、実行開始時刻をコンソールログに出力する
3. When タスク実行が完了した場合、the Task Graph はタスク種別、ユーザーID、実行終了時刻、実行時間をコンソールログに出力する
4. If タスク実行が失敗した場合、the Task Graph はエラー内容、スタックトレース、ユーザーID、タスク種別をエラーログに出力する
5. If 会話履歴の取得に失敗した場合、the Chat Graph はエラーをキャッチし、空のメッセージリストを返す
6. If ツール呼び出しが失敗した場合、the エージェントはエラーをキャッチし、ユーザーにわかりやすいエラーメッセージを返す

### Requirement 14: 型定義とインターフェース
**Objective:** 開発者として、AI Coach システムの状態と型を明確に定義し、TypeScript の型安全性を活用したい。これにより、実装ミスを防ぎ、保守性を向上させる。

#### Acceptance Criteria
1. The AI Coach システムは、UserContext 型を "new_user" | "returning_user" | "active_user" | "playlist_recommended" | "analysis_recommended" として定義する
2. The AI Coach システムは、TaskType 型を "daily_report" | "score_analysis" | "playlist_building" | "progress_review" として定義する
3. The AI Coach システムは、ChatGraphState 型を Annotation.Root で定義し、userId, threadId, messages, userContext を含める
4. The AI Coach システムは、TaskGraphState 型を Annotation.Root で定義し、userId, taskType, userContext, taskResult を含める
5. The AI Coach システムは、Playlist 型をエクスポートし、id, userId, title, description, scenarios, targetWeaknesses, totalDuration, reasoning, createdAt, isActive を含める
6. The AI Coach システムは、DailyReport 型をエクスポートし、id, userId, date, sessionsCount, totalDuration, achievements, challenges, recommendations, createdAt を含める
7. The AI Coach システムは、ScoreAnalysis 型をエクスポートし、userId, period, trend, strengths, challenges, milestones, chartData, createdAt を含める
8. The AI Coach システムは、CoachingStatus 型をエクスポートし、userContext, todayFocus, scoreTrendSummary, activePlaylist, latestReport を含める

### Requirement 15: LLM モデル選択戦略
**Objective:** AI Coach システムとして、タスクの複雑度に応じて最適な LLM モデルを選択したい。これにより、コスト効率とレスポンス品質のバランスを最適化できる。

#### Acceptance Criteria
1. When Chat Agent が簡単な会話（挨拶、一般的な質問、軽い励まし）を処理する場合、the AI Coach システムは gemini-2.5-flash を使用する
2. When Task Graph が複雑な分析タスク（スコア分析、プレイリスト構築、進捗レビュー、デイリーレポート）を実行する場合、the AI Coach システムは gemini-2.5-pro を使用する
3. The AI Coach システムは、タスク複雑度判定基準（ツール呼び出し数、データ量、推論ステップ数）を定義する
4. When ツール呼び出しが3回以上必要な場合、the AI Coach システムは複雑タスクと判定する
5. When 過去7日間以上のデータ分析が必要な場合、the AI Coach システムは複雑タスクと判定する
6. When 複数のエージェント連携が必要な場合、the AI Coach システムは複雑タスクと判定する
7. When モデル選択が完了した場合、the AI Coach システムはログに選択されたモデル名と判定理由を記録する
8. The AI Coach システムは、モデル選択ロジックを createModel ユーティリティ関数として実装し、グラフ作成時に呼び出す

## Notes
- 本仕様は既存の LangGraph 基盤（`api/langgraph/`）と Mastra RAG 基盤（`api/mastra/`）を前提とします
- Chat Graph と Task Graph は独立したグラフとして実装し、それぞれ異なるエンドポイントから呼び出されます
- 実装は TypeScript strict mode で行い、型安全性を確保します
- コーチング出力は日本語で統一します
- MemorySaver は開発環境用であり、本番環境では永続ストレージへの移行が必要です
- ダッシュボード向け API は軽量で高速なレスポンスを提供するため、重い計算はキャッシュを活用します
- LLM モデル選択戦略: 簡単な会話は gemini-2.5-flash、複雑な分析タスクは gemini-2.5-pro を使用することで、コスト効率と品質のバランスを最適化します
