# Implementation Gap Analysis: aim-coach-ai-agent

## Executive Summary

**スコープ**: 既存の Supervisor Graph ベースのコーチングシステムを、Chat Graph と Task Graph の2層アーキテクチャに再構築し、ダッシュボード向け API とLLM選択機能を追加する。

**主な課題**:
- 既存の Supervisor Graph は単一グラフで全フェーズを自動検出する設計であり、要件の2層構造（Chat/Task分離）との構造的不一致がある
- Task Graph、ダッシュボード向けステータス API、LLM選択ロジックは未実装
- データベーススキーマにプレイリスト、デイリーレポート、スコア分析結果の永続化テーブルが存在しない

**推奨アプローチ**: **Option C: Hybrid Approach** - 既存の Supervisor Graph を Task Graph として活用し、新規に軽量な Chat Graph を追加。段階的にリファクタリングを進める。

---

## 1. Current State Investigation

### 1.1 既存アセット

#### LangGraph 基盤 (`api/langgraph/`)

**`api/langgraph/graphs/supervisor.ts`**:
- Supervisor Graph: フェーズ検出 (`detectPhaseNode`) → エージェントルーティング (`phaseRouter`)
- 実装済みエージェント:
  - `chatAgentNode`: Gemini 2.0 Flash Exp で会話型コーチング
  - `playlistBuilderNode`: モックプレイリスト生成
  - `scoreAnalysisNode`: モックスコア分析
  - `progressReviewNode`: モック進捗レビュー
  - `dailyReportNode`: モックデイリーレポート
- 状態管理: `SupervisorStateAnnotation` (userId, threadId, messages, currentPhase, daysInactive, newScoresCount, hasPlaylist, isNewUser, agentOutput)

**`api/langgraph/index.ts`**:
- `createCoachingGraph`: グラフファクトリー関数
- MemorySaver チェックポインター（開発環境用）
- `invoke`, `stream`, `getMessages` メソッド提供

**`api/langgraph/types.ts`**:
- 包括的な型定義: `CoachingPhase`, `Playlist`, `DailyReport`, `AnalysisResult`, `ProgressReport` など
- 要件定義の型（`UserContext`, `TaskType`, `ChatGraphState`, `TaskGraphState`, `CoachingStatus`）は **未定義**

**`api/langgraph/tools/`**:
- `user-tools.ts`: find_user, find_kovaaks_scores, find_aimlab_tasks, calculate_user_stats
- `rag-tools.ts`: vector_search, add_youtube_content, add_text_knowledge, get_personalized_recommendations

#### API エンドポイント (`api/routes/`)

**`api/routes/coaching.ts`**:
- `/coaching/playlist/generate` (POST): プレイリスト生成
- `/coaching/progress/review` (GET): 進捗レビュー
- `/coaching/analysis/scores` (POST): スコア分析
- `/coaching/daily-report` (GET): デイリーレポート
- `/coaching/context` (GET): 現在のコーチングコンテキスト取得

**エンドポイント設計**:
- 既存エンドポイントは Supervisor Graph を `force_phase` パラメータで明示的にフェーズ指定して呼び出す設計
- 要件の `/api/coaching/status`, `/api/coaching/report`, `/api/coaching/analysis`, `/api/coaching/playlist`, `/api/coaching/review` との **部分的な不一致**

#### データベース (`api/db/schema.ts`)

**既存テーブル**:
- `users`, `sessions`, `accounts`, `verifications`: Better Auth認証系
- `kovaaksScoresTable`: Kovaaks スコアデータ（要件に必要）
- `aimlabTaskTable`: Aimlabs タスクデータ（要件に必要）

**未実装テーブル**:
- プレイリスト永続化テーブル
- デイリーレポート永続化テーブル
- スコア分析結果永続化テーブル
- 進捗レビュー永続化テーブル

### 1.2 アーキテクチャパターン

- **LangGraph Supervisor Pattern**: 単一グラフでフェーズ検出とエージェントルーティング
- **Hono API**: 軽量APIフレームワーク、ミドルウェアで認証・DB・LangGraph 注入
- **Drizzle ORM**: 型安全なDB操作
- **MemorySaver**: 会話状態の永続化（開発環境、本番では別ストレージ推奨）

### 1.3 命名規則とインポート戦略

- **ファイル名**: camelCase (`supervisor.ts`, `rag-tools.ts`)
- **関数名**: camelCase (`createCoachingGraph`, `detectPhaseNode`)
- **型名**: PascalCase (`CoachingPhase`, `GraphState`)
- **インポート**: 相対パス（`api/` 内部）

---

## 2. Requirements Feasibility Analysis

