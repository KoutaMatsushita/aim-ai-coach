# 開発用コマンド

## 基本開発コマンド
- `npm run dev`: 開発サーバー起動 (Turbopack使用)
- `npm run build`: 本番ビルド (Turbopack使用)  
- `npm start`: 本番サーバー起動

## データベース関連
- `npx drizzle-kit generate`: マイグレーションファイル生成
- `npx drizzle-kit migrate`: マイグレーション実行
- `npx drizzle-kit studio`: Drizzle Studio起動 (データベースGUI)

## デプロイメント
- `npx sst dev`: ローカル開発環境 (AWS統合)
- `npx sst deploy`: AWS本番デプロイ
- `npx sst remove`: AWSリソース削除

## 環境変数要件
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`: Discord OAuth
- `AUTH_BASE_URL`: 認証ベースURL  
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`: Turso接続
- `GOOGLE_API_KEY`: Gemini API