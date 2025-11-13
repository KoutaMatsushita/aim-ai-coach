# LangGraph Coaching System

MastraからLangGraphへの移行による、強化されたマルチエージェント・コーチングシステム。

## 🎯 主な改善点

### Mastraからの移行で実現したこと

| 機能 | Mastra | LangGraph |
|------|--------|-----------|
| **フェーズ管理** | ❌ なし | ✅ 7つのフェーズで自動判定 |
| **マルチエージェント** | ❌ 単一エージェントのみ | ✅ 専門エージェント連携 |
| **State Persistence** | ⚠️ 限定的 | ✅ Checkpointer完全対応 |
| **条件分岐ロジック** | ⚠️ コード内ハードコード | ✅ Graph edgesで可視化 |
| **Human-in-the-loop** | ❌ なし | ✅ interruptBefore対応 |
| **並列処理** | ❌ 困難 | ✅ Subgraph composition |
| **可視化** | ❌ なし | ✅ Graph visualization |

## 📊 アーキテクチャ

```
┌─────────────────────────────────────────┐
│      Supervisor Graph (Main)            │
│   (Phase Detection & Routing)          │
└─────────────────────────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
    ┌─────────┐    ┌──────────┐
    │  Chat   │    │ Playlist │
    │ Agent   │    │ Builder  │
    └─────────┘    └──────────┘
        ▼               ▼
    ┌─────────┐    ┌──────────┐
    │ Score   │    │Progress  │
    │Analysis │    │ Review   │
    └─────────┘    └──────────┘
        ▼
    ┌─────────┐
    │ Daily   │
    │ Report  │
    └─────────┘
```

## 🔄 コーチングフェーズ

### 1. Initial Assessment (初回評価)
- **トリガー**: 新規ユーザー (スコアデータなし)
- **目的**: ユーザープロファイル構築
- **実装**: `chat_agent` で基本情報収集

### 2. Playlist Building (プレイリスト作成)
- **トリガー**: プレイリストが存在しない
- **目的**: 弱点分析とカスタムプレイリスト生成
- **実装**: `playlist_builder` エージェント
- **機能**:
  - 弱点分析
  - RAG検索でシナリオ探索
  - LLMによるプレイリスト構築
  - バランス検証

### 3. Active Training (通常練習サポート)
- **トリガー**: デフォルト状態
- **目的**: 日常的なコーチング会話
- **実装**: `chat_agent` with full tools

### 4. Score Analysis (スコア詳細分析)
- **トリガー**: 直近24時間で5+スコア & 非アクティブ<1日
- **目的**: 最新パフォーマンスの深掘り分析
- **実装**: `score_analysis` エージェント
- **機能**:
  - 統計分析
  - トレンド検出
  - パターン認識
  - インサイト生成

### 5. Progress Review (経過観察)
- **トリガー**: 7日以上非アクティブ
- **目的**: 長期的な進捗レビュー
- **実装**: `progress_review` エージェント
- **機能**:
  - 期間データ収集
  - 目標達成度評価
  - プレイリスト遵守率
  - 調整提案生成

### 6. Daily Report (デイリーレポート)
- **トリガー**: 手動 or Cron
- **目的**: 日次サマリーとモチベーション維持
- **実装**: `daily_report` エージェント
- **機能**:
  - 当日活動サマリー
  - 達成事項ハイライト
  - 翌日の提案

### 7. Adjustment Planning (計画調整)
- **トリガー**: 手動 or 必要時
- **目的**: トレーニング計画の再調整
- **実装**: `chat_agent` with adjustment context

## 🔀 フェーズ遷移の詳細ロジック

### 判定の優先順位

フェーズは以下の優先順位で上から順にチェックされます（`detectPhaseNode` 実装: `api/langgraph/graphs/supervisor.ts:66-144`）

```
START: detect_phase ノード実行
  │
  ├─ ① 新規ユーザー判定
  │   └─ Kovaaksスコア = 0件 AND Aimlabタスク = 0件
  │       → 🆕 initial_assessment
  │
  ├─ ② プレイリスト判定
  │   └─ hasPlaylist = false
  │       → 📝 playlist_building
  │
  ├─ ③ アクティブ分析判定
  │   └─ 24時間以内のスコア > 5件 AND 非アクティブ日数 < 1日
  │       → 📊 score_analysis
  │
  ├─ ④ 長期不在判定
  │   └─ 非アクティブ日数 >= 7日
  │       → 📈 progress_review
  │
  └─ ⑤ デフォルト
      → 💬 active_training
```

### 各フェーズの詳細条件

#### 1️⃣ initial_assessment (初回評価)

**条件:**
```typescript
totalScores.length === 0 && totalTasks.length === 0
```

**状態:**
- ✅ Kovaaksスコアが1件もない
- ✅ Aimlabタスクが1件もない

**実行エージェント:** `chat_agent`

**目的:** 新規ユーザーのプロファイル構築、基本情報収集

---

#### 2️⃣ playlist_building (プレイリスト作成)

