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
│       │   ├── shared/   # 共通ユーティリティ
│       │   ├── user-tool.ts         # データ取得・分析
│       │   ├── knowledge-tool-libsql.ts  # RAG検索
│       │   ├── rag-wrapper.ts       # ガードレール付きRAG
│       │   └── reflection-tools.ts  # 振り返り機能
│       └── services/     # RAG・分析サービス
├── components/           # UIコンポーネント
└── data-collector/       # CLIデータ収集アプリ
    ├── src/              # CLI実装
    ├── local-aimlab-schema/  # AimLabスキーマ
    └── package.json      # CLI依存関係
```

## 主要アーキテクチャ

### AIエージェント
- **メインエージェント**: `lib/mastra/agents/aim-ai-coach-agent.ts`
  - Google Gemini 2.5 Pro使用
  - ワーキングメモリでユーザー状態管理
  - 熟練度別指導システム（Beginner/Intermediate/Advanced/Expert）
  - 日本語メインの自然な対話

### ツール体系
- **ユーザーデータツール**: `lib/mastra/tools/user-tool.ts`
  - KovaaKs/AimLabスコア取得・統計分析
  - スキル評価とトレンド分析
  - 一貫性指数とパフォーマンス追跡

- **RAGシステム**: 
  - `knowledge-tool-libsql.ts`: LibSQLVector高速検索
  - `rag-wrapper.ts`: 信頼度ベースガードレール
  - YouTubeコンテンツから個人化推薦

- **振り返りシステム**: `reflection-tools.ts`
  - セッション間パフォーマンス変化分析
  - 推奨事項実行状況追跡
  - 指導効果測定

- **共通基盤**: `tools/shared/`
  - `tool-utils.ts`: 標準化エラーハンドリング・テレメトリ
  - `cache-layer.ts`: インテリジェントキャッシング
  - `rag-telemetry.ts`: RAG操作監視

### データフロー
1. **認証**: Discord OAuth → Better Auth → RuntimeContext
2. **データ収集**: CLI/WebUI → LibSQL/Turso
3. **分析**: 統計計算 → スキル評価 → 個人化
4. **RAG**: ベクトル検索 → 信頼度チェック → 推薦
5. **対話**: エージェント → ワーキングメモリ → 振り返り