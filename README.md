# Aim AI Coach 🎯

FPSプレイヤーのエイム上達を支援するAIコーチングシステム。KovaaksとAim Labの練習データを収集・分析し、個々のプレイヤーの熟練度に応じたパーソナライズされた練習計画を提供します。

## 📋 概要

- **AIエージェント**: Gemini 2.5 Proによる個別コーチング
- **熟練度自動判定**: Beginner/Intermediate/Advanced/Expert
- **データ駆動**: 精度・効率・過剰射撃率などの定量分析
- **パーソナライズ**: 1-4週間の段階的練習プラン生成

## 🏗️ アーキテクチャ

```
├── coach/        # AIコーチサーバー (Node.js + Mastra)
├── collector/    # データ収集CLI (Bun + Commander)
└── discord-bot/  # Discord bot (Cloudflare Workers)
```

### Coach (コーチサーバー)
- **Port**: 4111
- **技術**: TypeScript + Mastra Framework + Drizzle ORM
- **データベース**: Turso (SQLite)
- **AI**: Google Gemini 2.5 Pro

### Collector (データ収集)
- **実行**: CLI アプリケーション
- **技術**: Bun + TypeScript
- **対応**: Kovaaks CSV / Aim Lab SQLite

### Discord Bot
- **実行**: Cloudflare Workers
- **技術**: TypeScript + discord-hono + Mastra Client
- **機能**: `/ask` コマンドでAIコーチに質問

## 🚀 セットアップ

### 1. 環境変数設定

**coach/.env**
```bash
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token
GOOGLE_API_KEY=your_google_api_key
```

**collector/.env**
```bash
DISCORD_CLIENT_ID=your_discord_client_id
```

**discord-bot/.env**
```bash
MASTRA_BASE_URL=http://localhost:4111  # または本番環境URL
```

### 2. 依存関係インストール

```bash
# Coach サーバー
cd coach
npm install

# Collector CLI
cd collector
bun install

# Discord Bot
cd discord-bot
npm install
```

### 3. データベース準備

```bash
cd coach
npx drizzle-kit push
```

## 🎮 使用方法

### Coach サーバー起動

```bash
cd coach
npm run dev    # 開発モード
npm run start  # 本番モード
```

### データ収集

```bash
cd collector

# Discord認証
bun src/index.ts login

# Kovaaksデータ収集
bun src/index.ts kovaaks /path/to/kovaaks/stats

# Aim Labデータ収集
bun src/index.ts aimlab /path/to/aimlab/database
```

### Discord Bot 使用

Discord サーバーで以下のコマンドが利用できます：

```
/ask message: エイムの練習方法について質問したいです
```

Botは自動的にユーザーのDiscord IDを使用して個人データを分析し、パーソナライズされたアドバイスを提供します。

## 📊 データ分析

### 熟練度判定基準

| レベル | 精度 | 過剰射撃率 | 特徴 |
|--------|------|------------|------|
| **Beginner** | < 45% | > 25% | 基礎構築期 |
| **Intermediate** | 45-60% | 15-25% | バランス強化 |
| **Advanced** | > 60% | < 15% | 微調整・再現性 |
| **Expert** | > 70% | < 10% | ピーキング・維持 |

### 練習プラン例

**Intermediate プラン (30-45分 × 週5回)**
- ウォームアップ: 5-10分
- フリック練習: Kovaaks 1w6ts / Aim Lab sixshot
- トラッキング: Smoothbot Medium / switchtrack normal
- 目標: 過剰射撃率15%未満、精度安定化

## 🔧 開発

### ツール

```bash
# フォーマット
npm run format

# リント・型チェック
npm run check

# ビルド
npm run build
```

### ディレクトリ構成

```
coach/
├── src/
│   ├── mastra/
│   │   ├── agents/aim-ai-coach-agent.ts  # AIエージェント
│   │   ├── tools/user-tool.ts            # データ取得ツール
│   │   └── index.ts                      # Mastra設定
│   ├── db/schema.ts                      # データベーススキーマ
│   └── env.ts                           # 環境変数検証

collector/
├── src/
│   ├── index.ts        # CLI メイン
│   ├── kovaaks.ts      # Kovaaks処理
│   ├── aimlab.ts       # Aim Lab処理
│   ├── discord.ts      # Discord OAuth
│   └── pkce-utils.ts   # PKCE認証

discord-bot/
├── src/
│   ├── index.ts            # Bot メイン
│   ├── handlers/
│   │   ├── ask.ts          # /askコマンド処理
│   │   └── ping.ts         # /pingコマンド処理
│   └── init.ts             # Discord初期化
```

## 🛡️ セキュリティ

- **PKCE認証**: Discord OAuthでPKCE使用
- **環境変数**: 機密情報の適切な管理
- **入力検証**: Zodスキーマによる型安全性
- **データベース**: Turso暗号化接続

## 📈 API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/users` | POST | Discordユーザー登録 |
| `/users/:id/kovaaks` | POST | Kovaaksスコア登録 |
| `/users/:id/aimlab` | POST | Aim Labタスク登録 |

## 🎯 サポート対象

### Kovaaks
- CSV統計データ
- 精度・効率・命中数・過剰射撃
- シナリオ別分析

### Aim Lab
- SQLiteデータベース
- タスク・スコア・難易度
- 武器種別・パフォーマンス分類

## 📜 ライセンス

ISC

## 🤝 コントリビューション

1. Fork the repository
2. Create feature branch
3. Run `npm run check`
4. Commit changes
5. Create Pull Request

## 📝 設計思想

このプロジェクトは個人開発のためのソフトウェアです。以下の方針で開発されています：

- **シンプル設計**: 過度に抽象化された設計パターンは避け、理解しやすいコードを重視
- **必要最小限**: エンタープライズ向けのような複雑なエラーハンドリングや冗長な処理は実装しない
- **実用性重視**: 完璧性よりも動作することを優先し、必要に応じて段階的に改善
- **開発効率**: コードの保守性と開発速度のバランスを考慮した実装

個人プロジェクトの特性を活かし、オーバーエンジニアリングを避けながら実用的なソリューションを提供します。

---

**Made for FPS players who want to level up their aim game 🏆**