### 2.1 技術要件マッピング

| 要件 | 技術要素 | 既存アセット | ギャップ |
|------|----------|--------------|----------|
| **Req 1: コンテキスト検出** | フェーズ検出ロジック、ユーザー活動データ取得 | `detectPhaseNode` (CoachingPhase 判定) | ✅ 既存ロジック活用可能。`UserContext` 型定義が必要 |
| **Req 2: Chat Graph** | 軽量会話エージェント、インテント検出、タスクルーティング | `chatAgentNode` (一部) | ❌ 新規グラフ作成、インテント検出ロジック未実装 |
| **Req 3: Task Graph** | タスク種別ルーティング、エージェント実行 | Supervisor Graph (構造的類似) | ⚠️ Supervisor を Task Graph に転用可能だが、リファクタリング必要 |
| **Req 4: ツール統合** | LangChain Tools | `user-tools.ts`, `rag-tools.ts` | ✅ 既存ツール活用可能 |
| **Req 5-8: 専門エージェント** | Playlist Builder, Score Analysis, Progress Review, Daily Report | モック実装済み | ⚠️ 実装を完全化、DB永続化追加 |
| **Req 9: ダッシュボード API** | `/api/coaching/status` | `/coaching/context` (部分的) | ❌ 新規エンドポイント、集約ロジック未実装 |
| **Req 10: タスク実行 API** | `/api/coaching/{report,analysis,playlist,review}` | `/coaching/daily-report`, `/coaching/analysis/scores` 等 | ⚠️ エンドポイント再編成、Task Graph 統合 |
| **Req 11: 会話履歴** | MemorySaver, thread管理 | `createCoachingGraph` | ✅ 既存実装活用可能 |
| **Req 12: ストリーミング** | `stream` メソッド | `createCoachingGraph` | ✅ 既存実装活用可能 |
| **Req 13: エラーハンドリング** | try-catch, ログ出力 | 部分的実装 | ⚠️ 統一エラーハンドリング強化 |
| **Req 14: 型定義** | TypeScript 型 | `types.ts` (一部) | ⚠️ 要件定義の新型（UserContext, TaskType, ChatGraphState, TaskGraphState, CoachingStatus）追加 |
| **LLM選択機能** | タスク複雑度による gemini-2.0-flash-exp / gemini-2.0-pro 選択 | ハードコード (gemini-2.0-flash-exp) | ❌ 選択ロジック未実装 |

### 2.2 未実装機能と制約

#### Missing Capabilities:
1. **Chat Graph**: 会話専用の軽量グラフ（インテント検出、タスクルーティング）
2. **Task Graph**: 明示的なタスク実行グラフ（既存 Supervisor を転用可能）
3. **LLM選択ロジック**: タスク複雑度判定と適切なモデル選択
4. **ダッシュボード API**: `/api/coaching/status` エンドポイントと集約ロジック
5. **DBスキーマ**: プレイリスト、デイリーレポート、スコア分析結果の永続化テーブル
6. **エージェント実装完全化**: モックからデータ駆動の完全実装へ

#### Constraints:
- **既存 Supervisor Graph の構造**: フェーズ自動検出が前提。要件の明示的タスク実行との設計乖離
- **MemorySaver 制約**: 開発環境用。本番環境では PostgreSQL/Redis チェックポインターへ移行必要
- **DB制約**: SQLite (Turso) ベース。複雑なトランザクションや大規模集計には注意

#### Research Needed:
1. **インテント検出手法**: LLM による分類 vs ルールベース vs Function Calling の評価
2. **LLM選択基準**: タスク複雑度の定量化手法（トークン数、ツール呼び出し数、etc.）
3. **本番チェックポインター**: Turso 対応の永続化チェックポインター実装パターン

---

## 3. Implementation Approach Options

### Option A: Extend Existing Supervisor Graph

**戦略**: Supervisor Graph を拡張し、Chat/Task モードを切り替えるフラグを追加。

**具体的な変更**:
- `SupervisorStateAnnotation` に `mode: "chat" | "task"` フィールド追加
- `detectPhaseNode` を条件分岐: mode=chat なら軽量検出、mode=task なら明示的フェーズ使用
- `chatAgentNode` にインテント検出ロジック追加
- ダッシュボード API は既存 `/coaching/context` を拡張

**Trade-offs**:
- ✅ 既存コードの再利用最大化
- ✅ 開発速度が速い（1週間程度）
- ❌ 単一グラフの複雑化（700+ 行 → 1000+ 行）
- ❌ 責任が不明瞭（Chat と Task の境界が曖昧）
- ❌ 将来的なリファクタリングコスト増大

