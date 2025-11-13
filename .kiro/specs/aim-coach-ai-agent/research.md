# Research & Design Decisions

---
**Purpose**: エイムコーチ AI エージェントシステムの設計決定と調査結果を記録する。

**Usage**:
- Discovery フェーズで実施した技術調査と判断根拠を文書化
- 設計ドキュメント (design.md) で参照される詳細な比較・検討内容を保管
---

## Summary
- **Feature**: `aim-coach-ai-agent`
- **Discovery Scope**: Complex Integration (既存 Supervisor Pattern → 2層アーキテクチャへの拡張)
- **Key Findings**:
  - Gemini 2.5 Flash/Pro は LangChain でサポート済み（`gemini-2.5-flash`、`gemini-2.5-pro` として利用可能）
  - LangGraph の Multi-Agent Supervisor Pattern と階層型アーキテクチャパターンが要件に適合
  - 既存の Supervisor Graph を Task Graph へ再構成し、新規の Chat Graph を追加する Hybrid Approach が最適

## Research Log

### Gemini 2.5 モデルの LangChain 互換性
- **Context**: 要件で gemini-2.5-flash と gemini-2.5-pro の使い分けが必要。既存実装は gemini-2.0-flash-exp を使用。
- **Sources Consulted**:
  - [Gemini Models | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/models)
  - [langchain-google-genai · PyPI](https://pypi.org/project/langchain-google-genai/)
  - [Gemini 2.5 Flash and Pro, Live API - Google Developers Blog](https://developers.googleblog.com/en/gemini-2-5-flash-pro-live-api-veo-2-gemini-api/)
- **Findings**:
  - `langchain-google-genai` パッケージは Gemini 2.5 Flash/Pro をサポート
  - モデル識別子: `gemini-2.5-flash`、`gemini-2.5-pro`
  - ChatGoogleGenerativeAI クラスで直接指定可能
  - Python 実装では安定動作（JavaScript 実装には MCP 連携時の既知の問題あり）
- **Implications**:
  - 既存の `ChatGoogleGenerativeAI` 使用コードをそのまま流用可能
  - モデル選択ロジックを `createModel` ユーティリティ関数として実装
  - 複雑度判定基準（ツール呼び出し数、データ量）に基づいた動的モデル選択が可能

### LangGraph 2層アーキテクチャパターン
- **Context**: Chat Graph（会話型）と Task Graph（タスク実行型）の分離アーキテクチャが要件として明確化
- **Sources Consulted**:
  - [LangGraph: Multi-Agent Workflows - LangChain Blog](https://blog.langchain.com/langgraph-multi-agent-workflows/)
  - [Multi-agent network - LangGraph Tutorials](https://langchain-ai.github.io/langgraph/tutorials/multi_agent/multi-agent-collaboration/)
  - [LangGraph Supervisor Pattern - GitHub](https://github.com/langchain-ai/langgraph-supervisor-py)
- **Findings**:
  - **Supervisor Pattern**: 単一のオーケストレーターが専門エージェントにタスクを委譲
  - **Hierarchical Multi-Agent Systems**: 複数の Supervisor を階層化し、サブグラフとして組織化
  - **Multi-Agent Network**: Divide-and-Conquer アプローチでタスクを専門家にルーティング
  - **Key Principle**: ワークフロー（グラフ）と実行（ツール）の明確な分離
- **Implications**:
  - Chat Graph: 軽量な会話エージェント、インテント検出、ユーザーコンテキスト管理
  - Task Graph: 複雑なタスク（分析、レポート生成）を専門エージェントに委譲
  - 既存の Supervisor Graph は Task Graph の基盤として再利用可能
  - 各グラフは独立したエントリポイント（API エンドポイント）から呼び出される

### 既存実装の統合ポイント分析
- **Context**: `api/langgraph/graphs/supervisor.ts` の既存実装を 2層アーキテクチャに適合させる
- **Findings**:
  - **既存アセット**:
    - `SupervisorStateAnnotation`: フェーズ検出、コンテキスト管理の状態定義
    - `detectPhaseNode`: ユーザー活動状況に基づくフェーズ判定ロジック
    - 専門エージェントノード: `playlistBuilderNode`, `scoreAnalysisNode`, `progressReviewNode`, `dailyReportNode`
    - ツール統合: `userTools`, `createRagTools`
  - **移行パス**:
    - Task Graph: 既存の Supervisor Graph から `chatAgentNode` を除外し、タスク専用グラフとして再構成
    - Chat Graph: 新規作成、軽量な会話エージェント、インテント検出機能を実装
    - 共通ユーティリティ: `detectPhaseNode` をコンテキスト検出ユーティリティとして抽出
- **Implications**:
  - Phase 1: 基本構造の実装（Chat Graph + Task Graph のスケルトン）
  - Phase 2: エージェント完成（既存ノードの移行と新規ノード実装）
  - Phase 3: API 統合とストリーミング対応

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: Chat Graph Only | Supervisor Graph を拡張して Chat Graph のみで実装 | シンプル、既存実装を最大限活用 | 会話とタスク実行の責任が混在、スケーラビリティに課題 | 要件の「2つの主要なインタラクションモード」に不適合 |
| B: Complete Rebuild | 既存実装を破棄し、2層アーキテクチャを Greenfield で実装 | クリーンなアーキテクチャ、最適化された設計 | 実装コスト大、既存アセットの破棄、テスト工数増 | 既存の検証済みロジック（フェーズ検出）を失う |
| C: Hybrid Approach | 既存 Supervisor を Task Graph として再構成、Chat Graph を新規追加 | 既存アセット活用、段階的移行、リスク分散 | 初期段階で両グラフの整合性管理が必要 | **選択アプローチ** - 要件と既存実装のバランスが最適 |

## Design Decisions

### Decision: Gemini 2.5 モデル選択戦略
- **Context**: コスト効率と応答品質のバランス最適化が要件で明示
- **Alternatives Considered**:
  1. 全タスクで gemini-2.5-pro を使用 — 高品質だがコスト高
  2. 全タスクで gemini-2.5-flash を使用 — 低コストだが複雑タスクで品質低下
  3. タスク複雑度に応じた動的選択 — 最適バランス
- **Selected Approach**: `createModel` ユーティリティ関数で複雑度判定に基づき動的選択
  - Chat Graph（簡単な会話）: `gemini-2.5-flash`
  - Task Graph（複雑な分析）: `gemini-2.5-pro`
  - 複雑度判定基準: ツール呼び出し数 ≥ 3、データ分析範囲 ≥ 7日、複数エージェント連携
- **Rationale**:
  - コスト削減: 簡単な会話は Flash で処理することで API コストを最適化
  - 品質保証: 複雑な分析タスクは Pro で処理し、精度を確保
  - スケーラビリティ: 使用量増加に伴うコスト増を抑制
- **Trade-offs**:
  - Benefits: コスト最適化、品質保証、スケーラビリティ
  - Compromises: 複雑度判定ロジックのメンテナンス必要、境界ケースの調整
- **Follow-up**: 実装後、ユーザーフィードバックに基づいて複雑度判定基準を調整

### Decision: 2層アーキテクチャ（Chat Graph + Task Graph）
- **Context**: 要件で「チャットモード」と「タスク実行モード」の明確な分離が指定
- **Alternatives Considered**:
  1. 単一 Supervisor Graph — シンプルだが責任混在
  2. 完全独立した複数グラフ — 完全分離だが既存アセット破棄
  3. Hybrid Approach（Supervisor → Task Graph 再構成 + 新規 Chat Graph）
- **Selected Approach**: Hybrid Approach（Option C）
  - Chat Graph: 新規作成、会話型コーチング、インテント検出、軽量モデル
  - Task Graph: 既存 Supervisor を再構成、専門タスク実行、重量モデル
  - 共通ユーティリティ: コンテキスト検出、ツール統合
- **Rationale**:
  - 既存アセット活用: フェーズ検出ロジック、専門エージェント、ツール統合を再利用
  - 段階的移行: Phase 1（基本構造）→ Phase 2（エージェント完成）→ Phase 3（API 統合）
  - リスク分散: 既存実装を維持しつつ新機能を追加
  - 要件適合: 「2つの主要なインタラクションモード」を明確に実現
- **Trade-offs**:
  - Benefits: 既存検証済みロジック活用、段階的移行、リスク低減
  - Compromises: 初期段階で両グラフの整合性管理、コード構造の複雑化
- **Follow-up**: Phase 2 完了後、両グラフの依存関係を検証し、必要に応じてリファクタリング

### Decision: MemorySaver から永続ストレージへの移行計画
- **Context**: 要件で「MemorySaver は開発環境用、本番は永続ストレージへ移行必要」と明記
- **Alternatives Considered**:
  1. 即座に永続ストレージ実装 — 実装コスト大、スコープ外
  2. MemorySaver を本番でも使用 — サーバー再起動で会話履歴消失
  3. 開発環境は MemorySaver、本番移行は次フェーズ
- **Selected Approach**: 開発環境は MemorySaver、設計段階でストレージインターフェース定義
  - 現行: `MemorySaver` を使用（開発・テスト環境）
  - 設計: Checkpointer インターフェース抽象化（`ICheckpointer`）
  - 移行: 次フェーズで LibSQL（Drizzle ORM）ベースの永続化実装
- **Rationale**:
  - スコープ管理: 本実装フェーズではコーチング機能に集中
  - 柔軟性: インターフェース定義により、後続実装の選択肢を保持
  - 開発効率: MemorySaver で開発・テスト工数を削減
- **Trade-offs**:
  - Benefits: 開発効率、スコープ管理、柔軟性
  - Compromises: 本番環境での会話履歴永続化は後続フェーズ
- **Follow-up**: `ICheckpointer` インターフェース定義、LibSQL スキーマ設計（型定義のみ）

## Risks & Mitigations
- **Risk 1: Gemini 2.5 モデルの API レート制限超過** — Mitigation: レート制限監視、キャッシング戦略、段階的ロールアウト
- **Risk 2: Chat Graph と Task Graph の状態管理の不整合** — Mitigation: 共通の `UserContext` 型定義、状態同期ユーティリティ実装
- **Risk 3: 複雑度判定基準の不正確さ** — Mitigation: ログベースの複雑度判定精度測定、ユーザーフィードバック収集、判定基準の継続的調整
- **Risk 4: 既存 Supervisor Graph 依存コードの破壊** — Mitigation: Gap Analysis で特定された依存箇所の検証、段階的移行、後方互換性保持

## References
- [Gemini Models API Documentation](https://ai.google.dev/gemini-api/docs/models) — Gemini 2.5 Flash/Pro モデル仕様
- [LangChain Google GenAI Integration](https://pypi.org/project/langchain-google-genai/) — LangChain × Gemini 統合パッケージ
- [LangGraph Multi-Agent Workflows](https://blog.langchain.com/langgraph-multi-agent-workflows/) — Supervisor Pattern とマルチエージェントアーキテクチャ
- [LangGraph Supervisor Pattern Repository](https://github.com/langchain-ai/langgraph-supervisor-py) — 公式 Supervisor Pattern 実装例
- `.kiro/specs/aim-coach-ai-agent/gap-analysis.md` — 既存実装と要件のギャップ分析
- `.kiro/steering/tech.md` — プロジェクト技術スタック
- `.kiro/steering/structure.md` — プロジェクト構造パターン
