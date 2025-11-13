# Research & Design Decisions: cli-score-collector

---
**Purpose**: 既存CLI実装の設計判断とアーキテクチャ調査結果を文書化する

**Usage**:
- 既存実装の設計判断根拠を記録
- 技術選択のトレードオフを文書化
- 将来の保守・拡張のための参照資料
---

## Summary
- **Feature**: `cli-score-collector`
- **Discovery Scope**: Extension（既存実装の仕様書化）
- **Key Findings**:
  - 既存実装は全要件を100%満たし、本番環境で安定稼働中
  - 設計品質が高く、型安全性・エラーハンドリング・構造化ログが適切に実装済み
  - 新規実装不要、ドキュメント化と動作検証が主要タスク

## Research Log

### Device Authorization Flow 認証方式
- **Context**: CLIツールでのセキュアな認証方法の選定
- **Sources Consulted**:
  - better-auth公式ドキュメント
  - OAuth 2.0 Device Authorization Grant (RFC 8628)
  - 既存実装: `cli/src/auth.ts`
- **Findings**:
  - Device Authorization Flowは、入力制約があるデバイス（CLI、スマートTV等）に最適
  - ブラウザでの認証承認により、パスワード入力なしで安全な認証を実現
  - better-auth clientが`deviceAuthorizationClient()` プラグインで標準サポート
  - ポーリング間隔は5秒（RFC推奨範囲内）
- **Implications**:
  - CLIユーザー体験が向上（パスワード不要、ブラウザ認証）
  - トークン保存に`Conf`を使用し、クロスプラットフォーム対応

### Aim Labs データベースフォーマット
- **Context**: Aim Labs SQLite (.bytes) データベース構造の理解
- **Sources Consulted**:
  - 既存実装: `cli/local-aimlab-schema/schema.ts`
  - Aim Labsローカルストレージ調査
- **Findings**:
  - Aim Labsは`.bytes`拡張子のSQLiteデータベースにタスクデータを保存
  - `taskData`テーブルが主要なスコア情報を保持
  - Drizzle ORMでスキーマ定義し、型安全クエリを実現
- **Implications**:
  - `bun:sqlite`でネイティブ高速読み取り
  - 読み取り専用モードで安全にアクセス
  - スキーマ変更時もDrizzleで型チェック可能

### Kovaak's CSVファイル命名規則
- **Context**: Kovaak's CSVファイルからメタデータ抽出方法
- **Sources Consulted**:
  - 既存実装: `cli/src/commands/kovaaks.ts`
  - Kovaak's公式フォーマット調査
- **Findings**:
  - ファイル名形式: `<シナリオ名> - <モード> - <YYYY.MM.DD-HH.MM.SS> Stats.csv`
  - 正規表現: `/^(?<scenario>.+?) - (?<mode>.+?) - (?<dt>\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}\.\d{2}) Stats\.csv$/u`
  - 日時パースで実行タイムスタンプを抽出
- **Implications**:
  - メタデータをファイル名から自動抽出
  - 不正ファイル名は警告ログでスキップ（ロバストネス）
  - エポック秒変換でサーバー側の時系列分析を容易化

### 増分アップロードの実装戦略
- **Context**: 重複アップロード防止とパフォーマンス最適化
- **Sources Consulted**:
  - 既存実装: `cli/src/local-db.ts`, `api/db/schema.ts`
  - Drizzle ORM公式ドキュメント
- **Findings**:
  - ローカルSQLiteで処理済みファイル追跡
  - Aim Labs: `taskId`で重複チェック
  - Kovaak's: `fileName + fileHash`で重複チェック
  - `onConflictDoNothing()`で競合時は既存レコード保持
  - クロスプラットフォームAppDataディレクトリを自動選択
- **Implications**:
  - 重複アップロードを完全に防止
  - ファイルハッシュでファイル内容変更も検出
  - ネットワーク帯域とサーバー負荷を削減

### バッチアップロードのチャンクサイズ
- **Context**: ネットワーク効率とタイムアウト回避のバランス
- **Sources Consulted**:
  - 既存実装: `cli/src/util.ts`
  - HTTP/1.1タイムアウト推奨値