**Effort**: M (5-7日) | **Risk**: Medium（複雑化リスク、保守性悪化）

### Option B: Create Separate Chat and Task Graphs

**戦略**: 要件通り、完全に独立した Chat Graph と Task Graph を新規作成。

**具体的な変更**:
- `api/langgraph/graphs/chat.ts`: 軽量 Chat Graph（インテント検出、会話専用）
- `api/langgraph/graphs/task.ts`: Task Graph（既存 Supervisor の簡略版）
- `api/langgraph/index.ts`: `createChatGraph`, `createTaskGraph` の2つのファクトリー関数
- API エンドポイント再編成: `/api/chat` (Chat Graph), `/api/coaching/*` (Task Graph)

**Trade-offs**:
- ✅ 責任分離が明確（SRP準拠）
- ✅ テスト容易性向上
- ✅ 将来的な保守性が高い
- ❌ 開発時間が長い（2週間程度）
- ❌ 既存 Supervisor Graph との重複コード発生
- ❌ API エンドポイント大幅変更

**Effort**: L (10-14日) | **Risk**: Low（設計明確、長期保守性高い）

### Option C: Hybrid Approach（推奨）

**戦略**: 既存 Supervisor Graph を **Task Graph** として活用し、新規に軽量な **Chat Graph** を追加。段階的リファクタリング。

**Phase 1: Minimal Viable Changes (1週間)**
- `api/langgraph/graphs/chat.ts` を新規作成（軽量会話エージェント）
- Supervisor Graph を `api/langgraph/graphs/task.ts` にリネーム
- `detectPhaseNode` を `getContextNode` にリファクタリング（コンテキスト取得のみ）
- Task Graph のエントリーポイントを明示的タスク種別受け取りに変更
- `/api/chat` エンドポイント追加（Chat Graph 用）
- `/api/coaching/status` エンドポイント追加（ダッシュボード用）

**Phase 2: Database Schema & Agent Completion (1週間)**
- `api/db/schema.ts` にプレイリスト、デイリーレポート、分析結果テーブル追加
- モックエージェントをデータ駆動の完全実装に更新
- LLM選択ロジック実装（タスク複雑度判定）

**Phase 3: Refinement (オプション、+3-5日)**
- エラーハンドリング統一
- ロギング強化
- テストカバレッジ向上

**Trade-offs**:
- ✅ 既存資産を最大活用
- ✅ 段階的移行でリスク分散
- ✅ 要件との整合性確保
- ✅ 各フェーズで動作確認可能
- ⚠️ 中間状態で一時的な命名不整合（リファクタリングで解消）
- ⚠️ Phase 2 完了まではデータ永続化が不完全

**Effort**: M-L (10-12日、Phase 1+2) | **Risk**: Medium-Low（段階的アプローチでリスク管理）

---

## 4. Implementation Complexity & Risk Assessment

### Effort Estimation

| コンポーネント | Effort | 根拠 |
|---------------|--------|------|
| Chat Graph 新規作成 | S (2-3日) | 軽量グラフ、インテント検出ロジックはLLM Function Calling活用 |
| Task Graph リファクタリング | M (3-4日) | Supervisor を転用、エントリーポイント変更、型定義追加 |
| DB スキーマ拡張 | S (1-2日) | Drizzle ORM で4テーブル追加、マイグレーション |
| エージェント完全化 | M (4-5日) | 4エージェント × 1日、データ駆動ロジック実装 |
| LLM選択ロジック | S (1-2日) | 複雑度判定関数、モデル切り替え |
| ダッシュボード API | S (1-2日) | データ集約ロジック、エンドポイント追加 |
| エラーハンドリング統一 | S (2日) | 統一エラーレスポンス、ログ強化 |
| テスト・ドキュメント | M (3-4日) | 統合テスト、API ドキュメント |

**Total Effort (Option C)**: **M-L (17-24日 = 2.5-3.5週間)**

### Risk Assessment

| リスク要因 | Level | 軽減策 |
|-----------|-------|--------|
| 既存グラフの構造的不一致 | Medium | Hybrid Approach で段階的移行、Phase 1 で早期検証 |
| インテント検出精度 | Medium | Function Calling 活用、ルールベースフォールバック |
| LLM選択基準の妥当性 | Medium | 初期は保守的基準、運用データで調整 |
| DB永続化の欠如（Phase 1） | Low | Phase 2 で優先対応、メモリ状態で一時対応 |
| MemorySaver 本番制約 | High | 設計段階で永続化チェックポインター移行計画策定 |
| エンドポイント変更影響 | Low | フロントエンドは未実装のため影響小 |

**Overall Risk**: **Medium** - 段階的アプローチとフォールバック戦略で管理可能

