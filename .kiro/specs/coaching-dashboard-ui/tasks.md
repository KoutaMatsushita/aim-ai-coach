# Implementation Plan: coaching-dashboard-ui

## Overview
このタスクリストは、既存のコーチングバックエンドAPI群（10種類のエンドポイント)を統合した包括的ダッシュボードUIの実装を定義します。TanStack Start SSR + React 19 + Radix UI Themes + Tailwind CSS v4 を使用し、スマートフォン・PC両対応のレスポンシブUIを実現します。

**実装の前提条件**:
- 既存バックエンドAPI（`api/routes/coaching.ts`）は実装済み
- 型定義（`api/langgraph/types.ts`）は再利用
- 既存チャット機能（`AimAssistant`）は維持

**技術スタック**:
- React 19, TanStack Query 5.90.5, Radix UI Themes 3.2.1, Tailwind CSS v4
- 新規導入: Tremor（チャート）, react-day-picker 8.10.1（日付選択）, date-fns

---

## Tasks

### Phase 1: 基盤セットアップ

- [x] 1. (P) 新規依存関係のインストール
  - Tremorの最新安定版をインストール（`bun add @tremor/react`）
  - react-day-picker 8.10.1をインストール（`bun add react-day-picker@8.10.1`）
  - date-fnsをインストール（`bun add date-fns`）
  - インストール後、`bun.lock`が正常に更新されることを確認
  - _Requirements: 2, 3_

- [x] 2. (P) ダッシュボードページルートの作成
  - TanStack Routerのfile-basedルーティングに従い、`/dashboard`ルートを定義
  - 認証済みユーザーのみアクセス可能（Better Auth統合）
  - Radix UI ThemesのContainer、Grid、Flexを使用したレイアウト実装
  - スマートフォン・PC両対応のレスポンシブブレークポイント設定（767px以下、768px-1279px、1280px以上）
  - _Requirements: 1, 8_

### Phase 2: コーチングコンテキスト管理

- [x] 3. グローバルコーチングコンテキストの構築
- [x] 3.1 (P) CoachingContextProviderの実装
  - React Context APIを使用してグローバル状態管理を実装
  - TanStack Queryの`useQuery`で`GET /api/coaching/context`を呼び出し
  - `CoachingContextValue`インターフェース（userId、userContext、currentPhase、daysInactive、newScoresCount、hasPlaylist、isNewUser、isLoading、isError、error、refetch）を提供
  - staleTime: 5分、cacheTime: 10分のキャッシング設定
  - _Requirements: 7_

- [x] 3.2 (P) useCoachingContextカスタムフックの作成
  - `CoachingContextValue`を返すカスタムフックを実装
  - コンテキスト未初期化時のエラーハンドリング（「CoachingContextProviderでラップされていません」エラー）
  - _Requirements: 7_

### Phase 3: API通信カスタムフックの構築

- [x] 4. (P) useCoachingStatusフックの実装
  - TanStack Queryの`useQuery`で`GET /api/coaching/status`を呼び出し
  - Hono Clientを使用して型安全なAPI通信を実現
  - `CoachingStatus`型（`api/langgraph/types.ts`）をインポート
  - リトライ設定: 3回、指数バックオフ
  - _Requirements: 1, 9, 10_

- [x] 5. (P) useDailyReportフックの実装
  - TanStack Queryの`useQuery`で`GET /api/coaching/daily-report`を呼び出し
  - 日付指定オプション（`date?: Date`）をサポート
  - `DailyReport`型（`api/langgraph/types.ts`）をインポート
  - 日付変更時の動的refetch対応
  - _Requirements: 2, 9, 10_

- [x] 6. (P) useScoreAnalysisフックの実装
  - TanStack Queryの`useMutation`で`POST /api/coaching/analysis`を呼び出し
  - `ScoreAnalysis`型（`api/langgraph/types.ts`）をインポート
  - POSTエンドポイントはリトライなし（明示的リトライボタン提供）
  - キャンセル機能（TanStack Query cancellation）を実装
  - _Requirements: 3, 9, 10_

