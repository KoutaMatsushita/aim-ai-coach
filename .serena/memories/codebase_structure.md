# コードベース構造

## ディレクトリ構成
```
├── coach/           # Mastra AIエージェントサーバー
│   ├── src/
│   │   ├── mastra/
│   │   │   ├── agents/aim-ai-coach-agent.ts  # AIエージェント指示・ロジック
│   │   │   ├── tools/user-tool.ts            # データ取得ツール  
│   │   │   └── index.ts                      # Mastra設定
│   │   ├── db/schema.ts                      # Drizzle スキーマ定義
│   │   └── env.ts                           # 環境変数検証
│   └── drizzle/                             # マイグレーションファイル
├── collector/       # データ収集CLI
│   └── src/
│       ├── index.ts        # CLI メイン (Commander)
│       ├── kovaaks.ts      # KovaaKs CSV解析
│       ├── aimlab.ts       # Aim Lab SQLite読み込み
│       ├── discord.ts      # Discord OAuth (PKCE)
│       └── pkce-utils.ts   # PKCE認証ユーティリティ
├── discord-bot/     # Discord Bot (Cloudflare Workers)
│   └── src/
│       ├── index.ts            # Bot メイン
│       ├── handlers/
│       │   ├── ask.ts          # /askコマンド処理
│       │   └── ping.ts         # /pingコマンド処理
│       └── init.ts             # Discord初期化
└── samples/         # テストデータ
```

## 重要ファイルの役割

### Coach
- `aim-ai-coach-agent.ts`: AI指示とロジック (日本語コメントが実際の指示)
- `schema.ts`: 3テーブル設計 (discord_users, kovaaks_scores, aimlab_task_data)
- `user-tool.ts`: データ取得・分析関数

### Collector
- `kovaaks.ts`: CSV解析 (精度/効率/命中/過剰射撃/反応時間)
- `aimlab.ts`: SQLite読み込み (タスク/スコア/難易度/武器種別)
- `discord.ts`: PKCE認証フロー

### Discord Bot
- `ask.ts`: Mastra Client経由でCoachサーバーにプロキシ
- Discord ID自動取得・メモリ機能