**条件:**
```typescript
!hasPlaylist
```

**状態:**
- ❌ 初回ユーザーではない（データあり）
- ✅ プレイリストが存在しない

**実行エージェント:** `playlist_builder`

**処理内容:**
- 弱点分析
- RAG検索でシナリオ探索
- LLMによるプレイリスト構築
- バランス検証

---

#### 3️⃣ score_analysis (スコア詳細分析)

**条件:**
```typescript
newScoresCount24h.length > 5 && calculatedDaysInactive < 1
```

**状態:**
- ✅ プレイリスト作成済み
- ✅ 直近24時間で**6件以上**のスコア登録
- ✅ 最終活動から**1日未満**

**実行エージェント:** `score_analysis`

**処理内容:**
- 統計分析（平均、中央値、一貫性）
- トレンド検出（改善/安定/低下）
- パターン認識（オーバーシュート傾向など）
- インサイト生成

---

#### 4️⃣ progress_review (経過観察)

**条件:**
```typescript
calculatedDaysInactive >= 7
```

**状態:**
- ✅ プレイリスト作成済み
- ✅ スコア分析の条件に当てはまらない
- ✅ 最終活動から**7日以上**経過

**実行エージェント:** `progress_review`

**処理内容:**
- 期間データ収集
- 目標達成度評価
- プレイリスト遵守率計算
- 調整提案生成

---

#### 5️⃣ active_training (通常練習サポート)

**条件:**
```typescript
// 上記どれにも当てはまらない場合（デフォルト）
```

**状態:**
- ✅ プレイリスト作成済み
- ✅ 非アクティブ < 7日
- ✅ 直近24時間のスコア <= 5件 OR 非アクティブ >= 1日

**実行エージェント:** `chat_agent` with full tools

**目的:** 日常的なコーチング会話、質問応答

---

#### 6️⃣ daily_report (デイリーレポート)

**条件:**
```typescript
// 手動トリガー or Cron
```

**状態:**
- 🔧 自動では遷移しない（手動 or スケジューラー）

**実行エージェント:** `daily_report`

**処理内容:**
- 当日活動サマリー
- 達成事項ハイライト
- 翌日の提案

---

#### 7️⃣ adjustment_planning (計画調整)

**条件:**
```typescript
// 手動トリガー or 必要時
```

**状態:**
- 🔧 自動では遷移しない（手動）

**実行エージェント:** `chat_agent` with adjustment context

**目的:** トレーニング計画の再調整

---

### 計算ロジック

#### 非アクティブ日数の計算
```typescript
const lastActivity = lastScoreDate || lastTaskDate;
const calculatedDaysInactive = lastActivity
    ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    : 999; // データなし = 999日
```

#### 24時間以内のスコアカウント
```typescript
const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
const newScoresCount24h = await db.query.kovaaksScoresTable.findMany({
    where: (t, { and, eq, gte }) =>
        and(eq(t.userId, userId), gte(t.runEpochSec, oneDayAgo)),
});
```

### 実際のユースケース例

| ケース | スコア数 | プレイリスト | 非アクティブ日数 | → フェーズ |
|--------|---------|------------|----------------|-----------|
| 新規登録直後 | 0件 | なし | - | 🆕 initial_assessment |
| 2日目、初スコア登録 | 3件 | なし | 1日 | 📝 playlist_building |
| 練習熱心な1週間目 | 8件（24h以内） | あり | 0日 | 📊 score_analysis |
| 通常の練習日 | 3件（24h以内） | あり | 2日 | 💬 active_training |
| 1週間練習サボった | - | あり | 8日 | 📈 progress_review |

### フェーズルーティング

`phaseRouter` 関数（`api/langgraph/graphs/supervisor.ts:285-299`）が検出されたフェーズに基づいて次のノードを決定します：

```typescript
const routeMap: Record<CoachingPhase, string> = {
    initial_assessment: "chat_agent",
    playlist_building: "playlist_builder",
    active_training: "chat_agent",
    score_analysis: "score_analysis",
    progress_review: "progress_review",
    daily_report: "daily_report",
    adjustment_planning: "chat_agent",
};
```

## 🛠️ ツールシステム

### User Tools (`api/langgraph/tools/user-tools.ts`)
- `find_user`: ユーザー情報取得
- `find_kovaaks_scores`: Kovaaksスコア検索
- `find_aimlab_tasks`: Aimlabタスク検索
- `calculate_user_stats`: 統計情報計算

### RAG Tools (`api/langgraph/tools/rag-tools.ts`)
- `vector_search`: セマンティック検索
- `add_youtube_content`: YouTube動画追加
- `add_text_knowledge`: テキスト知識追加
- `get_personalized_recommendations`: パーソナライズド推薦

## 🌐 API エンドポイント

### Chat Endpoints

#### POST `/api/chat-langgraph`
LangGraphベースの会話型コーチング

**Request:**
```json
{
  "id": "session_id",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "最近のスコアを分析してください"
    }
  ]
}
```

