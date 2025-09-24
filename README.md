# AIM AI Coach

**個人向けFPSエイム改善アプリケーション** - データ駆動型コーチングでエイム上達をサポート

## 🎯 概要

AIM AI Coach は、KovaaKs と Aim Lab のパフォーマンスデータを分析し、個人に最適化された練習指導を提供するAIコーチングアプリケーションです。Google Gemini 2.5 Pro を基盤とした高度なAIエージェントが、あなたの弱点を定量評価し、効果的な改善プランを提案します。

### 主要機能

- 🤖 **パーソナライズドAIコーチ**: 個人の特性を学習し継続的な関係性を築く
- 📊 **詳細データ分析**: KovaaKs/Aim Lab データの統計分析とトレンド追跡
- 🎥 **高性能RAGシステム**: YouTube動画コンテンツから最適な学習素材を検索
- 💾 **ワーキングメモリ**: セッション間でのプロファイル維持
- 🔄 **振り返り機能**: 前回からの変化分析と指導効果測定
- 📱 **CLIデータ収集**: ローカルゲームデータの自動アップロード

## 🚀 クイックスタート

### 前提条件

- Node.js 18+ または Bun
- Discord アカウント（認証用）
- KovaaKs または Aim Lab のプレイデータ

### セットアップ

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/your-username/aim-ai-coach.git
   cd aim-ai-coach
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   # または
   bun install
   ```

3. **環境変数の設定**
   ```bash
   cp .env.example .env
   ```

   必要な環境変数：
   ```bash
   # Discord OAuth
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret

   # Database (Turso)
   TURSO_DATABASE_URL=your_turso_url
   TURSO_AUTH_TOKEN=your_turso_token

   # AI Service
   GOOGLE_API_KEY=your_gemini_api_key

   # Authentication
   AUTH_BASE_URL=http://localhost:3000
   ```

4. **データベースのセットアップ**
   ```bash
   npm run db:generate  # マイグレーション生成
   npm run db:push      # スキーマの適用
   ```

5. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

   ブラウザで [http://localhost:3000](http://localhost:3000) にアクセス

## 📁 プロジェクト構造

```
aim-ai-coach/
├── app/                    # Next.js App Router
│   ├── api/auth/          # Better Auth API routes
│   ├── api/chat/          # Mastra chat endpoints
│   ├── login/             # 認証ページ
│   └── device/            # デバイス認証フロー
│
├── lib/                   # コアアプリケーションロジック
│   ├── auth/              # 認証設定
│   ├── db/                # データベース設定とスキーマ
│   └── mastra/            # AI エージェント関連
│       ├── agents/        # AI コーチエージェント定義
│       ├── tools/         # ユーザーデータと知識ツール
│       │   ├── shared/    # 共通ユーティリティ
│       │   ├── user-tool.ts         # データ取得・分析
│       │   ├── knowledge-tool-libsql.ts  # RAG検索
│       │   ├── rag-wrapper.ts       # ガードレール付きRAG
│       │   └── reflection-tools.ts  # 振り返り機能
│       └── services/      # RAG・コンテンツ分析サービス
│
├── components/            # React UIコンポーネント
├── data-collector/        # CLI データ収集アプリ
└── drizzle/              # データベースマイグレーション
```

## 🛠 開発コマンド

### コア開発
```bash
npm run dev          # 開発サーバー起動（Turbopack使用）
npm run build        # プロダクション ビルド
npm start           # プロダクション サーバー起動
```

### データベース管理
```bash
npm run db:generate    # マイグレーションファイル生成
npm run db:push        # スキーマをデータベースに適用
npm run db:studio      # Drizzle Studio起動（GUI）
npm run db:migrate     # マイグレーション実行
```

### CLIデータ収集（data-collector）
```bash
cd data-collector
bun run dev           # CLI開発モード
bun run build         # CLI ビルド

# 使用例
bun run . login                    # Discord認証
bun run . kovaaks ~/stats/         # KovaaKsデータアップロード
bun run . aimlab ~/aimlab/         # AimLabデータアップロード
```

## 🎮 使用方法

1. **初回セットアップ**
   - Discordでログイン
   - ゲームデータをアップロード（Web UI または CLI使用）

2. **AIコーチングセッション**
   - チャットインターフェースで質問や相談
   - データ分析結果に基づく個人化されたアドバイス
   - 練習プランと改善提案の受け取り

3. **継続的な改善**
   - 定期的なデータアップロード
   - 振り返りセッションでの進捗確認
   - パーソナライズされた長期改善戦略

## 🏗 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React 19, TailwindCSS v4
- **認証**: Better Auth + Discord OAuth
- **データベース**: LibSQL/Turso (SQLite互換、エッジ最適化)
- **AI/ML**: Mastra Framework + Google Gemini 2.5 Pro
- **UIコンポーネント**: Radix UI + assistant-ui/react
- **検索**: LibSQLVector (高性能ベクトル検索)
- **開発**: TypeScript + Turbopack + Drizzle ORM

## 🔧 主要機能詳細

### AIエージェント
- **スキル評価**: 定量的データに基づく4段階評価（Beginner/Intermediate/Advanced/Expert）
- **ワーキングメモリ**: 個人特性、練習習慣、コーチング設定の永続化
- **振り返り機能**: パフォーマンス変化分析、推奨事項実行状況、指導効果測定
- **多言語サポート**: 日本語メイン、自然な会話インターフェース

### RAGシステム
- **高性能検索**: LibSQLVector を使用した10-100倍高速な検索
- **信頼度チェック**: 自動ガードレール付きコンテンツ検索
- **個人化推薦**: スキルレベルと弱点に基づく最適化された提案
- **フォールバック**: 検索不可時の基本分析モード自動切り替え

## 📊 データ分析機能

- **統計分析**: 精度、一貫性指数、トレンド分析
- **パフォーマンス追跡**: 時系列データでの改善パターン検出
- **比較分析**: セッション間・期間別パフォーマンス比較
- **定量評価**: オーバーショット率、エフィシエンシー等の詳細メトリクス

## 🚢 デプロイ

このプロジェクトはSST + AWSでのデプロイに最適化されています：

```bash
npx sst dev         # ローカル開発（AWS統合）
npx sst deploy      # AWS デプロイ
npx sst remove      # AWS リソース削除
```

## 🤝 貢献

個人開発プロジェクトですが、改善提案やバグレポートを歓迎します。

## 📄 ライセンス

このプロジェクトは個人使用向けです。詳細は開発者にお問い合わせください。

---

**🎯 エイム上達への第一歩を、データとAIと共に始めましょう！**