---

## 5. Requirements-to-Asset Gap Summary

### 既存で対応可能（拡張のみ）

- **Req 1: コンテキスト検出** → `detectPhaseNode` 活用
- **Req 4: ツール統合** → 既存 tools 活用
- **Req 5-8: エージェント** → モック完全化
- **Req 11: 会話履歴** → MemorySaver 活用
- **Req 12: ストリーミング** → 既存 `stream` 活用

### 新規実装必要

- **Req 2: Chat Graph** → 新規グラフ作成
- **Req 3: Task Graph** → Supervisor リファクタリング
- **Req 9: ダッシュボード API** → 新規エンドポイント
- **Req 10: タスク実行 API** → エンドポイント再編成
- **Req 14: 型定義** → 新型追加
- **LLM選択ロジック** → 新規機能

### 技術課題要調査

- ✅ **インテント検出**: Function Calling で実装可能（調査済み想定）
- ⚠️ **LLM選択基準**: タスク複雑度の定量化手法（設計フェーズで詳細化）
- ⚠️ **本番チェックポインター**: Turso 対応永続化（長期課題、設計フェーズで計画）

---

## 6. Recommendations for Design Phase

### 推奨アプローチ

**Option C: Hybrid Approach** を採用し、2フェーズで段階的実装を推奨します。

**理由**:
1. 既存 Supervisor Graph の資産を活用しつつ、要件の2層構造を実現
2. Phase 1 で早期に動作確認可能（リスク低減）
3. 中長期的な保守性とスケーラビリティを確保

### 設計フェーズで決定すべき事項

1. **インテント検出方式の詳細設計**
   - Function Calling ベースの分類器設計
   - フォールバック戦略（ルールベース補完）
   - インテント検出の信頼度閾値

2. **LLM選択ロジックの具体化**
   - タスク複雑度判定基準の定義
     - 候補: ツール呼び出し数、データ量、推論ステップ数
   - gemini-2.0-flash-exp と gemini-2.0-pro の使い分けガイドライン
   - パフォーマンス・コストのトレードオフ評価

3. **DBスキーマ詳細設計**
   - プレイリスト、レポート、分析結果テーブルの正規化レベル
   - インデックス戦略（ユーザーID、日付など）
   - データ保持期間とアーカイブ戦略

4. **本番チェックポインター移行計画**
   - Turso 対応の永続化チェックポインター実装検討
   - 代替案: PostgreSQL/Redis へのチェックポインター移行計画

5. **エラーハンドリング標準化**
   - エラーコード体系
   - ユーザー向けエラーメッセージ設計
   - ログレベルと出力形式

6. **段階的ロールアウト計画**
   - Phase 1 の受け入れ基準
   - Phase 2 への移行判断基準
   - 本番展開のリスク軽減策

### 次のステップ

1. 要件定義の最終確認と承認
2. `/kiro:spec-design aim-coach-ai-agent` で技術設計ドキュメント生成
3. 設計フェーズで上記6項目を詳細化
4. タスク分解とスプリント計画策定

---

## Appendix: Architecture Comparison

### 現在のアーキテクチャ（Supervisor Graph）

```
User Request
    ↓
Supervisor Graph
    ↓
detectPhaseNode (自動フェーズ判定)
    ↓
phaseRouter (条件分岐)
    ↓
├─ chatAgentNode (会話)
├─ playlistBuilderNode (プレイリスト)
├─ scoreAnalysisNode (分析)
├─ progressReviewNode (レビュー)
└─ dailyReportNode (レポート)
```

### 要件のアーキテクチャ（2層構造）

```
User Request
    ↓
    ├─ /api/chat → Chat Graph → 会話 + インテント検出 → (必要時) Task Graph 呼び出し
    │                                                          ↓
    └─ /api/coaching/* → Task Graph → Context取得 → タスクルーター
                                                         ↓
                                    ├─ Playlist Builder
                                    ├─ Score Analysis
                                    ├─ Progress Review
                                    └─ Daily Report
```

### Hybrid Approach（推奨）

```
User Request
    ↓
    ├─ /api/chat → Chat Graph (新規)
    │               ├─ 軽量会話
    │               └─ インテント検出 → (必要時) Task Graph 呼び出し
    │
    └─ /api/coaching/* → Task Graph (Supervisor リファクタリング)
                          ├─ Context取得 (detectPhaseNode → getContextNode)
                          ├─ タスクルーター (phaseRouter → taskRouter)
                          └─ 専門エージェント (既存活用)
```

**段階的移行**: Phase 1 で Chat Graph 追加、Phase 2 でエージェント完全化・DB永続化
