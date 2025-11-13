# ギャップ分析: coaching-dashboard-ui

**実施日**: 2025-11-12
**分析対象**: 既存のコーチングAPI群を統合した包括的ダッシュボードUI実装
**既存実装**: TanStack Start + React 19 + Radix UI Themes、10個のコーチングAPIエンドポイント

---

## エグゼクティブサマリー

- **現状**: シンプルなチャットUI（`AimAssistant`）のみ実装済み。10個の完全実装されたコーチングAPIエンドポイントが未統合。
- **ギャップ**: ダッシュボードUI全体（ステータス表示、レポート表示、分析実行、プレイリスト生成、レビュー表示）が未実装。
- **統合ポイント**: Hono Client、型定義、TanStack Query、Radix UI Themes が部分的に利用可能。
- **推奨アプローチ**: **Option B（新規コンポーネント作成）** - 既存チャットを維持し、新規ダッシュボードページ・コンポーネント群を追加。
- **複雑度**: **M（Medium、3-7日）** - 既存パターンを拡張し、10個のAPIを統合。チャート可視化ライブラリ選定が必要。

---

## 1. 現状分析

### 1.1 既存の再利用可能アセット

#### フロントエンド基盤（完全利用可能）

| アセット | 場所 | 再利用性 | 備考 |
|---------|------|---------|------|
| **TanStack Router** | `src/routes/` | ✅ 完全 | File-based routing、`/` は既存チャット、新規ルート追加可能 |
| **TanStack Query** | `src/routes/__root.tsx:67` | ✅ 完全 | QueryClient 設定済み、API状態管理・キャッシング可能 |
| **Radix UI Themes** | `package.json:42`, `__root.tsx:3,75` | ✅ 完全 | Theme、Button、Flex、Heading、AlertDialog 利用実績あり |
| **Hono Client** | `src/lib/client.ts` | ✅ 完全 | `hc<APIType>` で型安全API通信、credentials: include 設定済み |
| **型定義（Backend）** | `api/langgraph/types.ts` | ✅ 完全 | `DailyReport`, `ScoreAnalysis`, `Playlist`, `ProgressReport`, `CoachingStatus`, `TaskResult` |
| **Tailwind CSS v4** | `package.json:74` | ✅ 完全 | レスポンシブユーティリティクラス、`__root.tsx` でグローバル設定 |

#### UI コンポーネント（部分利用可能）

| コンポーネント | 場所 | 再利用性 | ギャップ |
|---------------|------|---------|---------|
| **Card** | `src/components/ui/card.tsx` | 🟡 拡張必要 | Card基本構造あり、ダッシュボード用カスタムレイアウトが必要 |
| **Button** | `src/components/ui/button.tsx` | ✅ 完全 | variant、size、asChild 対応、そのまま利用可能 |
| **Avatar** | `src/components/ui/avatar.tsx` | ✅ 完全 | AimAssistant で利用実績 |
| **Dialog** | `src/components/ui/dialog.tsx` | ✅ 完全 | モーダル表示に利用可能 |
| **ScrollArea** | `src/components/ui/scroll-area.tsx` | ✅ 完全 | スクロール可能エリアに利用 |
| **Skeleton** | `src/components/ui/skeleton.tsx` | ✅ 完全 | ローディング状態に利用 |
| **Textarea** | `src/components/ui/textarea.tsx` | ✅ 完全 | フォーム入力に利用 |

**未実装UIコンポーネント**:
- チャート可視化コンポーネント（Requirement 3: chartData 表示）
- 日付選択コンポーネント（Requirement 2: 日付選択UI）
- ステータスバッジ・トレンド表示（Requirement 1: スコアトレンドビジュアル）

#### バックエンドAPI（完全実装済み）

