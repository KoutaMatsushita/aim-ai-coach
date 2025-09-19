# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

### 目的
FPSプレイヤーのエイム練習を科学的にコーチングするAIシステム。KovaaksとAim Labの練習データを収集・分析し、個々のプレイヤーの熟練度に応じたパーソナライズされた練習計画を提供。

### アーキテクチャ
```
├── coach/        # Mastra AIエージェントサーバー (Node.js, Port 4111)
├── collector/    # データ収集CLI (Bun)
├── discord-bot/  # Discord Bot (Cloudflare Workers)
└── samples/      # テストデータ
```

## 開発コマンド

### 必須セットアップ
```bash
# 依存関係インストール
cd coach && npm install
cd collector && bun install
cd discord-bot && npm install

# データベース初期化
cd coach && npx drizzle-kit push
```

### 開発サーバー
```bash
cd coach && npm run dev        # AIサーバー起動 (Port 4111)
cd discord-bot && npm run dev # Discord Bot開発モード
```

### 品質チェック (タスク完了時必須)
```bash
# Coach
cd coach && npm run check     # biome format + lint + check

# Collector
cd collector && bun run check && bun run lint

# Discord Bot
cd discord-bot && npm run test # vitest
```

### データベース
```bash
cd coach
npx drizzle-kit push    # スキーマ変更反映
npx drizzle-kit studio  # データベースGUI
```

### データ収集
```bash
cd collector
bun src/index.ts login                           # Discord認証
bun src/index.ts kovaaks /path/to/kovaaks/stats  # KovaaKs CSV
bun src/index.ts aimlab /path/to/aimlab/database # Aim Lab SQLite
```

### Discord Bot デプロイ
```bash
cd discord-bot
npm run deploy    # コマンド登録 + Cloudflare Workers デプロイ
npm run register  # コマンド登録のみ
```

## アーキテクチャ詳細

### データフロー
1. **Collector**: Kovaaks CSV/Aim Lab SQLite → Turso SQLite Database
2. **Coach**: Discord ID → データ分析 → AI練習プラン生成 (Gemini 2.5 Pro)
3. **Discord Bot**: `/ask` コマンド → Coach API → パーソナライズド応答

### 重要ファイル
- `coach/src/mastra/agents/aim-ai-coach-agent.ts` - AIエージェント指示・ロジック
- `coach/src/db/schema.ts` - データベーススキーマ (discord_users, kovaaks_scores, aimlab_task_data)
- `collector/src/kovaaks.ts` - KovaaKs CSV解析
- `collector/src/aimlab.ts` - Aim Lab SQLite読み込み
- `discord-bot/src/handlers/ask.ts` - Discord `/ask` コマンド処理

### AI エージェント動作
1. Discord IDから直近14-30日データ取得
2. accuracy/overshots/CI指標で熟練度自動判定 (Beginner/Intermediate/Advanced/Expert)
3. 弱点分析 → 練習メニュー生成
4. 具体的な時間・頻度・目標値提示

## コード規約

### 技術スタック
- **Coach**: TypeScript + Mastra Framework + Drizzle ORM + Turso SQLite + Google Gemini
- **Collector**: Bun + TypeScript + Commander CLI
- **Discord Bot**: TypeScript + discord-hono + Cloudflare Workers
- **共通**: Biome (formatter/linter)

### スタイル (biome.json)
- インデント: タブ文字
- 行幅: 100文字
- クオート: ダブルクオート
- セミコロン: 必須
- 日本語コメント・変数名混在

### データ処理規約
- 日時: epoch秒で統一
- Discord ID: 文字列として扱う
- 数値表示: 小数1-2桁
- 環境変数: env.ts で検証必須
- 入力検証: Zodスキーマ使用

## よくある作業パターン

### KovaaKsフィールド追加
1. `coach/src/db/schema.ts` のkovaaksScoresTable列追加
2. `collector/src/kovaaks.ts` 解析ロジック更新
3. `npx drizzle-kit push` でDB更新

### AI指示調整
`coach/src/mastra/agents/aim-ai-coach-agent.ts` の instructions文字列編集
(日本語コメント部分が実際の指示内容)

### APIエンドポイント追加
1. `coach/src/mastra/index.ts` のapiRoutes配列に追加
2. Zodスキーマでバリデーション実装
3. Drizzle ORMでデータベース操作

## 環境変数設定

```bash
# coach/.env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
GOOGLE_API_KEY=your-gemini-api-key
YOUTUBE_API_KEY=your-youtube-api-key

# collector/.env
DISCORD_CLIENT_ID=your-discord-app-client-id

# discord-bot/.env
MASTRA_BASE_URL=http://localhost:4111
```

## 設計思想

個人開発プロジェクトのため以下を重視:
- **シンプル設計**: 過度な抽象化回避
- **必要最小限**: エンタープライズ級エラーハンドリング不要
- **実用性優先**: 完璧性より動作重視
- **段階的改善**: 必要に応じて機能拡張

---

**このプロジェクトは日本語中心で開発されており、コメントと変数名に日本語が混在します。**