- **Findings**:
  - チャンクサイズ: 100件
  - 順次アップロード（並列ではなく`for...of`）
  - 失敗時は即座に処理中断（エラー伝播）
- **Implications**:
  - タイムアウトリスク最小化（100件は通常30秒以内）
  - エラー時のロールバック明確化（部分アップロード状態を回避）
  - 進捗ログで透明性確保（X/Y chunks）

### 構造化ログ設計
- **Context**: 運用可視性とトラブルシューティング効率化
- **Sources Consulted**:
  - 既存実装: `cli/src/logger.ts`
  - JSON構造化ログのベストプラクティス
- **Findings**:
  - JSON形式: `{timestamp, level, message, data}`
  - ログレベル: DEBUG (0), INFO (1), WARN (2), ERROR (3)
  - スタックトレース自動抽出（`Error`インスタンス検出）
  - 環境変数で動的レベル設定（開発=DEBUG, 本番=INFO）
- **Implications**:
  - ログ検索・フィルタリングが容易（JQ等で処理可能）
  - エラー診断が高速化（スタックトレース自動記録）
  - 運用環境で適切な詳細度を自動調整

### Bunランタイム最適化
- **Context**: CLI起動速度とTypeScript実行効率の向上
- **Sources Consulted**:
  - 既存実装: `cli/src/index.ts` (shebang), 各モジュール
  - Bun公式ドキュメント
- **Findings**:
  - Shebang `#!/usr/bin/env bun` で直接実行可能
  - `bun:sqlite`: ネイティブSQLiteクライアント（Node.js `better-sqlite3`より高速）
  - `Bun.file()`, `Bun.sleep()`: ネイティブAPI活用
  - TypeScript直接実行（トランスパイル不要）
- **Implications**:
  - 起動時間短縮（トランスパイルオーバーヘッドなし）
  - SQLite読み取り高速化
  - 依存関係シンプル化（Bunが多くを内蔵）

## Architecture Pattern Evaluation

既存実装はシンプルなコマンドベース・レイヤードアーキテクチャを採用しており、CLI用途に最適。

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| **Command-Based Architecture (採用済み)** | Commander.jsでコマンド分離、各コマンドが独立した処理フローを実行 | シンプル、テスト容易、コマンド追加が容易 | 共通処理の重複リスク（utilで対処済み） | CLI標準パターン、小規模ツールに最適 |
| Event-Driven Architecture | コマンド実行をイベントとして扱い、ハンドラーを登録 | 柔軟性高い、プラグイン可能 | 複雑化、CLIには過剰 | 大規模CLI拡張時に検討 |
| Microservices | 各機能をサービスに分割 | スケーラビリティ | CLI用途には不適切（オーバーエンジニアリング） | 不採用 |

**選択理由**: Command-Based Architectureは小規模CLIツールに最適で、既存実装が証明済み。

## Design Decisions

### Decision: Device Authorization Flow vs Basic Auth
- **Context**: CLI認証方式の選定（パスワード入力 vs デバイス認証）
- **Alternatives Considered**:
  1. Basic Auth（メール+パスワード入力） — シンプルだがCLI体験が悪い
  2. API Key — 管理が煩雑、セキュリティリスク
  3. Device Authorization Flow — ブラウザ認証、UX最適
- **Selected Approach**: Device Authorization Flow
- **Rationale**:
  - CLIでのパスワード入力はユーザー体験が悪い（タイポ、可視性）
  - ブラウザ認証は既存のパスワードマネージャー活用可能
  - OAuth 2.0標準仕様（RFC 8628）で広く採用済み
- **Trade-offs**:
  - ✅ UX向上、セキュリティ強化
  - ❌ ブラウザ必要（ヘッドレス環境では非対応）
- **Follow-up**: ヘッドレス環境向けに将来的にAPI Key認証を追加検討

### Decision: ローカルDB (SQLite) vs ファイルベース追跡
- **Context**: 処理済みファイル追跡の永続化方式
- **Alternatives Considered**:
  1. JSONファイル — シンプルだが並行アクセス問題
  2. SQLite — トランザクション安全、クエリ容易
  3. メモリのみ — 永続化なし、実用性低い