| エンドポイント | 場所 | ステータス | レスポンス型 |
|---------------|------|----------|------------|
| `GET /api/coaching/status` | `api/routes/coaching.ts:222-380` | ✅ 実装済み | `CoachingStatus` |
| `GET /api/coaching/daily-report` | `api/routes/coaching.ts:518-555` | ✅ 実装済み | `DailyReport` |
| `POST /api/coaching/analysis` | `api/routes/coaching.ts:70-125` | ✅ 実装済み | `ScoreAnalysis` |
| `POST /api/coaching/analysis/scores` | `api/routes/coaching.ts:477-513` | ✅ 実装済み | `ScoreAnalysis` |
| `POST /api/coaching/playlist` | `api/routes/coaching.ts:127-169` | ✅ 実装済み | `Playlist` |
| `POST /api/coaching/playlist/generate` | `api/routes/coaching.ts:383-429` | ✅ 実装済み | `Playlist` |
| `GET /api/coaching/progress/review` | `api/routes/coaching.ts:435-472` | ✅ 実装済み | `ProgressReport` |
| `POST /api/coaching/review` | `api/routes/coaching.ts:172-216` | ✅ 実装済み | `ProgressReport` |
| `GET /api/coaching/context` | `api/routes/coaching.ts:560-590` | ✅ 実装済み | `CoachingContext` |
| `POST /api/chat` | `api/routes/chat.ts` | ✅ 実装済み | SSE Stream |

**既存UI統合状況**:
- ❌ すべてのコーチングAPIエンドポイントが未利用（現在は `/api/chat` のみ使用）

#### 既存チャットコンポーネント

| コンポーネント | 場所 | 再利用性 | 統合方針 |
|---------------|------|---------|---------|
| **AimAssistant** | `src/components/AimAssistant.tsx` | 🟡 統合必要 | Requirement 6: ダッシュボード内統合または並列表示 |
| **ChatPage** | `src/components/page/ChatPage.tsx` | 🟡 統合必要 | 現在 `/` ルートで全画面表示、ダッシュボードと統合 |

### 1.2 プロジェクト規約・パターン

| 領域 | パターン | 適用方法 |
|------|---------|---------|
| **ルーティング** | File-based (`src/routes/`) | 新規 `/dashboard` ルートまたは `/` 拡張 |
| **import** | `@/*` 絶対パス（frontend）、相対パス（backend） | フロントエンドコードは `@/` 利用 |
| **コンポーネント命名** | PascalCase (`ChatPage.tsx`) | 新規コンポーネントも同規約に従う |
| **UI スタイル** | Radix UI Themes + Tailwind CSS v4 | Requirement 8 に準拠 |
| **認証** | `requireUser` middleware | すべてのコーチングAPI実装済み |
| **API通信** | Hono Client (`src/lib/client.ts`) | 型安全な通信、credentials: include |

---

## 2. 要件マッピングとギャップ

### Requirement 1: コーチングステータス表示

| 要素 | 既存アセット | ギャップ | 制約 |
|------|------------|---------|------|
| GET /api/coaching/status | ✅ API実装済み | ❌ UI未実装 | - |
| CoachingStatus型 | ✅ `api/langgraph/types.ts:213-234` | - | 型再利用可能 |
| ステータスカードUI | 🟡 Card基本構造あり | ❌ カスタムレイアウト未実装 | Radix UI Themes Card 拡張 |
| トレンドビジュアル（アイコン、色分け） | - | ❌ 未実装 | アイコンライブラリ: lucide-react 利用可能 |
| エラーハンドリング・リトライUI | - | ❌ 未実装 | TanStack Query の retry 機能活用 |

**実装内容**:
- ステータス表示カードコンポーネント新規作成
- TanStack Query で GET /api/coaching/status 呼び出し
- ユーザーコンテキスト別バッジ表示
- トレンドアイコン・色分けロジック

### Requirement 2: デイリーレポート表示

| 要素 | 既存アセット | ギャップ | 制約 |
|------|------------|---------|------|
| GET /api/coaching/daily-report | ✅ API実装済み | ❌ UI未実装 | - |
| DailyReport型 | ✅ `api/langgraph/types.ts:139-154` | - | 型再利用可能 |
| レポートカードUI | 🟡 Card基本構造あり | ❌ カスタムレイアウト未実装 | 達成事項・課題リスト表示 |
| 日付選択UI | - | ❌ 未実装 | 🔍 **Research Needed**: 日付ピッカーライブラリ選定 |
| パフォーマンス評価ビジュアル | - | ❌ 未実装 | good/normal/needs_improvement の視覚表現 |

