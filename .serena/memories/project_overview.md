# AIM AI Coach プロジェクト概要

## プロジェクト目的
FPSプレイヤーのエイム上達を支援するAIコーチアプリケーション。KovaaKsとAim Labの履歴データを用いてデータ駆動でパーソナライズされた指導を提供する。

## 主要機能
- Discord認証によるユーザー管理
- KovaaKsとAim Labのスコア履歴管理
- AIエージェントによるパーソナライズされたコーチング
- 統計分析とスキル評価
- リアルタイムチャットインターフェース

## システム構成
- **フロントエンド**: Next.js 15 (App Router) + React 19 + TailwindCSS
- **認証**: Better Auth + Discord OAuth
- **データベース**: LibSQL/Turso (SQLite互換)
- **AI/ML**: Mastra Framework + Google Gemini 2.5 Pro
- **UI**: Radix UI + assistant-ui/react
- **デプロイ**: SST (AWS) + Cloudflare