- [x] 7. (P) usePlaylistGeneratorフックの実装
  - TanStack Queryの`useMutation`で`POST /api/coaching/playlist`を呼び出し
  - `PlaylistGenerationInput`インターフェース（targetGame、weakAreas）を定義
  - `Playlist`型（`api/langgraph/types.ts`）をインポート
  - フォーム入力バリデーション（weakAreasが少なくとも1件）
  - _Requirements: 4, 9, 10_

- [x] 8. (P) useProgressReviewフックの実装
  - TanStack Queryの`useQuery`で`GET /api/coaching/progress/review`を呼び出し
  - `enabled`オプションで条件分岐実行（userContext === "returning_user"）
  - `ProgressReport`型（`api/langgraph/types.ts`）をインポート
  - _Requirements: 5, 9, 10_

### Phase 4: UIコンポーネントの実装

- [x] 9. (P) CoachingStatusCardコンポーネントの実装
  - Radix UI ThemesのCard、Badge、Flexを使用
  - lucide-reactアイコンでビジュアル要素を実装（TrendingUp、TrendingDown等）
  - userContext、todayFocus、scoreTrendSummary、activePlaylist、latestReportを表示
  - ローディング時はSkeleton表示、エラー時はリトライボタン表示
  - _Requirements: 1, 8_

- [x] 10. DailyReportCardコンポーネントの実装
- [x] 10.1 (P) 基本レポートカードの構築
  - Tremor Date Pickerを統合（react-day-picker + Radix UI Popover）
  - date-fnsで日付フォーマット（YYYY-MM-DD）、日本語ロケール対応
  - performanceRating（good/normal/needs_improvement）を色分け表示
  - achievements、challenges、tomorrowRecommendationsをリスト表示
  - 日付選択でレポート再取得
  - _Requirements: 2, 8_

- [ ]* 10.2 DailyReportCardのレンダリングテスト
  - Vitestとtesting-libraryでレンダリングテスト
  - 日付選択操作のインタラクションテスト
  - エンプティステート（「レポート未作成」）のテスト
  - _Requirements: 2_

- [x] 11. スコア分析カードと結果表示の構築
- [x] 11.1 (P) ScoreAnalysisCardコンポーネントの実装
  - 分析実行Buttonを提供（Radix UI Themes Button）
  - ローディング中はスピナーとキャンセルボタン表示
  - _Requirements: 3, 8_

- [x] 11.2 (P) AnalysisDialogコンポーネントの実装
  - Radix UI ThemesのDialogで分析結果を表示
  - trend（improving/stable/declining）をアイコンとテキストで表示
  - strengths、challenges、milestonesをリスト表示
  - プレイリスト生成への導線ボタンを提供
  - _Requirements: 3, 8_

- [x] 11.3 (P) TremorチャートコンポーネントとchartData型変換の実装
  - Tremorの`AreaChart`または`LineChart`を使用
  - `chartDataToTremorFormat`ユーティリティ関数を実装
  - `ScoreAnalysis['chartData']`型（labels、datasets）をTremor形式に変換
  - chartDataが存在する場合のみチャート表示
  - _Requirements: 3_

- [ ]* 11.4 ScoreAnalysisCard統合テスト
  - 分析実行フロー（ボタンクリック → API呼び出し → 結果表示）の統合テスト
  - chartData型変換ロジックのユニットテスト
  - MSWでAPI呼び出しをモック
  - _Requirements: 3_

- [x] 12. プレイリスト生成カードの構築
- [x] 12.1 (P) PlaylistGeneratorCardコンポーネントの実装
  - Radix UI ThemesのTextarea、Textfieldでフォーム実装
  - targetGame、weakAreasの入力フィールド提供
  - バリデーション（weakAreas最低1件）をクライアント側で実行
  - 生成ボタンクリックで`usePlaylistGenerator`を呼び出し
  - _Requirements: 4, 8_

- [x] 12.2 (P) PlaylistDialogコンポーネントの実装
  - Radix UI ThemesのDialogでプレイリスト結果を表示
  - title、description、targetWeaknesses、totalDurationを表示
  - scenariosを順序付きリストで表示（order順にソート）
  - 各シナリオのpurpose、expectedEffect、difficultyLevelを表示
  - reasoningを表示
  - _Requirements: 4, 8_