**実装内容**:
- デイリーレポートカードコンポーネント新規作成
- 日付選択コンポーネント（ライブラリ選定後）
- パフォーマンス評価バッジ・アイコン
- 「レポート未作成」エンプティステート

### Requirement 3: スコア分析実行と結果表示

| 要素 | 既存アセット | ギャップ | 制約 |
|------|------------|---------|------|
| POST /api/coaching/analysis | ✅ API実装済み | ❌ UI未実装 | - |
| ScoreAnalysis型 | ✅ `api/langgraph/types.ts:159-174` | - | chartData型あり |
| 分析実行ボタン | ✅ Button コンポーネント | ❌ 統合未実装 | - |
| チャート可視化 | - | ❌ 未実装 | 🔍 **Research Needed**: チャートライブラリ選定（Recharts、Chart.js、Tremor等） |
| ローディング・キャンセルボタン | 🟡 Skeleton あり | ❌ キャンセルロジック未実装 | TanStack Query の cancellation 活用 |
| ダイアログ表示 | ✅ Dialog コンポーネント | ❌ 統合未実装 | - |

**実装内容**:
- スコア分析フォーム・ボタンコンポーネント
- 分析結果ダイアログ・カードコンポーネント
- チャート可視化コンポーネント（ライブラリ選定後）
- プレイリスト生成への導線ボタン

### Requirement 4: プレイリスト生成フォームと結果表示

| 要素 | 既存アセット | ギャップ | 制約 |
|------|------------|---------|------|
| POST /api/coaching/playlist | ✅ API実装済み | ❌ UI未実装 | - |
| Playlist型 | ✅ `api/langgraph/types.ts:308-319` | - | scenarios配列型あり |
| フォーム入力（targetGame, weakAreas） | ✅ Textarea、Input | ❌ フォームロジック未実装 | TanStack Form 利用可能（`package.json:46`） |
| プレイリスト結果表示 | 🟡 Card基本構造あり | ❌ シナリオリスト表示未実装 | 順序付きリスト・アコーディオン検討 |

**実装内容**:
- プレイリスト生成フォームコンポーネント
- プレイリスト結果カード・ダイアログコンポーネント
- シナリオリスト表示コンポーネント

### Requirement 5: 振り返りレビュー表示

| 要素 | 既存アセット | ギャップ | 制約 |
|------|------------|---------|------|
| GET /api/coaching/progress/review | ✅ API実装済み | ❌ UI未実装 | - |
| ProgressReport型 | ✅ `api/langgraph/types.ts:192-208` | - | goalProgress配列型あり |
| 復帰ユーザー検出（returning_user） | ✅ userContext型定義済み | ❌ UI条件分岐未実装 | Requirement 7 のコンテキスト管理と連携 |
| レビュー表示カード | 🟡 Card基本構造あり | ❌ カスタムレイアウト未実装 | 目標進捗バー、リハビリプランリスト |

**実装内容**:
- 振り返りレビューカードコンポーネント
- 目標進捗表示コンポーネント（プログレスバー）
- リハビリプランリスト表示

### Requirement 6: 既存チャット機能との統合

| 要素 | 既存アセット | ギャップ | 制約 |
|------|------------|---------|------|
| AimAssistant | ✅ `src/components/AimAssistant.tsx` | ❌ ダッシュボード統合未実装 | - |
| チャット・ダッシュボード切り替えUI | - | ❌ 未実装 | タブ・サイドバー・モーダル等の選択必要 |
| コンテキスト共有（userId, threadId） | ✅ 既存実装で利用 | ❌ ダッシュボード間共有未実装 | React Context または状態管理ライブラリ |
| タスク実行結果通知 | - | ❌ 未実装 | 🔍 **Research Needed**: イベント通知機構（WebSocket、Polling、SSE活用） |

**実装内容**:
- ダッシュボード・チャット統合レイアウトコンポーネント
- タブ・ナビゲーション切り替え
- コンテキスト共有ロジック（React Context）

### Requirement 7: コーチングコンテキスト管理

