# 調査・設計決定記録: coaching-dashboard-ui

---
**目的**: 発見フェーズの調査結果、アーキテクチャ検討、設計決定の根拠を記録する。

**活用方法**:
- 発見フェーズでのリサーチ活動と成果をログ化
- `design.md` に含むには詳細すぎる設計決定のトレードオフを文書化
- 将来の監査や再利用のための参照情報を提供
---

## サマリー

- **機能**: `coaching-dashboard-ui`
- **発見スコープ**: Extension（既存システムへの拡張）
- **主要な発見事項**:
  - Recharts は Radix UI Themes との親和性が高く、TypeScript 完全対応
  - react-day-picker + Radix UI Popover の組み合わせが標準パターン
  - TanStack Query v5 は React 19 完全互換、並列クエリ・リトライ戦略が実装済み

## リサーチログ

### チャート可視化ライブラリ選定

**コンテキスト**: Requirement 3 でチャートデータ（chartData）を可視化する必要がある。

**調査したソース**:
- [Best React chart libraries (2025 update) - LogRocket Blog](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [Tremor – Tailwind CSS UI Components for Charts](https://www.tremor.so/)
- [Top 5 React Chart Libraries for 2025 - Syncfusion](https://www.syncfusion.com/blogs/post/top-5-react-chart-libraries-2025)

**発見内容**:
- **Recharts**: 24.8K GitHub スター、React + D3 ベース、SVG レンダリング、シンプルで使いやすい
  - TypeScript 完全対応
  - 小〜中規模データセットに最適
  - レスポンシブデザイン対応
  - ドキュメント充実
- **Tremor**: Recharts + Radix UI ベースの構築済みコンポーネント
  - 35+ アクセシブルなダッシュボード・チャートコンポーネント
  - Tailwind CSS v4 統合
  - Radix UI Themes との親和性が高い
- **その他候補**:
  - Nivo: 美しいプリセット、カスタマイズ性高
  - Visx: D3 プリミティブ、完全制御
  - TanStack React Charts: 新興、軽量

**実装への影響**:
- **推奨**: Tremor（Recharts ベース）を採用
  - 既存スタック（Radix UI Themes、Tailwind CSS v4）との完全統合
  - アクセシビリティ標準準拠（WCAG 2.1 AA）
  - TypeScript strict mode 対応
  - 追加学習コスト最小化（プロジェクトの既存パターンに準拠）

### 日付選択コンポーネント選定

**コンテキスト**: Requirement 2 で日付選択UIが必要（デイリーレポート取得）。

**調査したソース**:
- [GitHub - react-day-picker](https://github.com/gpbl/react-day-picker)
- [Date Picker - Tremor Docs](https://www.tremor.so/docs/inputs/date-picker)
- [DatePicker Primitive - Radix UI Discussion](https://github.com/radix-ui/primitives/discussions/969)

**発見内容**:
- **react-day-picker v9**:
  - TypeScript 完全対応、date-fns ベース
  - WCAG 2.1 AA 準拠
  - カスタマイズ性高、React 19 互換
- **Radix UI との統合パターン**:
  - react-day-picker + Radix UI Popover の組み合わせが標準
  - Tremor が同様のパターンで Date Picker コンポーネント提供
- **Radix UI ネイティブ Date Picker**:
  - 現在は実験的段階、将来的にプリミティブとして提供予定
  - 現時点では react-day-picker との組み合わせが推奨

**実装への影響**:
- **推奨**: Tremor の Date Picker コンポーネントを採用
  - react-day-picker v8.10.1 + Radix UI Popover ベース
  - date-fns による日付操作
  - Tailwind CSS v4 スタイリング対応
  - アクセシビリティ標準準拠
  - 既存スタックとの完全統合

### TanStack Query 並列クエリ・エラーハンドリング

**コンテキスト**: Requirement 10 でパフォーマンス最適化（並列API呼び出し、キャッシング、自動リトライ）が必要。

**調査したソース**:
- [Query Retries - TanStack Query Docs](https://tanstack.com/query/v4/docs/framework/react/guides/query-retries)
- [React Query Guide 2025](https://www.greasyguide.com/development/react-query-tanstack-guide-2025/)
- [TanStack Query - Smarter Data Fetching](https://blog.openreplay.com/tanstack-query-smarter-data-fetching-react/)

**発見内容**:
- **React 19 互換性**: TanStack Query v5+ は React 19 完全互換、API 変更なし
- **リトライ戦略**:
  - デフォルト: 3回リトライ
  - 設定可能: `retry: false`（リトライなし）、`retry: true`（無限リトライ）、`retry: 3`（回数指定）
  - 条件分岐リトライ: エラータイプ別（404 はリトライしない、500 はリトライ等）
- **並列クエリ**:
  - `useQueries` で動的並列クエリ対応
  - 個別クエリのリトライ設定可能
  - キーベースの重複実行防止
- **エラーハンドリング**:
  - `isError` と `error` プロパティでエラー状態管理
  - 指数バックオフ対応
  - `invalidateQueries` でリフェッチトリガー

**実装への影響**:
- 並列クエリ: ダッシュボード初期ロード時に `/api/coaching/status` と `/api/coaching/daily-report` を並列呼び出し
- リトライ設定:
  - GET エンドポイント: 3回リトライ、指数バックオフ
  - POST エンドポイント: ユーザーアクション必要、リトライなし（明示的リトライボタン提供）
- キャッシング: staleTime（5分）、cacheTime（10分）で設定
- エラーハンドリング: 統一エラーコンポーネント、リトライボタン、エラートースト

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク・制限事項 | 備考 |
|----------|------|------|----------------|------|
| **Option B: 新規 `/dashboard` ルート** | 既存チャット（`/`）を維持し、新規 `/dashboard` ルートを作成 | 責任分離、既存機能への影響最小化、段階的実装可能 | ナビゲーション追加（1ステップ増加） | 既存パターン踏襲（`/account/settings`、`/knowledges`） |
| Option A: `/` ルート拡張 | 既存 `/` ルートにダッシュボードを統合 | 単一ページで完結、ナビゲーション不要 | 既存チャットUIへの大幅変更リスク、複雑度増加 | 既存機能への影響が大きい |
| Option C: ハイブリッド（タブ） | `/` ルートにタブ切り替えを追加 | 単一ページで2機能切り替え可能 | 状態管理複雑化、モバイル表示煩雑 | 中間的なアプローチ |

**選択**: **Option B（新規 `/dashboard` ルート作成）**

## 設計決定

### 決定: チャート可視化ライブラリとして Tremor を採用

**コンテキスト**: スコア分析（chartData）を可視化する必要がある。Recharts、Tremor、Nivo、Visx が候補。

**検討した代替案**:
1. **Recharts** — 直接利用、シンプルで軽量
2. **Tremor** — Recharts + Radix UI ベースの構築済みコンポーネント
3. **Nivo** — 美しいプリセット、カスタマイズ性高
4. **Visx** — D3 プリミティブ、完全制御

**選択したアプローチ**: **Tremor**
- Recharts ベース（内部的に利用）
- Radix UI Themes との完全統合
- Tailwind CSS v4 スタイリング対応
- TypeScript strict mode 対応
- アクセシビリティ標準準拠（WCAG 2.1 AA）

**根拠**:
- 既存スタック（Radix UI Themes、Tailwind CSS v4）との完全統合
- 追加学習コスト最小化（プロジェクトの既存パターンに準拠）
- Recharts の柔軟性を継承しつつ、構築済みコンポーネントで開発速度向上
- アクセシビリティ標準準拠が組み込み済み

**トレードオフ**:
- **利点**: 開発速度向上、既存スタック統合、アクセシビリティ標準準拠
- **妥協**: カスタマイズの自由度が Recharts 直接利用より若干低い（ただし、十分な柔軟性あり）

**フォローアップ**: 実装フェーズで chartData 型（`api/langgraph/types.ts:166-172`）と Tremor のチャートコンポーネント API 互換性を検証

### 決定: 日付選択に Tremor Date Picker を採用

**コンテキスト**: デイリーレポート取得のための日付選択UIが必要。

**検討した代替案**:
1. **react-day-picker + Radix UI Popover** — カスタム統合
2. **Tremor Date Picker** — 構築済みコンポーネント
3. **Radix UI ネイティブ Date Picker** — 実験的段階、未リリース

**選択したアプローチ**: **Tremor Date Picker**
- react-day-picker v8.10.1 ベース
- Radix UI Popover 統合済み
- date-fns による日付操作
- WCAG 2.1 AA 準拠

**根拠**:
- 既存スタックとの完全統合（Radix UI Themes、Tailwind CSS v4）
- アクセシビリティ標準準拠が組み込み済み
- カスタム統合の実装コスト削減
- react-day-picker の柔軟性を継承

**トレードオフ**:
- **利点**: 開発速度向上、アクセシビリティ標準準拠、統一されたデザインシステム
- **妥協**: カスタマイズの自由度が若干低い（ただし、十分な柔軟性あり）

**フォローアップ**: 実装フェーズで日本語ロケール対応と日付フォーマット（`YYYY-MM-DD`）を検証

### 決定: コンテキスト管理に React Context API を採用（Zustand は不採用）

**コンテキスト**: ユーザーコンテキスト（userContext、userId、threadId）をダッシュボード全体で共有する必要がある。

**検討した代替案**:
1. **React Context API** — React 標準、シンプル
2. **Zustand** — 軽量状態管理ライブラリ、既存プロジェクトに導入済み（`package.json:78`）

**選択したアプローチ**: **React Context API**
- `CoachingContextProvider` でグローバル状態管理
- `useCoachingContext` カスタムフックで状態アクセス
- TanStack Query との連携（API呼び出し結果を Context に反映）

**根拠**:
- 状態の複雑度が低い（userContext、userId、threadId のみ）
- React 標準機能、追加依存関係不要
- TanStack Query でサーバー状態管理、クライアント状態は最小化
- Zustand はオーバーエンジニアリング（現時点では不要）

**トレードオフ**:
- **利点**: シンプル、追加依存関係不要、React 標準パターン
- **妥協**: 将来的に状態が複雑化した場合、Zustand への移行が必要になる可能性

**フォローアップ**: 実装フェーズで状態更新頻度を監視、パフォーマンス問題が発生した場合は Zustand への移行を検討

### 決定: チャット統合パターンとしてモーダル方式を採用

**コンテキスト**: Requirement 6 で既存チャット（AimAssistant）とダッシュボードをシームレスに統合する必要がある。

**検討した代替案**:
1. **モーダル方式** — ダッシュボードのボタンでチャットモーダルを開く
2. **サイドパネル方式** — ダッシュボード横にチャットパネルを常時表示
3. **タブ方式** — ダッシュボードとチャットをタブ切り替え
4. **別ルート方式** — Header ナビゲーションで `/` と `/dashboard` を切り替え

**選択したアプローチ**: **モーダル方式**
- ダッシュボード右下に固定チャットアイコンボタン
- クリックで Radix UI Dialog によるフルスクリーンモーダル表示
- AimAssistant コンポーネントをモーダル内に埋め込み
- モーダル内でコーチングタスク実行結果を表示

**根拠**:
- スマートフォン対応が容易（フルスクリーンモーダル）
- ダッシュボード画面領域を最大限活用
- AimAssistant コンポーネントを既存のまま再利用可能
- Radix UI Dialog のアクセシビリティ機能活用

**トレードオフ**:
- **利点**: スマートフォン対応、画面領域最大活用、既存コンポーネント再利用
- **妥協**: チャットとダッシュボードの同時表示不可（ただし、モバイルファーストでは問題にならない）

**フォローアップ**: 実装フェーズでモーダルの開閉アニメーション、PC版での適切なサイズ調整を検討

## リスクと軽減策

- **リスク**: Tremor のバージョンアップにより API 破壊的変更が発生する可能性
  - **軽減策**: package.json でバージョン固定、アップデート時は changelog 確認
- **リスク**: TanStack Query の並列クエリでエラーハンドリングが複雑化
  - **軽減策**: 統一エラーハンドリングユーティリティ作成、個別クエリのリトライ設定を明示的に管理
- **リスク**: React Context API のパフォーマンス問題（状態更新頻度が高い場合）
  - **軽減策**: TanStack Query でサーバー状態管理、クライアント状態を最小化。必要に応じて Zustand へ移行
- **リスク**: チャートデータ型（chartData）と Tremor の互換性問題
  - **軽減策**: 実装フェーズで型変換ユーティリティ作成、テストで検証

## 参照資料

- [Tremor - Tailwind CSS UI Components](https://www.tremor.so/) — Recharts + Radix UI ベースのチャート・ダッシュボードコンポーネント
- [react-day-picker GitHub](https://github.com/gpbl/react-day-picker) — TypeScript 対応日付選択ライブラリ
- [TanStack Query v5 Docs](https://tanstack.com/query/latest/docs/framework/react/overview) — React 19 対応、並列クエリ・リトライ戦略
- [Radix UI Themes Docs](https://www.radix-ui.com/themes/docs) — レスポンシブシステム、アクセシビリティ標準
- [Best React Chart Libraries 2025 - LogRocket](https://blog.logrocket.com/best-react-chart-libraries-2025/) — チャートライブラリ比較
