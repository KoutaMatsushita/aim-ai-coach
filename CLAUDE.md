# CLAUDE.md - Aim AI Coach プロジェクトガイド

Claude Code用のプロジェクト固有の開発ガイダンスです。

## プロジェクト理解

### 基本概念
- **目的**: FPSプレイヤーのエイム練習を科学的にコーチング
- **対象データ**: Kovaaks (CSV) + Aim Lab (SQLite) の統計情報
- **コア技術**: AI分析による個別最適化された練習プラン生成
- **ユーザー**: Discord IDで識別される練習者

### アーキテクチャ理解
```
coach/     ← Mastra AIエージェントサーバー (Node.js)
collector/ ← データ収集CLI (Bun)
samples/   ← テストデータ置き場
```

## 開発環境セットアップ

### 必須環境変数
```bash
# coach/.env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
GOOGLE_API_KEY=your-gemini-api-key

# collector/.env
DISCORD_CLIENT_ID=your-discord-app-client-id
```

### 起動コマンド
```bash
# 開発サーバー起動
cd coach && npm run dev

# データベース更新
cd coach && npx drizzle-kit push

# データ収集テスト
cd collector && bun src/index.ts login
```

## コードベース理解

### 重要ファイル
- `coach/src/mastra/agents/aim-ai-coach-agent.ts` - AIエージェントの指示とロジック
- `coach/src/db/schema.ts` - データベース設計 (3テーブル)
- `collector/src/kovaaks.ts` - KovaaKs CSV解析
- `collector/src/aimlab.ts` - Aim Lab SQLite読み込み

### データベース構造
```sql
discord_users: id(PK), username, avatar
kovaaks_scores: 精度/効率/命中/過剰射撃/反応時間など
aimlab_task_data: タスク名/スコア/難易度/武器種別など
```

### AI エージェント動作
1. Discord IDから直近14-30日データ取得
2. accuracy/overshots/CI指標で熟練度自動判定
3. 弱点分析 → 練習メニュー生成
4. 具体的な時間・頻度・目標値提示

## 開発時の注意事項

### ツール選択
- **Coach**: `npm run format/check` (biome)
- **Collector**: `bun run format` (biome)
- **データベース**: drizzle-kit コマンド

### ファイル編集パターン
```bash
# AI指示の調整
coach/src/mastra/agents/aim-ai-coach-agent.ts

# スキーマ変更
coach/src/db/schema.ts → drizzle-kit push

# データ処理ロジック
collector/src/kovaaks.ts, aimlab.ts
```

### よくある作業

#### 新しいKovaaKsフィールド追加
1. `coach/src/db/schema.ts` のkovaaksScoresTableに列追加
2. `collector/src/kovaaks.ts` の解析ロジック更新
3. `npx drizzle-kit push` でDB更新

#### AI指示の改善
1. `coach/src/mastra/agents/aim-ai-coach-agent.ts` の instructions 文字列編集
2. 日本語コメント部分が実際の指示内容
3. 熟練度判定ロジックや出力フォーマットを調整

#### APIエンドポイント追加
1. `coach/src/mastra/index.ts` のapiRoutes配列に追加
2. Zodスキーマでバリデーション実装
3. データベース操作はdrizzle-ormで記述

## テストとデバッグ

### ローカルテスト
```bash
# サンプルデータでテスト
cp your-kovaaks.csv samples/kovaaks/
bun collector/src/index.ts kovaaks samples/kovaaks/your-file.csv

# AI応答確認
curl -X POST http://localhost:4111/agent/aim-ai-coach-agent \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Discord ID: 123456789"}]}'
```

### 型チェック
```bash
# 両プロジェクトで型エラーなしを確認
cd coach && npm run check
cd collector && bun run lint
```

## 実装時のベストプラクティス

### データ処理
- CSV/SQLite読み込みは例外処理を充実
- 日時変換は必ずepoch秒で統一
- Discord IDは文字列として扱う

### AI応答品質
- 数値は小数1-2桁で表示
- 具体的な練習時間と頻度を提示
- 根拠となるデータ（中央値/75%tile）を併記

### セキュリティ
- 環境変数は必ず検証 (env.ts)
- OAuthはPKCE実装済み
- 入力データはZodで型検証

### パフォーマンス
- データベースクエリはlimit/offset使用
- 大量データはafter パラメータで期間制限
- インデックス活用 (discord_user_id)

## トラブルシューティング

### よくあるエラー
1. **環境変数エラー**: env.ts のvalidateEnv()でチェック
2. **Turso接続エラー**: URL/トークン形式確認
3. **Discord OAuth**: client_id設定とPKCEフロー
4. **型エラー**: package.jsonのバージョン整合性

### デバッグ方法
```bash
# coach ログ確認
tail -f logs/mastra.log

# collector 詳細出力
DEBUG=* bun src/index.ts kovaaks sample.csv

# データベース確認
npx drizzle-kit studio
```

## 拡張方針

### 新ゲーム対応
1. collector/src/new-game.ts で解析ロジック作成
2. schema.ts に対応テーブル追加
3. AI agent の instructions で対応ゲーム追記

### 分析強化
1. user-tool.ts に新しい分析関数追加
2. エージェントが利用できるツールに登録
3. instructions で分析ロジック強化

---

**このプロジェクトは日本語中心で開発されており、コメントと変数名に日本語が混在します。**