| 要素 | 既存アセット | ギャップ | 制約 |
|------|------------|---------|------|
| GET /api/coaching/context | ✅ API実装済み | ❌ UI未実装 | - |
| CoachingContext型 | ✅ `api/langgraph/types.ts:406-436` | - | 型再利用可能 |
| React Context/状態管理 | 🟡 部分的（TanStack Query） | ❌ グローバルコンテキスト未実装 | React Context API または Zustand（`package.json:78`） |
| 条件分岐UI（new_user, returning_user等） | - | ❌ 未実装 | userContext別コンポーネント表示ロジック |

**実装内容**:
- CoachingContextProvider（React Context）
- コンテキスト取得・更新フック
- 条件分岐UIロジック（userContext別表示制御）

### Requirement 8: レスポンシブレイアウトとアクセシビリティ

| 要素 | 既存アセット | ギャップ | 制約 |
|------|------------|---------|------|
| Radix UI Themes | ✅ `package.json:42`, `__root.tsx:75` | - | Container、Grid、Flex 利用可能 |
| Breakpoints | ✅ Radix UI Themes提供 | ❌ ダッシュボードレイアウト未実装 | レスポンシブグリッド設計必要 |
| Tailwind CSS v4 | ✅ `package.json:74` | - | レスポンシブユーティリティ利用可能 |
| アクセシビリティ | ✅ Radix UI（ARIA、キーボード対応） | ❌ カスタムコンポーネント未検証 | カスタムコンポーネントのアクセシビリティテスト必要 |
| タッチ操作最適化 | - | ❌ 未実装 | ボタンサイズ・スペーシング調整 |

**実装内容**:
- レスポンシブグリッドレイアウト（Radix UI Themes Grid + Flex）
- スマートフォン・PC両対応スタイル
- アクセシビリティ検証（キーボードナビゲーション、スクリーンリーダー）

### Requirement 9: 型安全なAPI通信

| 要素 | 既存アセット | ギャップ | 制約 |
|------|------------|---------|------|
| Hono Client | ✅ `src/lib/client.ts` | - | `hc<APIType>` で型推論 |
| 型定義インポート | ✅ `api/langgraph/types.ts` | ❌ フロントエンドでのインポート未実装 | API境界越え型共有パターン必要 |
| Zodスキーマ | 🟡 部分的（バックエンドで利用） | ❌ フロントエンド検証未実装 | オプション実装（必要に応じて） |
| TypeScript strict mode | ✅ プロジェクト全体で有効 | - | - |
| エラー型ガード | - | ❌ 未実装 | エラーレスポンス型定義とガード関数 |

**実装内容**:
- 型定義共有パターン確立（API型エクスポート・インポート）
- エラー型ガード関数実装
- Zodスキーマ検証（オプション）

### Requirement 10: パフォーマンスとローディング状態管理

| 要素 | 既存アセット | ギャップ | 制約 |
|------|------------|---------|------|
| TanStack Query | ✅ `package.json:47`, `__root.tsx:76` | ❌ ダッシュボードでの利用未実装 | QueryClient設定済み |
| 並列API呼び出し | - | ❌ 未実装 | TanStack Query の並列クエリ活用 |
| Skeleton Loader | ✅ `src/components/ui/skeleton.tsx` | ❌ ダッシュボード統合未実装 | - |
| キャッシング | - | ❌ 未実装 | TanStack Query の staleTime、cacheTime 設定 |
| 自動リトライ | - | ❌ 未実装 | TanStack Query の retry 設定 |
| React.lazy | - | ❌ 未実装 | ダッシュボードコンポーネント遅延ロード |

**実装内容**:
- TanStack Query フック（useQuery、useMutation）
- 並列クエリ設定（useQueries）
- キャッシング・リトライ設定
- Skeleton Loader 統合
- React.lazy によるコード分割

---

## 3. 実装アプローチオプション

### Option A: 既存 `/` ルート拡張

**概要**: `src/routes/index.tsx` を拡張し、チャットとダッシュボードを同一ページに統合。

**統合方針**:
- 現在の `/` ルート（ChatPage）をダッシュボードレイアウトに変更
- AimAssistant をサイドバーまたはモーダルとして配置
- メインエリアにダッシュボードカード群を配置

