# Requirements Document

## Project Description (Input)
Coaching Dashboard UI:
  既存のコーチングAPI群を統合した包括的ダッシュボードUI実装。
  aim-coach-ai-agent 仕様で実装されたバックエンドAPIを消費するフロントエンド機能。

  主要機能:
  - コーチングステータス表示（GET /api/coaching/status）
  - デイリーレポート自動取得・カード表示（GET /api/coaching/daily-report）
  - スコア分析実行ボタンと結果表示（POST /api/coaching/analysis, POST /api/coaching/analysis/scores）
  - プレイリスト生成フォームと結果表示（POST /api/coaching/playlist, POST /api/coaching/playlist/generate）
  - 振り返りレビュー表示（GET /api/coaching/progress/review, POST /api/coaching/review）
  - 既存チャット機能（AimAssistant）との統合
  - コーチングコンテキスト管理（GET /api/coaching/context）

  技術スタック:
  - TanStack Start SSR
  - React 19
  - TanStack Router（ルート: / メインページ拡張）
  - Radix UI Themes（UI実装の中心、カード、ボタン、ダイアログ等）
  - Tailwind CSS v4
  - Hono Client（型安全API通信）

  既存APIとの統合:
  - aim-coach-ai-agent 仕様で定義された全10エンドポイントを利用
  - 型定義（TaskResult, DailyReport, ScoreAnalysis, Playlist, ProgressReport, CoachingStatus）を再利用
  - APIレスポンスは既存バックエンド実装に準拠

## Introduction
本要件定義は、Aim AI Coach アプリケーションの既存コーチングバックエンドAPI群を統合した包括的ダッシュボードUIの要件を定義します。aim-coach-ai-agent 仕様で実装されたLangGraphベースのコーチングシステムが提供する10種類のAPIエンドポイントを消費し、FPSプレイヤーに対してデータドリブンなコーチング体験をビジュアルに提供します。

ダッシュボードは、コーチングステータスの可視化、デイリーレポート表示、スコア分析実行、プレイリスト生成、振り返りレビューなど、複数のコーチング機能を統合的に提示し、既存のチャット機能（AimAssistant）と調和させることで、包括的なユーザー体験を実現します。

## Requirements

### Requirement 1: コーチングステータス表示
**Objective:** FPSプレイヤーとして、現在のコーチング状態（ユーザーコンテキスト、今日の推奨練習、スコアトレンド）を一目で把握したい。これにより、練習計画の意思決定を迅速化する。

#### Acceptance Criteria
1. When ユーザーがダッシュボードページにアクセスした場合、the Dashboard UI は GET /api/coaching/status エンドポイントを自動的に呼び出す
2. When コーチングステータスAPIが成功応答を返した場合、the Dashboard UI はユーザーコンテキスト（new_user/returning_user/active_user/playlist_recommended/analysis_recommended）をステータスカードに表示する
3. The Dashboard UI は、今日の推奨練習（focusSkills, recommendedDuration, recommendedScenarios）をカード形式で表示する
4. The Dashboard UI は、スコアトレンドサマリー（trend, improvedSkills, challengeSkills）をビジュアル要素（アイコン、色分け）を用いて表示する
5. When アクティブプレイリストが存在する場合、the Dashboard UI はプレイリスト情報（title, scenariosCount）をリンク付きで表示する
6. When 最新レポートが存在する場合、the Dashboard UI はレポート日時とリンクを表示する
7. If コーチングステータスAPIがエラーを返した場合、then the Dashboard UI はエラーメッセージとリトライボタンを表示する

### Requirement 2: デイリーレポート表示
**Objective:** FPSプレイヤーとして、当日または特定日の練習活動レポート（セッション数、パフォーマンス評価、達成事項、明日の推奨）を自動的に確認したい。これにより、日々の成長を実感し、継続的なモチベーションを維持する。

