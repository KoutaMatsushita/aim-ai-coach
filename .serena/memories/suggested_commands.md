# 重要コマンド一覧

## 開発環境セットアップ
```bash
# 依存関係インストール
cd coach && npm install
cd collector && bun install  
cd discord-bot && npm install

# データベース準備
cd coach && npx drizzle-kit push
```

## 開発サーバー起動
```bash
# Coach AIサーバー (Port 4111)
cd coach && npm run dev

# Discord Bot (開発モード)
cd discord-bot && npm run dev
```

## フォーマット・リント・型チェック
```bash
# Coach
cd coach && npm run format    # biome format
cd coach && npm run check     # biome check + write

# Collector  
cd collector && bun run format
cd collector && bun run check
cd collector && bun run lint

# Discord Bot
cd discord-bot && npm run test  # vitest
```

## データベース操作
```bash
# スキーマ変更反映
cd coach && npx drizzle-kit push

# データベースGUI
cd coach && npx drizzle-kit studio
```

## データ収集
```bash
cd collector

# Discord認証
bun src/index.ts login

# Kovaaksデータ収集
bun src/index.ts kovaaks /path/to/kovaaks/stats

# Aim Labデータ収集  
bun src/index.ts aimlab /path/to/aimlab/database
```

## Discord Bot デプロイ
```bash
cd discord-bot

# コマンド登録 + デプロイ
npm run deploy

# コマンド登録のみ
npm run register
```

## テスト・デバッグ
```bash
# AI応答テスト
curl -X POST http://localhost:4111/agent/aim-ai-coach-agent \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Discord ID: 123456789"}]}'

# サンプルデータテスト
bun collector/src/index.ts kovaaks samples/kovaaks/sample.csv
```