- [ ]* 12.3 PlaylistGeneratorCard統合テスト
  - フォームバリデーション、生成フロー、結果表示の統合テスト
  - MSWでAPI呼び出しをモック
  - _Requirements: 4_

- [x] 13. (P) ProgressReviewCardコンポーネントの実装
  - `useCoachingContext`でuserContextを取得
  - userContext === "returning_user"の場合のみレンダリング（条件分岐表示）
  - reviewPeriod、beforePausePerformance、goalProgress、rehabilitationPlan、motivationalMessageを表示
  - Radix UI ThemesのProgressでgoalProgress可視化（progressPercent: 0-100）
  - _Requirements: 5, 7, 8_

### Phase 5: チャット統合とダッシュボードレイアウト

- [x] 14. チャット統合の実装
- [x] 14.1 (P) ChatModalコンポーネントの実装
  - Radix UI ThemesのDialogでフルスクリーンモーダル実装
  - 既存`AimAssistant`コンポーネントをモーダル内に埋め込み
  - ダッシュボード右下に固定チャットアイコンボタン配置
  - スマートフォン対応（フルスクリーン表示）
  - モーダル開閉アニメーション対応
  - _Requirements: 6, 8_

- [x] 14.2 DashboardPageレイアウトと統合
  - `CoachingContextProvider`でページ全体をラップ
  - Radix UI ThemesのGrid、Flexでカード群を配置
  - レスポンシブレイアウト（スマートフォン: 1カラム、タブレット: 2カラム、PC: 3カラム）
  - カード表示順: CoachingStatusCard → DailyReportCard → ScoreAnalysisCard → PlaylistGeneratorCard → ProgressReviewCard（条件分岐）
  - `ChatModal`を配置（固定ボタンとモーダル）
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8_

- [x] 14.3 (P) 並列API呼び出しの最適化
  - status、report、contextの3つのGETエンドポイントを並列呼び出し
  - TanStack Queryの`useQueries`で並列クエリ管理
  - 全てのクエリが完了するまでSkeletonローダー表示
  - _Requirements: 10_

### Phase 6: エラーハンドリングと品質保証

- [x] 15. エラーハンドリングの実装
- [x] 15.1 (P) 統一エラーコンポーネントの作成
  - Radix UI ThemesのCalloutまたはAlertで統一エラー表示
  - リトライボタン、エラーメッセージ、HTTPステータスコード表示
  - 401エラー時はログインページへリダイレクト（Better Auth）
  - 404エラー時はエンプティステート表示
  - 500エラー時はリトライボタン提供
  - _Requirements: 1, 2, 3, 4, 5_

- [x] 15.2 (P) 型ガード関数とエラーロギングの実装
  - `isApiError`型ガード関数を実装（`{ message: string; status: number }`型判定）
  - エラー発生時のコンソールログ出力（`console.error("API Error:", error, { userId, endpoint })`）
  - TanStack Queryの`onError`コールバックで統一エラーハンドリング
  - _Requirements: 9_

- [x] 16. アクセシビリティとレスポンシブレイアウトの検証
- [x] 16.1 (P) レスポンシブレイアウトのクロスデバイステスト
  - ブラウザ開発者ツールでスマートフォン（767px以下）、タブレット（768px-1279px）、PC（1280px以上）の各画面サイズをテスト
  - Radix UI ThemesのBreakpoints（`sm:`, `md:`, `lg:`）が正常に適用されることを確認
  - Tailwind CSS v4のレスポンシブユーティリティクラスが機能することを確認
  - スマートフォン環境でタッチ操作に最適化されたボタンサイズ（最小44x44px）を検証
  - _Requirements: 8_

- [x] 16.2 (P) アクセシビリティ基準の検証
  - キーボードナビゲーション（Tab、Enter、Escキー）が全インタラクティブ要素で機能することを確認
  - Radix UI ThemesのARIAラベル、スクリーンリーダー対応が適用されていることを確認
  - コントラスト比がWCAG AA基準（4.5:1以上）を満たすことをブラウザツール（Lighthouse、axe DevTools）で検証
  - lucide-reactアイコンに適切なaria-labelが付与されていることを確認
  - _Requirements: 8_

### Phase 7: パフォーマンス最適化

