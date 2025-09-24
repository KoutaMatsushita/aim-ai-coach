# コードアーキテクチャ

## ディレクトリ構造
```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # Better Auth
│   │   └── chat/         # Mastraチャット
│   ├── login/            # ログインページ
│   └── device/           # デバイス認証
├── lib/                   # 共通ライブラリ
│   ├── auth/             # 認証設定
│   ├── db/               # データベーススキーマ
│   └── mastra/           # AIエージェント・ツール
│       ├── agents/       # AIコーチエージェント
│       ├── tools/        # ユーザー・ナレッジツール
│       └── services/     # RAG・分析サービス
└── components/           # UIコンポーネント
```

## 主要アーキテクチャ
- **AIエージェント**: `lib/mastra/agents/aim-ai-coach-agent.ts`
  - Google Gemini 2.5 Pro使用
  - ワーキングメモリでユーザー状態管理
  - 熟練度別指導システム
- **ツール統合**: `lib/mastra/tools/`
  - KovaaKs/AimLabデータ分析
  - LibSQLVector高性能RAG
- **認証フロー**: Discord OAuth → Better Auth → セッション管理