**Response:** SSE Stream
```
data: {"type":"phase","phase":"score_analysis"}
data: {"type":"message","role":"assistant","content":"スコアを分析しています..."}
data: {"type":"agent_output","output":{...}}
```

#### GET `/api/chat-langgraph/phase`
現在のコーチングフェーズを取得

**Response:**
```json
{
  "userId": "user123",
  "currentPhase": "active_training",
  "daysInactive": 2,
  "newScoresCount": 3,
  "hasPlaylist": true,
  "isNewUser": false
}
```

### Coaching Endpoints

#### POST `/api/coaching/playlist/generate`
プレイリスト生成を明示的にトリガー

**Request:**
```json
{
  "targetGame": "VALORANT",
  "weakAreas": ["tracking", "flick"]
}
```

**Response:**
```json
{
  "success": true,
  "playlist": {
    "id": "playlist_123",
    "title": "カスタム練習プレイリスト",
    "scenarios": [...],
    "reasoning": "..."
  }
}
```

#### GET `/api/coaching/progress/review?days=7`
進捗レビューレポート取得

**Response:**
```json
{
  "success": true,
  "report": {
    "reviewPeriod": {...},
    "goalProgress": [...],
    "adherence": {...},
    "adjustmentSuggestions": [...]
  }
}
```

#### POST `/api/coaching/analysis/scores`
スコア詳細分析トリガー

**Response:**
```json
{
  "success": true,
  "analysis": {
    "statistics": {...},
    "trends": [...],
    "patterns": [...],
    "insights": "..."
  }
}
```

#### GET `/api/coaching/daily-report?date=2025-01-15`
デイリーレポート取得

**Response:**
```json
{
  "success": true,
  "report": {
    "date": "2025-01-15",
    "activities": [...],
    "achievements": [...],
    "tomorrowSuggestions": [...]
  }
}
```

#### GET `/api/coaching/context`
現在のコーチングコンテキスト取得

**Response:**
```json
{
  "success": true,
  "context": {
    "userId": "user123",
    "currentPhase": "active_training",
    "daysInactive": 0,
    "newScoresCount": 5,
    "hasPlaylist": true,
    "isNewUser": false
  }
}
```

## 💾 State Management

### State Channels
```typescript
{
  userId: string;
  threadId: string;
  messages: Array<Message>;
  currentPhase: CoachingPhase;
  daysInactive: number;
  newScoresCount: number;
  hasPlaylist: boolean;
  isNewUser: boolean;
  agentOutput: any;
}
```

### Checkpointer
- **Development**: `MemorySaver` (in-memory)
- **Production**: SQLite/PostgreSQL checkpointer推奨

## 🚀 使用例

### 基本的な会話
```typescript
import { createCoachingGraph } from "./api/langgraph";

const coachingGraph = createCoachingGraph(vectorStore);

const result = await coachingGraph.invoke(
  "user123",
  [{ role: "user", content: "エイムを改善したい" }],
  { threadId: "user123" }
);
```

### プレイリスト生成
```bash
curl -X POST http://localhost:8787/api/coaching/playlist/generate \
  -H "Content-Type: application/json" \
  -d '{"targetGame": "VALORANT", "weakAreas": ["tracking"]}'
```

### 進捗レビュー
```bash
curl http://localhost:8787/api/coaching/progress/review?days=14
```

## 🔧 開発

### ローカルセットアップ
```bash
# 依存関係インストール
bun install

# 型チェック
bunx tsc --noEmit

# コード品質チェック
bun run check

# 開発サーバー起動
bun run dev:api
```

### テスト
```bash
# APIテスト
bun test api/langgraph
```

## 📝 今後の実装予定

### Phase 2: 専門エージェント実装
- [ ] Playlist Builder の完全実装
- [ ] Score Analysis の統計エンジン
- [ ] Progress Review のレポート生成
- [ ] Daily Report の自動生成

### Phase 3: メモリシステム
- [ ] Persistent Checkpointer (PostgreSQL)
- [ ] Conversation history management
- [ ] Cross-session learning

### Phase 4: スケジューリング
- [ ] Cloudflare Cron integration
- [ ] Daily report automation
- [ ] Weekly review automation

### Phase 5: Advanced Features
- [ ] Multi-modal input (画像分析)
- [ ] Voice coaching support
- [ ] Community features integration

## 🔄 Mastraとの互換性

### Legacy Endpoints (維持)
- `/api/chat` - Mastraベースのチャット
- `/api/threads` - Mastraスレッド管理
- `/api/knowledges` - Mastra知識ベース

### New Endpoints (LangGraph)
- `/api/chat-langgraph` - LangGraphチャット
- `/api/coaching/*` - 専門コーチング機能

両方のシステムが並行稼働し、段階的な移行が可能です。

## 📚 参考資料

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangChain Tools](https://js.langchain.com/docs/modules/tools/)
- [StateGraph API](https://langchain-ai.github.io/langgraph/reference/graphs/)
- [Checkpointer Guide](https://langchain-ai.github.io/langgraph/concepts/persistence/)
