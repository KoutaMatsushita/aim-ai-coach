# Aim AI Coach プロジェクト概要

## プロジェクトの目的
FPSプレイヤーのエイム練習を科学的にコーチングするAIシステム。KovaaksとAim Labの練習データを収集・分析し、個々のプレイヤーの熟練度に応じたパーソナライズされた練習計画を提供する。

## 技術スタック
- **Coach (AIサーバー)**: Node.js, TypeScript, Mastra Framework, Drizzle ORM, Turso SQLite, Google Gemini 2.5 Pro
- **Collector (データ収集)**: Bun, TypeScript, Commander CLI
- **Discord Bot**: Cloudflare Workers, TypeScript, discord-hono, Mastra Client
- **共通ツール**: Biome (formatter/linter), drizzle-kit

## アーキテクチャ
3つの独立したコンポーネント:
1. `coach/` - Mastra AIエージェントサーバー (Port 4111)
2. `collector/` - データ収集CLI (Bun実行)
3. `discord-bot/` - Discord bot (Cloudflare Workers)
4. `samples/` - テストデータ置き場

## データフロー
1. Collector: Kovaaks CSV / Aim Lab SQLiteファイルを解析 → Tursoデータベースに保存
2. Coach: Discord IDから直近14-30日データ取得 → AI分析 → 練習プラン生成
3. Discord Bot: `/ask`コマンド → Coachサーバーに転送 → パーソナライズされた応答

## 主要データ構造
- `discord_users`: Discord ユーザー情報
- `kovaaks_scores`: 精度/効率/命中/過剰射撃/反応時間など
- `aimlab_task_data`: タスク名/スコア/難易度/武器種別など