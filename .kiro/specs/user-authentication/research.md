# Research & Design Decisions: user-authentication

---
**Purpose**: 既存のbetter-auth実装を分析し、設計書作成のための技術調査結果を記録する。

**Usage**:
- 既存実装の構造とパターンを文書化
- 技術選択の妥当性を確認
- 設計書作成のための参照情報を整理
---

## Summary
- **Feature**: `user-authentication`
- **Discovery Scope**: Extension (既存実装のドキュメント化)
- **Key Findings**:
  - better-authフレームワークで全認証方式を実装済み
  - Drizzle ORM + SQLiteで完全なデータ永続化
  - @daveyplate/better-auth-uiによる認証UI統合
  - セキュリティベストプラクティスを遵守

## Research Log

### better-auth フレームワークの選択理由
- **Context**: 包括的な認証システムの実装に使用されているフレームワークの妥当性確認
- **Sources Consulted**:
  - 既存コード `api/auth/index.ts`
  - 既存コード `api/middleware/auth.ts`
- **Findings**:
  - **プラグインエコシステム**: 6種類の認証方式を簡単に統合
    - メール/パスワード、Discord OAuth、Magic Link、Passkey、Device Authorization、Bearer Token
  - **React統合**: `reactStartCookies()`プラグインでTanStack Startとのシームレスな統合
  - **型安全性**: TypeScript firstの設計で型定義が充実
  - **Drizzle ORM統合**: `drizzleAdapter`でデータベース永続化を実装
- **Implications**:
  - 追加の認証方式も簡単に統合可能
  - 既存実装は保守性が高く、拡張性も確保されている

### セッション管理の設定
- **Context**: セッション有効期限とキャッシュ戦略の妥当性確認
- **Sources Consulted**: `api/auth/index.ts` session設定
- **Findings**:
  - **有効期限**: 7日間 (`60 * 60 * 24 * 7`)
    - 一般的なWebアプリケーションの標準的な期間
    - ユーザー体験と セキュリティのバランス
  - **更新戦略**: 24時間ごとに自動更新 (`updateAge: 60 * 60 * 24`)
    - アクティブユーザーのセッション延長
    - セキュリティリスクの最小化
  - **キャッシュ**: 15分間 (`cookieCache.maxAge: 15 * 60`)
    - データベースクエリの削減
    - レスポンス速度の向上
- **Implications**:
  - パフォーマンスとセキュリティのバランスが適切
  - 将来的な調整も設定変更のみで対応可能

### メール送信: Resendの統合
- **Context**: メール検証とMagic Link送信の実装確認
- **Sources Consulted**:
  - `api/middleware/auth.ts` - Resend統合
  - `api/auth/index.ts` - emailVerification, magicLink設定
- **Findings**:
  - **Resend**: モダンなメール送信サービス
    - シンプルなAPI
    - React Emailコンポーネントのサポート
    - 高い到達率
  - **EmailTemplate**: `@daveyplate/better-auth-ui/server`
    - better-auth専用のメールテンプレート
    - 一貫性のあるUI/UX
- **Implications**:
  - メール送信の信頼性と保守性が高い
  - テンプレートカスタマイズも容易

### データベーススキーマ設計
- **Context**: better-authで必要なテーブル構造の確認
- **Sources Consulted**: `api/db/schema.ts`
- **Findings**:
  - **6つのテーブル**: users, sessions, accounts, verifications, deviceCodes, passkeys
  - **インデックス戦略**:
    - `sessions_user_id_idx`: ユーザーごとのセッション取得を高速化
    - `sessions_expires_at_idx`: 期限切れセッションのクリーンアップ用
    - `accounts_provider_account_idx`: OAuth認証の高速検索
    - `accounts_user_id_idx`: ユーザーのアカウント関連付け用
    - `device_codes_user_id_idx`: デバイス認証の参照用
  - **リレーション**:
    - `sessions.userId → users.id` (cascade delete)
    - `accounts.userId → users.id` (cascade delete)
    - `deviceCodes.userId → users.id` (cascade delete)
    - `passkeys.userId → users.id` (cascade delete)
- **Implications**:
  - パフォーマンスを考慮した適切なインデックス設計
  - データ整合性が保たれるカスケード削除
  - 将来的なスケーラビリティも考慮されている

### 認証UIの選択: @daveyplate/better-auth-ui
- **Context**: フロントエンド認証UIの実装確認
- **Sources Consulted**:
  - `src/routes/auth/$authView.tsx`
  - `src/components/layout/auth.tsx`
- **Findings**:
  - **AuthView**: ルーティングベースの認証UI
    - サインイン、サインアップ、パスワードリセット、コールバックなど
    - better-authの全機能をサポート
  - **AuthLayout**: 保護ルート用ラッパーコンポーネント
    - `SignedIn`, `SignedOut`, `AuthLoading`による状態管理
    - `RedirectToSignIn`で未認証時のリダイレクト
- **Implications**:
  - 統一された認証UI/UX
  - better-authとの完全な統合
  - カスタマイズも容易

### 保護ルートの実装パターン
- **Context**: 認証が必要なページのアクセス制御確認
- **Sources Consulted**:
  - `src/routes/index.tsx` (メインチャット)
  - `src/routes/knowledges/index.tsx` (知識管理)
  - `src/routes/account/settings.tsx` (設定)