#### Acceptance Criteria
1. When ユーザーがダッシュボードページにアクセスした場合、the Dashboard UI は GET /api/coaching/daily-report エンドポイントを自動的に呼び出す
2. When デイリーレポートAPIが成功応答を返した場合、the Dashboard UI はレポート情報をカード形式で表示する
3. The Dashboard UI は、日付、セッション数、総練習時間、パフォーマンス評価（good/normal/needs_improvement）を視覚的に表示する
4. The Dashboard UI は、達成事項（achievements）をリスト形式で表示する
5. The Dashboard UI は、課題（challenges）をリスト形式で表示する
6. The Dashboard UI は、明日の推奨練習（focusSkills, recommendedScenarios, recommendedDuration）をアクション可能な形式で表示する
7. When ユーザーが日付選択UIを操作した場合、the Dashboard UI は選択された日付のデイリーレポートをAPIから取得して表示する
8. If デイリーレポートが存在しない場合（新規ユーザーまたはデータなし）、then the Dashboard UI は「レポート未作成」メッセージと初回練習促進メッセージを表示する
9. If デイリーレポートAPIがエラーを返した場合、then the Dashboard UI はエラーメッセージとリトライボタンを表示する

### Requirement 3: スコア分析実行と結果表示
**Objective:** FPSプレイヤーとして、直近のスコアデータを詳細に分析し、パフォーマンストレンド、強み、弱点をビジュアルに確認したい。これにより、次の練習方針を具体的に決定できる。

#### Acceptance Criteria
1. The Dashboard UI は、スコア分析実行ボタンを提供する
2. When ユーザーがスコア分析ボタンをクリックした場合、the Dashboard UI は POST /api/coaching/analysis または POST /api/coaching/analysis/scores エンドポイントを呼び出す
3. While スコア分析が実行中の場合、the Dashboard UI はローディングインジケーターとキャンセルボタンを表示する
4. When スコア分析APIが成功応答を返した場合、the Dashboard UI は分析結果をダイアログまたはカード形式で表示する
5. The Dashboard UI は、分析期間（period.start, period.end）を表示する
6. The Dashboard UI は、パフォーマンストレンド（improving/stable/declining）をアイコンとテキストで表示する
7. The Dashboard UI は、強み（strengths）と弱点（challenges）をリスト形式で表示する
8. The Dashboard UI は、達成マイルストーン（milestones）を表示する
9. When チャートデータ（chartData）が存在する場合、the Dashboard UI はグラフまたはチャートコンポーネントで可視化する
10. The Dashboard UI は、分析結果からプレイリスト生成への導線（ボタンまたはリンク）を提供する
11. If スコア分析APIがエラーを返した場合、then the Dashboard UI はエラーメッセージとリトライボタンを表示する

### Requirement 4: プレイリスト生成フォームと結果表示
**Objective:** FPSプレイヤーとして、自分の弱点に特化した練習プレイリストを簡単に生成し、その内容を確認したい。これにより、効率的な練習計画を立てられる。

#### Acceptance Criteria
1. The Dashboard UI は、プレイリスト生成ボタンまたはフォームを提供する
2. When ユーザーがプレイリスト生成UIを操作した場合、the Dashboard UI は対象ゲーム（targetGame）と弱点エリア（weakAreas）の入力フィールドを表示する
3. When ユーザーがプレイリスト生成リクエストを実行した場合、the Dashboard UI は POST /api/coaching/playlist または POST /api/coaching/playlist/generate エンドポイントを呼び出す
4. While プレイリスト生成が実行中の場合、the Dashboard UI はローディングインジケーターを表示する
5. When プレイリスト生成APIが成功応答を返した場合、the Dashboard UI はプレイリスト情報をカードまたはダイアログ形式で表示する
6. The Dashboard UI は、プレイリストタイトル（title）、説明（description）、対象弱点（targetWeaknesses）、総所要時間（totalDuration）を表示する
7. The Dashboard UI は、シナリオリスト（scenarios）を順序付きリストで表示し、各シナリオの目的（purpose）と期待効果（expectedEffect）を含める
8. The Dashboard UI は、プレイリスト生成理由（reasoning）を表示する
9. When プレイリストが正常に生成された場合、the Dashboard UI はプレイリスト保存成功メッセージと次のアクションへの導線を表示する
10. If プレイリスト生成APIがエラーを返した場合、then the Dashboard UI はエラーメッセージとリトライボタンを表示する

