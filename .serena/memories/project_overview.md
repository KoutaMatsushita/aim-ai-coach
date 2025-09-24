# AIM AI Coach プロジェクト概要

## プロジェクト目的
FPSプレイヤーのエイム上達を支援するAIコーチアプリケーション。KovaaKsとAim Labの履歴データを用いてデータ駆動でパーソナライズされた指導を提供する。

## 主要機能
- Discord認証によるユーザー管理
- KovaaKsとAim Labのスコア履歴管理
- AIエージェントによるパーソナライズされたコーチング
- 統計分析とスキル評価
- リアルタイムチャットインターフェース
- **振り返り機能**: 前回セッションからの変化分析と指導効果測定
- **RAGシステム**: YouTubeコンテンツからの個人化推薦
- **CLIデータ収集**: ローカルゲームデータの自動アップロード

## システム構成
- **フロントエンド**: Next.js 15 (App Router) + React 19 + TailwindCSS v4
- **認証**: Better Auth + Discord OAuth (デバイス認証フロー対応)
- **データベース**: LibSQL/Turso (SQLite互換、エッジ最適化)
- **AI/ML**: Mastra Framework + Google Gemini 2.5 Pro
- **UI**: Radix UI + assistant-ui/react
- **検索**: LibSQLVector (高性能ベクトル検索)
- **デプロイ**: SST (AWS) + Cloudflare

## アーキテクチャの特徴
- **ワーキングメモリ**: セッション間での個人プロファイル維持
- **RAGガードレール**: 信頼度ベースの自動フォールバック機能
- **共通ユーティリティ**: 標準化されたエラーハンドリングとテレメトリ
- **CLIアプリ**: 独立したデータ収集ツール（data-collector/）