- **Findings**:
  - **パターン**: `AuthLayout`でラップ
    ```tsx
    <AuthLayout>
      {(user) => <YourPage userId={user.id} />}
    </AuthLayout>
    ```
  - **メリット**:
    - 宣言的で理解しやすい
    - ユーザー情報への型安全なアクセス
    - 一貫性のある実装
- **Implications**:
  - 新しい保護ルートの追加が容易
  - セキュリティの実装漏れを防止

## Architecture Pattern Evaluation

既存実装は以下のアーキテクチャパターンに従っている:

| パターン | 説明 | 実装箇所 | メリット | 考慮事項 |
|---------|------|---------|---------|----------|
| **レイヤードアーキテクチャ** | フロントエンド(React) / バックエンド(Hono) / データ(Drizzle ORM) | プロジェクト全体 | 関心の分離、テストしやすさ | ステアリングコンテキストに準拠 |
| **プラグインアーキテクチャ** | better-authプラグインで機能拡張 | `api/auth/index.ts` | 柔軟性、疎結合 | プラグイン間の依存関係管理が不要 |
| **ミドルウェアパターン** | Hono認証ミドルウェア | `api/middleware/auth.ts` | 横断的関心事の分離 | TanStack Startとの統合が明確 |
| **コンポーネントラッパー** | AuthLayoutによる保護ルート | `src/components/layout/auth.tsx` | 宣言的、再利用可能 | Reactの推奨パターン |

## Design Decisions

### Decision: better-authフレームワークの採用
- **Context**: 複数の認証方式をサポートする包括的な認証システムが必要
- **Alternatives Considered**:
  1. NextAuth.js — Next.js特化型
  2. Lucia Auth — 軽量ライブラリ
  3. 自作実装 — 完全カスタマイズ可能
- **Selected Approach**: better-auth + プラグインエコシステム
- **Rationale**:
  - TanStack Startとの統合が容易 (`reactStartCookies` plugin)
  - 6種類の認証方式を標準サポート
  - TypeScript型安全性
  - Drizzle ORM統合
- **Trade-offs**:
  - **メリット**: 高速な実装、保守性、拡張性
  - **デメリット**: フレームワーク依存、カスタマイズの制約
- **Follow-up**: 特になし (実装済み、動作確認済み)

### Decision: Drizzle ORM + SQLiteの選択
- **Context**: 認証データの永続化が必要
- **Alternatives Considered**:
  1. Prisma ORM — 高機能
  2. TypeORM — エンタープライズ向け
  3. Kysely — 型安全なクエリビルダー
- **Selected Approach**: Drizzle ORM + SQLite (LibSQL/Turso)
- **Rationale**:
  - ステアリングコンテキストのtech.mdに準拠
  - 型安全性が高い
  - SQLite互換でローカル開発が容易
  - Tursoでグローバル展開可能
- **Trade-offs**:
  - **メリット**: 開発体験、型安全性、スケーラビリティ
  - **デメリット**: ORM学習コスト
- **Follow-up**: 特になし (既存パターンを踏襲)

### Decision: Resendによるメール送信
- **Context**: メール検証とMagic Linkの送信が必要
- **Alternatives Considered**:
  1. SendGrid — 老舗
  2. AWS SES — 低コスト
  3. Mailgun — API重視
- **Selected Approach**: Resend
- **Rationale**:
  - モダンなAPI設計
  - React Emailコンポーネントのサポート
  - 高い到達率
  - シンプルな価格体系
- **Trade-offs**:
  - **メリット**: 開発者体験、信頼性
  - **デメリット**: 他サービスと比較してエコシステムは小さめ
- **Follow-up**: 特になし (実装済み、動作確認済み)

### Decision: @daveyplate/better-auth-ui の採用
- **Context**: 認証UI実装が必要
- **Alternatives Considered**:
  1. 自作UI — 完全カスタマイズ
  2. Headless UI — 柔軟性
  3. サードパーティUI — 高機能
- **Selected Approach**: @daveyplate/better-auth-ui
- **Rationale**:
  - better-authとの完全統合
  - すぐに使えるコンポーネント
  - アクセシブルで応答性の高いUI
  - カスタマイズも可能
- **Trade-offs**:
  - **メリット**: 実装速度、一貫性
  - **デメリット**: デザインの自由度は制約される
- **Follow-up**: 特になし (実装済み、動作確認済み)

## Risks & Mitigations

すべての要件が実装済みのため、実装リスクはゼロ。以下は運用上の考慮事項:

- **セッション期限切れ処理** — ユーザー体験の確認、必要に応じて期限延長
- **メール到達率の監視** — Resendのダッシュボードで到達率を定期確認
- **データベースパフォーマンス** — セッション数増加時のインデックス最適化
- **外部依存関係の更新** — better-auth、Resendの定期アップデート

## References
- [better-auth公式ドキュメント](https://better-auth.com) — 認証フレームワークの詳細
- [Drizzle ORM公式ドキュメント](https://orm.drizzle.team) — ORM使用方法
- [Resend公式ドキュメント](https://resend.com/docs) — メール送信API
- [@daveyplate/better-auth-ui](https://github.com/daveyplate/better-auth-ui) — 認証UIライブラリ
- 内部ドキュメント: `.kiro/steering/tech.md` — 技術スタック標準
- 内部ドキュメント: `.kiro/steering/structure.md` — プロジェクト構造規約