**影響範囲**:
- `src/routes/index.tsx` - 大幅変更
- `src/components/page/ChatPage.tsx` - レイアウト変更
- `src/components/AimAssistant.tsx` - サイズ・配置調整

**メリット**:
- ✅ 単一ページで完結、ナビゲーション不要
- ✅ `/` ルートのユーザー体験向上
- ✅ 新規ルート追加不要

**デメリット**:
- ❌ 既存チャットUIの大幅変更リスク
- ❌ 単一ページの複雑度増加
- ❌ チャット専用画面がなくなる（一部ユーザーに不便）

**トレードオフ**:
- 複雑度 vs 統合感: 単一ページで統合感は高いが、実装複雑度が増す
- 既存機能への影響: 既存チャットの動作保証が難しい

### Option B: 新規 `/dashboard` ルート作成（推奨）

**概要**: 新規 `/dashboard` ルート（または `/` を拡張し `/chat` を新規作成）でダッシュボード専用ページを作成。

**統合方針**:
- `src/routes/dashboard/index.tsx` を新規作成
- ダッシュボードレイアウト・カードコンポーネント群を新規実装
- Header にダッシュボード・チャット切り替えナビゲーション追加
- AimAssistant は既存 `/` または新規 `/chat` ルートで独立表示

**影響範囲**:
- **新規作成**:
  - `src/routes/dashboard/index.tsx`
  - `src/components/dashboard/` - ダッシュボード専用コンポーネント群
  - `src/lib/hooks/useCoachingContext.tsx` - コンテキスト管理フック
- **軽微な変更**:
  - `src/components/layout/header.tsx` - ナビゲーションリンク追加
  - `src/routes/index.tsx` - `/` を `/chat` にリダイレクト（オプション）

**メリット**:
- ✅ 既存チャット機能への影響最小化
- ✅ 責任分離（チャット vs ダッシュボード）
- ✅ 段階的実装・デプロイ可能
- ✅ 将来の拡張性（モバイルアプリ、別UI等）

**デメリット**:
- ❌ ナビゲーション追加（ユーザー操作1ステップ増加）
- ❌ 新規ファイル・ディレクトリ増加

**トレードオフ**:
- ファイル数 vs 保守性: 新規ファイルは増えるが、コンポーネントの責任が明確で保守しやすい
- ナビゲーション vs 機能分離: ユーザーは切り替え操作が必要だが、各機能が独立して動作

### Option C: ハイブリッド（タブ・モーダル統合）

**概要**: `/` ルートでタブ切り替え（ダッシュボード・チャット）を実装、または一部機能をモーダルで表示。

**統合方針**:
- `src/routes/index.tsx` に Radix UI Tabs コンポーネント追加
- タブ1: ダッシュボード表示
- タブ2: AimAssistant チャット表示
- または、ダッシュボードをメイン表示し、チャットをモーダルで開閉

**影響範囲**:
- `src/routes/index.tsx` - タブレイアウト追加
- `src/components/page/ChatPage.tsx` - タブ内表示調整
- ダッシュボードコンポーネント新規作成

**メリット**:
- ✅ 単一ページで2機能切り替え可能
- ✅ ナビゲーション不要（タブで完結）
- ✅ 既存ルート構造維持

**デメリット**:
- ❌ 単一ページの複雑度増加（Option A より軽微）
- ❌ タブ切り替え時の状態管理複雑化
- ❌ モバイル表示でタブUIが煩雑

**トレードオフ**:
- UX vs 実装複雑度: タブUXは便利だが、状態管理が複雑化

---

## 4. 推奨アプローチ

**推奨**: **Option B（新規 `/dashboard` ルート作成）**

**理由**:
1. **責任分離**: チャット機能とダッシュボード機能を明確に分離し、保守性向上
2. **既存機能への影響最小化**: 既存AimAssistantチャットの動作を保証
3. **段階的実装**: ダッシュボード機能を段階的に追加・デプロイ可能
4. **将来の拡張性**: モバイルアプリ、管理画面など別UIでも同じAPI活用可能
5. **既存パターン踏襲**: 既存の `/account/settings`, `/knowledges` も独立ルート

