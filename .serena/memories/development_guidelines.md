# 開発ガイドライン

## コーディング規約
- **TypeScript**: 厳格な型定義、Zodスキーマ使用
- **命名**: camelCase (JavaScript/TypeScript標準)
- **コンポーネント**: 関数コンポーネント + React Hooks
- **データベース**: Drizzle ORM、型安全なクエリ

## 認証・セキュリティ
- Discord認証必須、Better Authセッション管理
- 環境変数で機密情報管理
- ユーザーIDはruntimeContextから自動取得

## AIエージェント開発
- Mastraフレームワーク使用
- ツールは`lib/mastra/tools/`に配置
- メモリシステムでパーソナライゼーション
- 日本語での自然な対話インターフェース

## データベース
- LibSQL/Turso使用
- Drizzle ORMで型安全
- インデックス最適化済み
- 時系列データ分析対応