### Requirement 5: 振り返りレビュー表示
**Objective:** 復帰ユーザーとして、休止期間の振り返りと復帰後のリハビリ計画を確認したい。これにより、スムーズな練習再開をサポートする。

#### Acceptance Criteria
1. When ユーザーコンテキストが「returning_user」の場合、the Dashboard UI は振り返りレビュー取得ボタンまたは自動表示トリガーを提供する
2. When 振り返りレビューが要求された場合、the Dashboard UI は GET /api/coaching/progress/review または POST /api/coaching/review エンドポイントを呼び出す
3. When 振り返りレビューAPIが成功応答を返した場合、the Dashboard UI はレビュー情報をカードまたはダイアログ形式で表示する
4. The Dashboard UI は、レビュー期間（reviewPeriod.start, reviewPeriod.end, reviewPeriod.days）を表示する
5. The Dashboard UI は、休止前のパフォーマンス（beforePausePerformance.avgScore, strongSkills, activityFrequency）を表示する
6. When 目標進捗（goalProgress）が存在する場合、the Dashboard UI は各目標の達成率と状態（on_track/behind/ahead/completed）を表示する
7. The Dashboard UI は、推奨リハビリプラン（rehabilitationPlan）をリスト形式で表示する
8. The Dashboard UI は、モチベーションメッセージ（motivationalMessage）を目立つ形で表示する
9. The Dashboard UI は、振り返りレビューから次のアクション（プレイリスト生成、スコア分析）への導線を提供する
10. If 振り返りレビューAPIがエラーを返した場合、then the Dashboard UI はエラーメッセージとリトライボタンを表示する

### Requirement 6: 既存チャット機能（AimAssistant）との統合
**Objective:** FPSプレイヤーとして、ダッシュボードとチャット機能をシームレスに利用し、包括的なコーチング体験を得たい。これにより、ビジュアル情報と対話的コーチングを組み合わせた最適な学習環境を実現する。

#### Acceptance Criteria
1. The Dashboard UI は、既存のAimAssistantチャットコンポーネントをダッシュボード内に統合または並列表示する
2. When ユーザーがダッシュボード上のタスク（スコア分析、プレイリスト生成）を実行した場合、the Dashboard UI はチャットUIに実行結果を通知または共有する
3. When ユーザーがチャットUIでコーチングタスクをリクエストした場合、the Dashboard UI はダッシュボードの対応セクションを更新または通知する
4. The Dashboard UI は、チャットUIとダッシュボードUIの切り替えをスムーズに行えるナビゲーションまたはタブを提供する
5. The Dashboard UI は、チャットメッセージとダッシュボードカード間でコンテキスト情報（ユーザーID、スレッドID）を共有する
6. The Dashboard UI は、チャット機能の利用可能性をダッシュボード上に明示する（アイコン、ボタン）

### Requirement 7: コーチングコンテキスト管理
**Objective:** システムとして、ユーザーの現在のコーチング状態（フェーズ、活動状況）を正確に把握し、適切なUIコンポーネントの表示・非表示を制御したい。これにより、ユーザーの状態に最適化されたダッシュボード体験を提供する。

#### Acceptance Criteria
1. When ダッシュボードが初期化された場合、the Dashboard UI は GET /api/coaching/context エンドポイントを呼び出す
2. When コーチングコンテキストAPIが成功応答を返した場合、the Dashboard UI は取得したコンテキスト情報（userId, currentPhase, daysInactive, newScoresCount, hasPlaylist, isNewUser）をReact状態またはコンテキストに保存する
3. When ユーザーコンテキストが「new_user」の場合、the Dashboard UI は初心者向けオンボーディングメッセージと初期評価促進UIを表示する
4. When ユーザーコンテキストが「returning_user」の場合、the Dashboard UI は復帰ウェルカムメッセージと振り返りレビューUIを優先表示する
5. When ユーザーコンテキストが「playlist_recommended」の場合、the Dashboard UI はプレイリスト生成UIを強調表示する
6. When ユーザーコンテキストが「analysis_recommended」の場合、the Dashboard UI はスコア分析UIを強調表示する
7. When コーチングフェーズが変化した場合、the Dashboard UI は表示コンポーネントを動的に更新する
8. The Dashboard UI は、コーチングコンテキストの変更を検知し、適切なタイミングでAPI再取得またはポーリングを実行する