**統合戦略**:
- **Phase 1**: `/dashboard` ルート新規作成、基本レイアウト・ナビゲーション実装
- **Phase 2**: Requirement 1-5 のカードコンポーネント実装（並行可能）
- **Phase 3**: Requirement 6 のチャット統合（モーダルまたはサイドパネル）
- **Phase 4**: Requirement 7-10 のコンテキスト管理・パフォーマンス最適化

---

## 5. 実装複雑度とリスク評価

### 複雑度: **M（Medium、3-7日）**

**根拠**:
- ✅ 既存パターン利用可能（TanStack Router、Radix UI Themes、Hono Client）
- ✅ APIエンドポイント完全実装済み、型定義完備
- 🟡 10個のAPIを統合（並列クエリ、エラーハンドリング）
- 🟡 チャート可視化ライブラリ選定・統合
- 🟡 レスポンシブレイアウト設計（PC・スマートフォン両対応）

**内訳**:
- 基本ダッシュボードレイアウト・ナビゲーション: **1日**
- Requirement 1-5 カードコンポーネント実装: **2-3日**（並行可能）
- Requirement 6 チャット統合: **1日**
- Requirement 7-10 コンテキスト管理・最適化: **1-2日**

### リスク: **Medium**

| リスク | 影響 | 確率 | 軽減策 |
|--------|------|------|--------|
| **チャート可視化ライブラリ選定遅延** | Medium | Medium | 事前リサーチ実施、Recharts/Tremor等の候補を設計フェーズで決定 |
| **レスポンシブレイアウト複雑化** | Medium | Low | Radix UI Themesのレスポンシブシステム活用、モバイルファースト設計 |
| **TanStack Query キャッシング設計誤り** | Low | Medium | 公式ドキュメント・ベストプラクティス参照、初期設定で保守的な値使用 |
| **チャット・ダッシュボード統合の状態管理** | Medium | Medium | React Context API でシンプルに開始、必要に応じてZustand導入 |
| **型共有パターン不明確** | Low | Low | Hono Client の型推論活用、`api/langgraph/types.ts` を直接インポート |

---

## 6. 設計フェーズへの推奨事項

### 優先リサーチ項目

1. **チャート可視化ライブラリ選定**
   - 候補: Recharts、Chart.js、Tremor、Victory
   - 評価軸: Radix UI Themes との親和性、TypeScript型サポート、バンドルサイズ、アクセシビリティ

2. **日付選択コンポーネント選定**
   - 候補: react-day-picker、@radix-ui/react-calendar（実験的）、カスタム実装
   - 評価軸: Radix UI Themes 統合、アクセシビリティ、国際化対応

3. **チャット・ダッシュボード統合パターン**
   - 候補: サイドパネル、モーダル、タブ、別ルート
   - 評価軸: UX、実装複雑度、状態管理、モバイル対応

### 設計フェーズで決定すべき事項

1. **ダッシュボードレイアウト構造**
   - グリッドレイアウト（2列、3列）
   - カード配置優先度（ステータス→レポート→分析→プレイリスト→レビュー）
   - スマートフォン表示時のカード順序

2. **コンテキスト管理戦略**
   - React Context API vs Zustand
   - グローバル状態（userContext、userId、threadId）の範囲
   - TanStack Query との連携方法

3. **エラーハンドリング統一パターン**
   - エラートースト vs インラインエラー表示
   - リトライボタン配置
   - エラーログ・トラッキング

4. **アクセシビリティ検証計画**
   - キーボードナビゲーションテスト
   - スクリーンリーダーテスト
   - WCAG AA 準拠チェックリスト

---

## 7. 次のステップ

### 設計フェーズへ移行

```bash
/kiro:spec-design coaching-dashboard-ui
```

または、要件承認後に自動実行:

```bash
/kiro:spec-design coaching-dashboard-ui -y
```

### 設計フェーズで作成するドキュメント

- **技術設計書**: コンポーネント構造、状態管理、API統合パターン
- **UIデザインガイド**: レスポンシブレイアウト、コンポーネント仕様
- **データフロー図**: API呼び出しフロー、状態管理フロー
- **アクセシビリティチェックリスト**: WCAG AA 準拠確認項目

---

**分析完了日**: 2025-11-12
**次フェーズ**: 設計（Design）