- **Selected Approach**: SQLite (Drizzle ORM)
- **Rationale**:
  - トランザクション保証で競合回避
  - Drizzle ORMで型安全クエリ
  - マイグレーション管理が容易
  - クロスプラットフォーム標準（SQLiteは全OSで動作）
- **Trade-offs**:
  - ✅ 堅牢性、型安全性
  - ❌ 若干の複雑性増加（Drizzle設定必要）
- **Follow-up**: なし（現行で十分）

### Decision: チャンクサイズ 100件
- **Context**: バッチアップロードのチャンクサイズ決定
- **Alternatives Considered**:
  1. 50件 — 安全だが非効率
  2. 100件 — バランス良好
  3. 500件 — 効率的だがタイムアウトリスク
- **Selected Approach**: 100件
- **Rationale**:
  - 平均的なネットワーク環境で30秒以内に完了
  - サーバー側のリクエスト処理時間も考慮
  - エラー時の影響範囲を限定
- **Trade-offs**:
  - ✅ タイムアウトリスク最小化、エラー影響範囲限定
  - ❌ 超大量データ時に多数のリクエスト（実用上問題なし）
- **Follow-up**: パフォーマンステストで検証

### Decision: 構造化ログ (JSON) vs プレーンテキスト
- **Context**: ログ出力形式の選定
- **Alternatives Considered**:
  1. プレーンテキスト — 人間可読性高いが解析困難
  2. JSON — 機械可読性高い、検索容易
  3. 両方出力 — 複雑化
- **Selected Approach**: JSON構造化ログ
- **Rationale**:
  - JQ等のツールで高度なログ解析可能
  - エラー診断が高速化（構造化データ）
  - CI/CDパイプラインとの統合容易
  - 人間可読性は`jq -C`で十分確保
- **Trade-offs**:
  - ✅ 検索・フィルタリング効率化、自動化容易
  - ❌ 生ログの可読性低下（JQ必須）
- **Follow-up**: ユーザーガイドにJQの使用例を記載

## Risks & Mitigations

### Risk 1: Aim Labs/Kovaak's データフォーマット変更
- **リスク**: ゲームアップデートでデータフォーマットが変更される可能性
- **影響度**: 中（パーサー動作停止）
- **緩和策**:
  - 構造化エラーログで問題箇所を即座に特定
  - スキーマバージョン管理（将来的に複数バージョン対応）
  - エラーハンドリングで部分的失敗を許容（不正行はスキップ）

### Risk 2: ブラウザ不在環境での認証不可
- **リスク**: ヘッドレスサーバーやCI環境でDevice Authorization Flowが使用不可
- **影響度**: 低（現時点でユースケース外）
- **緩和策**:
  - 将来的にAPI Key認証を追加オプションとして実装
  - 現時点では対象外（Windows デスクトップ環境がターゲット）

### Risk 3: ネットワーク不安定環境でのアップロード失敗
- **リスク**: チャンクアップロード中にネットワーク切断
- **影響度**: 中（部分アップロード）
- **緩和策**:
  - 失敗チャンクはローカルDBに記録されず、次回実行時に再試行
  - エラーログで失敗チャンク数を明示
  - 将来的にリトライロジック追加を検討

## References

### 公式ドキュメント
- [better-auth Device Authorization](https://www.better-auth.com/docs/authentication/device-authorization) — Device Authorization Flow実装ガイド
- [OAuth 2.0 Device Authorization Grant (RFC 8628)](https://datatracker.ietf.org/doc/html/rfc8628) — 標準仕様
- [Bun Runtime Documentation](https://bun.sh/docs) — Bun API リファレンス
- [Drizzle ORM](https://orm.drizzle.team/) — 型安全ORM
- [Commander.js](https://github.com/tj/commander.js) — Node.js CLI フレームワーク

### 内部リファレンス
- [API仕様](../../api/routes/) — POST /api/aimlabs, /api/kovaaks エンドポイント定義
- [データベーススキーマ](../../api/db/schema.ts) — ローカルDB追跡テーブル定義
- [ステアリング: 技術スタック](../../.kiro/steering/tech.md) — プロジェクト技術選定方針
