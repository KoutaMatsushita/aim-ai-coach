# Implementation Tasks: user-authentication

## Context

本機能は**既存実装のドキュメント化**を目的としており、gap-analysis.mdで100%実装済みと確認されています。したがって、新規実装タスクは存在せず、以下のタスクは既存実装の動作検証と受け入れテストに焦点を当てています。

## Task List

### 1. 既存認証システムの動作検証

- [ ] 1.1 (P) メール/パスワード認証の動作確認
  - サインアップフローの実行（メールアドレス、パスワード入力）
  - 検証メール送信の確認（Resend経由）
  - メール検証リンクのクリックとアカウント有効化
  - ログインフローの実行と保護ルートへのアクセス
  - 未検証ユーザーのログイン拒否を確認
  - パスワードハッシュ化の確認（データベース内で平文でないことを検証）
  - _Requirements: 1, 8_

- [ ] 1.2 (P) Discord OAuth認証の動作確認
  - Discordログインボタンからの認証フロー実行
  - Discord認証後のコールバック処理とアカウント作成/関連付け
  - セッション作成とアプリケーションへのリダイレクト
  - Discord OAuthトークン保存の確認（accounts テーブル）
  - _Requirements: 2_

- [ ] 1.3 (P) Magic Link認証の動作確認
  - Magic Linkリクエストフォームへのメールアドレス入力
  - Magic Linkメール送信の確認（Resend経由）
  - Magic Linkクリックによるログイン
  - トークンの1回限り使用を確認（再利用不可）
  - _Requirements: 3_

- [ ] 1.4 (P) Passkey (WebAuthn) 認証の動作確認
  - Passkey登録フローの実行（WebAuthn APIの呼び出し）
  - 生体認証またはセキュリティキーでの認証
  - Passkey情報のデータベース保存確認（passkeys テーブル）
  - Passkeyログインフローの実行
  - 複数Passkeyの登録と使用を確認
  - _Requirements: 4_

- [ ] 1.5 (P) Device Authorization フローの動作確認
  - デバイスコードリクエストの実行
  - ユーザーコード入力とデバイス承認
  - ポーリング処理の確認（5秒間隔）
  - アクセストークン取得の確認
  - デバイスコード有効期限（3ヶ月）の設定確認
  - _Requirements: 5_

- [ ] 1.6 (P) Bearer Token認証の動作確認
  - Bearer Tokenの生成リクエスト
  - `Authorization: Bearer <token>` ヘッダーでのAPI呼び出し
  - トークン検証とアクセス許可
  - 無効トークンでの401エラー確認
  - _Requirements: 6_

### 2. セッション管理の検証

- [ ] 2.1 セッション有効期限と更新の確認
  - セッション作成後の7日間有効期限確認（sessions.expiresAt）
  - 24時間ごとのセッション更新動作確認（updateAge設定）
  - セッションキャッシュ（15分）の動作確認
  - セッション期限切れ後の再認証要求確認
  - _Requirements: 7_

- [ ] 2.2 セッション情報の記録確認
  - IPアドレスとUser-Agentの記録確認（sessions テーブル）
  - セッショントークンのランダム生成確認
  - HTTPOnlyクッキーでのトークン保護確認
  - _Requirements: 7_

### 3. 保護ルートのアクセス制御検証

- [ ] 3.1 AuthLayoutコンポーネントの動作確認
  - 未認証ユーザーの保護ルートアクセス時のリダイレクト確認（/auth/sign-in）
  - 認証済みユーザーのページアクセス許可確認
  - ローディング状態の表示確認
  - _Requirements: 9_

- [ ] 3.2 既存保護ルートの動作確認
  - メインチャットページ（src/routes/index.tsx）のアクセス制御
  - 知識管理ページ（src/routes/knowledges/index.tsx）のアクセス制御
  - アカウント設定ページ（src/routes/account/settings.tsx）のアクセス制御
  - _Requirements: 9_

### 4. セキュリティ設定の検証

- [ ] 4.1 (P) パスワードセキュリティの確認
  - パスワードハッシュ化の確認（bcrypt/argon2）
  - パスワード平文での保存がないことを確認
  - _Requirements: 12_

- [ ] 4.2 (P) Cookie設定の確認
  - httpOnly属性の確認（JavaScriptからのアクセス防止）
  - secure属性の確認（本番環境でのHTTPS必須）
  - sameSite属性の確認（'lax'設定）
  - _Requirements: 12_