- [x] 17. パフォーマンス最適化の実装
- [x] 17.1 (P) React.lazyによるコード分割
  - 大きなコンポーネント（`AnalysisDialog`、`PlaylistDialog`、`ChatModal`）を`React.lazy`で遅延ロード
  - Suspenseで遅延ロード中のフォールバックUI（Skeleton）を提供
  - 初回バンドルサイズを測定（bun build後の`dist/`サイズ確認）
  - _Requirements: 10_

- [x] 17.2 (P) TanStack Queryキャッシング設定の最適化
  - `staleTime: 5 * 60 * 1000`（5分）、`cacheTime: 10 * 60 * 1000`（10分）が正常に機能することを確認
  - ブラウザ開発者ツールのNetworkタブで重複リクエスト防止を検証
  - 2回目以降のアクセス時にキャッシュが有効であることを確認（APIリクエストが発生しないことを確認）
  - _Requirements: 10_

### Phase 8: 統合テストとコード品質

- [ ] 18. 統合テストの実装
- [ ] 18.1 (P) ダッシュボード初期ロードフローの統合テスト
  - MSWで`GET /api/coaching/status`、`GET /api/coaching/daily-report`、`GET /api/coaching/context`をモック
  - 並列API呼び出し（3つのGETエンドポイント）が正常に実行されることを検証
  - Skeleton表示 → データ表示への遷移をテスト
  - _Requirements: 10_

- [ ] 18.2 (P) エラーハンドリングの統合テスト
  - MSWで各APIエンドポイントのエラーレスポンス（401、404、500）をモック
  - TanStack Queryの自動リトライ（3回、指数バックオフ）が機能することを検証
  - エラーカード表示、リトライボタンクリック、エラー解消フローをテスト
  - _Requirements: 1, 2, 3, 4, 5_

- [ ] 19. (P) コードレビューとリファクタリング
  - TypeScript strict modeで全コンポーネントが正常にコンパイルされることを確認（`bun run typecheck`）
  - Biomeでlintとフォーマットを実行（`bun check:write`）
  - 不要なコメント、デバッグコード、console.logを削除
  - コンポーネントの責任分離が適切であることを検証（design.mdのアーキテクチャ境界に準拠）
  - _Requirements: 9_

---

## Requirements Coverage

| Requirement ID | Requirement Summary | Covered by Tasks |
|---------------|---------------------|------------------|
| 1 | コーチングステータス表示 | 2, 4, 9, 14.2, 15.1, 18.2 |
| 2 | デイリーレポート表示 | 1, 5, 10.1, 10.2, 14.2, 15.1, 18.2 |
| 3 | スコア分析実行と結果表示 | 1, 6, 11.1, 11.2, 11.3, 11.4, 14.2, 15.1, 18.2 |
| 4 | プレイリスト生成フォームと結果表示 | 7, 12.1, 12.2, 12.3, 14.2, 15.1, 18.2 |
| 5 | 振り返りレビュー表示 | 8, 13, 14.2, 15.1, 18.2 |
| 6 | 既存チャット機能との統合 | 14.1, 14.2 |
| 7 | コーチングコンテキスト管理 | 3.1, 3.2, 13, 14.2 |
| 8 | レスポンシブレイアウトとアクセシビリティ | 2, 9, 10.1, 11.1, 11.2, 12.1, 12.2, 13, 14.1, 14.2, 16.1, 16.2 |
| 9 | 型安全なAPI通信 | 4, 5, 6, 7, 8, 15.2, 19 |
| 10 | パフォーマンスとローディング状態管理 | 4, 5, 6, 7, 14.3, 17.1, 17.2, 18.1 |

**全10要件がカバーされています。**

---

## Task Summary

- **合計**: 19メジャータスク、41サブタスク
- **並列実行可能タスク**: 25タスク（`(P)`マーク付き）
- **オプションタスク**: 4タスク（`*`マーク付き、テストカバレッジ）
- **平均作業時間**: 1-3時間/サブタスク
- **推定総作業時間**: 60-120時間（並列実行で短縮可能）

---

**生成日時**: 2025-11-12T03:00:00Z
**次のステップ**: タスク承認後、`/kiro:spec-impl coaching-dashboard-ui 1`で実装開始