### Requirement 8: レスポンシブレイアウトとアクセシビリティ
**Objective:** FPSプレイヤーとして、スマートフォンおよびPCで快適にダッシュボードを利用し、アクセシビリティ標準に準拠したUIを体験したい。これにより、あらゆる環境で効果的にコーチング機能を活用できる。

#### Acceptance Criteria
1. The Dashboard UI は、Radix UI Themes を中心としたコンポーネント実装を行う
2. The Dashboard UI は、PC（1280px以上）、タブレット（768px-1279px）、スマートフォン（767px以下）の各画面サイズで適切にレイアウトを調整する
3. The Dashboard UI は、スマートフォンとPC両方で最適化された表示と操作性を提供する
4. The Dashboard UI は、Radix UI Themesのレスポンシブシステム（Breakpoints、Container、Grid、Flex）を活用してレイアウトを構築する
5. The Dashboard UI は、Radix UIのアクセシビリティ機能（キーボードナビゲーション、ARIAラベル、スクリーンリーダー対応）を活用する
6. The Dashboard UI は、全てのインタラクティブ要素（ボタン、リンク、フォーム入力）にキーボードアクセスを提供する
7. The Dashboard UI は、適切なコントラスト比（WCAG AA基準以上）を維持する
8. The Dashboard UI は、Tailwind CSS v4のレスポンシブユーティリティクラスとRadix UI Themesを併用してレイアウトを実装する
9. The Dashboard UI は、スマートフォン環境でタッチ操作に最適化されたボタンサイズとスペーシングを提供する

### Requirement 9: 型安全なAPI通信
**Objective:** 開発者として、Hono ClientとTypeScriptを活用した型安全なAPI通信を実装し、ランタイムエラーを最小化したい。これにより、保守性と信頼性の高いフロントエンドコードを実現する。

#### Acceptance Criteria
1. The Dashboard UI は、Hono Clientを使用してバックエンドAPIと通信する
2. The Dashboard UI は、api/langgraph/types.ts で定義された型（DailyReport, ScoreAnalysis, Playlist, ProgressReport, CoachingStatus, TaskResult）をインポートして再利用する
3. The Dashboard UI は、API呼び出し時に型推論によりリクエスト・レスポンスの型安全性を保証する
4. The Dashboard UI は、APIエラーハンドリングで型ガード関数を使用してエラー型を正確に判定する
5. The Dashboard UI は、Zodスキーマを使用してAPIレスポンスのランタイムバリデーションを実行する（必要に応じて）
6. The Dashboard UI は、TypeScript strict modeで全てのコンポーネントとAPI通信ロジックをコンパイルする

### Requirement 10: パフォーマンスとローディング状態管理
**Objective:** FPSプレイヤーとして、API呼び出し中の適切なローディング表示と、高速なページ遷移を体験したい。これにより、ストレスのないユーザー体験を実現する。

#### Acceptance Criteria
1. When ダッシュボードページが初期ロードされた場合、the Dashboard UI は並列API呼び出し（コーチングステータス、デイリーレポート）を実行する
2. While API呼び出しが実行中の場合、the Dashboard UI は各カードにスケルトンローダーまたはスピナーを表示する
3. The Dashboard UI は、TanStack Query（React Query）を使用してAPI状態管理、キャッシング、自動リトライを実装する
4. The Dashboard UI は、APIレスポンスをキャッシュし、同一データへの重複リクエストを防止する
5. The Dashboard UI は、バックグラウンドでのデータ再検証（stale-while-revalidate）を実装する
6. When APIエラーが発生した場合、the Dashboard UI は指数バックオフによる自動リトライを実行する
7. The Dashboard UI は、TanStack Start SSRの最適化機能を活用し、初回レンダリングを高速化する
8. The Dashboard UI は、コンポーネントの遅延ロード（React.lazy）を使用して初期バンドルサイズを削減する