- [ ] 4.3 (P) 信頼オリジンとHTTPS設定の確認
  - trustedOrigins設定の確認（api/auth/index.ts）
  - 本番環境でのHTTPS強制確認（baseURL設定）
  - _Requirements: 12_

- [ ] 4.4 (P) 環境変数管理の確認
  - T3 Envによる型安全な環境変数管理確認（api/env.ts）
  - .envファイルの.gitignore登録確認
  - BETTER_AUTH_SECRET、DISCORD_CLIENT_SECRET等の秘密鍵確認
  - _Requirements: 12_

### 5. データ永続化の検証

- [ ] 5.1 データベーススキーマの確認
  - 6テーブル（users, sessions, accounts, verifications, deviceCodes, passkeys）の存在確認
  - 外部キー制約とカスケード削除の確認
  - インデックス設定の確認（sessions_user_id_idx, sessions_expires_at_idx等）
  - _Requirements: 11_

- [ ] 5.2 データ整合性の確認
  - ユーザー削除時の関連データカスケード削除確認
  - セッション、アカウント、Passkey、デバイスコードの連動削除
  - _Requirements: 11_

### 6. 認証UI の検証

- [ ] 6.1 (P) AuthView コンポーネントの確認
  - サインイン、サインアップ、パスワードリセットUIの表示確認
  - 各認証方式のUIコンポーネント表示確認
  - リアルタイムバリデーションフィードバックの確認
  - _Requirements: 10_

- [ ] 6.2 (P) UI のアクセシビリティと応答性確認
  - アクセシブルなUI（ARIA属性、キーボードナビゲーション）の確認
  - レスポンシブデザインの確認（モバイル、タブレット、デスクトップ）
  - _Requirements: 10_

### 7. 統合テストと受け入れテスト

- [ ] 7.1 エンドツーエンド認証フローのテスト
  - サインアップ → メール検証 → ログイン → 保護ルートアクセスの完全フロー
  - Discord OAuth → ログイン → 保護ルートアクセスの完全フロー
  - Magic Link → ログイン → 保護ルートアクセスの完全フロー
  - _Requirements: 1, 2, 3, 9_

- [ ] 7.2 エラーハンドリングの確認
  - 無効なメールアドレスでの400エラー確認
  - パスワード不正での401エラー確認
  - メール未検証での403エラー確認
  - メールアドレス重複での409エラー確認
  - _Requirements: 1, 8_

- [ ] 7.3 パフォーマンステスト
  - セッション読み込み速度の確認（< 100ms、キャッシュ有効時）
  - 認証API応答速度の確認（< 500ms）
  - データベースクエリパフォーマンスの確認（インデックス使用時 < 50ms）
  - _Requirements: 7, 11_

## Requirements Coverage Summary

すべての12要件がタスクでカバーされています:

- **要件1（メール/パスワード認証）**: タスク 1.1, 7.1, 7.2
- **要件2（Discord OAuth）**: タスク 1.2, 7.1
- **要件3（Magic Link）**: タスク 1.3, 7.1
- **要件4（Passkey）**: タスク 1.4
- **要件5（Device Authorization）**: タスク 1.5
- **要件6（Bearer Token）**: タスク 1.6
- **要件7（セッション管理）**: タスク 2.1, 2.2, 7.3
- **要件8（メール検証）**: タスク 1.1, 7.2
- **要件9（保護ルート）**: タスク 3.1, 3.2, 7.1
- **要件10（認証UI）**: タスク 6.1, 6.2
- **要件11（データ永続化）**: タスク 5.1, 5.2, 7.3
- **要件12（セキュリティ）**: タスク 4.1, 4.2, 4.3, 4.4

## Task Statistics

- **Major Tasks**: 7
- **Sub-tasks**: 21
- **Parallel-capable tasks**: 12 (タスク 1.1-1.6, 4.1-4.4, 6.1-6.2)
- **Average task size**: 1-2時間/サブタスク

## Notes

- すべてのタスクは既存実装の検証・テストに焦点を当てています
- 新規実装は不要（gap-analysis.mdで100%実装済みと確認）
- 並列実行可能なタスク（(P)マーク）は独立して実行可能
- テストはE2Eテストツール（Playwright等）を使用することを推奨
