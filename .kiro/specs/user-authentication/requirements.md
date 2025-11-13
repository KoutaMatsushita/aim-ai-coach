# Requirements Document

## Project Description (Input)
ユーザー認証システム:
  better-authベースの包括的な認証機能。メール/パスワード認証、Discord OAuth、Magic
  Link、Passkey (WebAuthn)、Device Authorization、Bearer Token認証をサポート。Drizzle ORM +
  SQLiteでユーザー、セッション、アカウント、検証データを管理。Resendによるメール検証。セッション有効期限7日間、キャッシュ15分。保護ルートはAuthLayoutコンポーネントでラップし未認証時はサインインページへリダイレクト。認証UIは@daveyplate/better-auth-uiを使用。

## Introduction
本要件定義は、Aim AI Coach アプリケーションにおけるユーザー認証システムの実装要件を定義する。better-authフレームワークをベースとし、複数の認証方式をサポートする包括的な認証基盤を構築する。

## Requirements

### Requirement 1: メール/パスワード認証
**Objective:** ユーザーとして、メールアドレスとパスワードでアカウントを作成・ログインできるようにすることで、安全なアクセス管理を実現する

#### Acceptance Criteria
1. When ユーザーがサインアップフォームを送信する, the 認証システム shall メールアドレスとパスワードでユーザーアカウントを作成する
2. When ユーザーがサインアップを完了する, the 認証システム shall 検証用メールを送信する
3. When ユーザーがメール検証リンクをクリックする, the 認証システム shall メールアドレスを検証済みとしてマークする
4. When ユーザーがログインフォームを送信する, the 認証システム shall メールアドレスとパスワードを検証し、セッションを作成する
5. If メールアドレスが未検証の場合, then the 認証システム shall ログインを拒否し、検証が必要である旨を通知する
6. If パスワードが不正な場合, then the 認証システム shall ログインを拒否し、エラーメッセージを表示する
7. The 認証システム shall パスワードをハッシュ化して保存する

### Requirement 2: Discord OAuth認証
**Objective:** ユーザーとして、Discordアカウントで簡単にログインできるようにすることで、ユーザー登録の障壁を下げる

#### Acceptance Criteria
1. When ユーザーがDiscordログインボタンをクリックする, the 認証システム shall Discord OAuth認証フローを開始する
2. When ユーザーがDiscordで認証を完了する, the 認証システム shall アカウント情報を取得し、ユーザーアカウントを作成または関連付ける
3. When Discord認証が成功する, the 認証システム shall セッションを作成し、ユーザーをアプリケーションにリダイレクトする
4. If Discord認証が失敗する, then the 認証システム shall エラーメッセージを表示し、認証ページに戻す
5. The 認証システム shall Discordのアクセストークンとリフレッシュトークンを安全に保存する

### Requirement 3: Magic Link認証
**Objective:** ユーザーとして、パスワードなしでメールリンクからログインできるようにすることで、パスワード管理の負担を軽減する

#### Acceptance Criteria
1. When ユーザーがMagic Linkリクエストフォームにメールアドレスを入力する, the 認証システム shall ワンタイムログインリンクを含むメールを送信する
2. When ユーザーがMagic Linkをクリックする, the 認証システム shall トークンを検証し、セッションを作成する
3. If Magic Linkが有効期限切れの場合, then the 認証システム shall エラーメッセージを表示し、新しいリンクの送信を促す
4. If Magic Linkトークンが無効な場合, then the 認証システム shall ログインを拒否し、エラーメッセージを表示する
5. The 認証システム shall Magic Linkトークンを1回限りの使用に制限する

### Requirement 4: Passkey (WebAuthn) 認証
**Objective:** ユーザーとして、生体認証やセキュリティキーでログインできるようにすることで、最高レベルのセキュリティと利便性を提供する

#### Acceptance Criteria
1. When ユーザーがPasskey登録を開始する, the 認証システム shall WebAuthn登録チャレンジを生成する
2. When ユーザーがPasskey登録を完了する, the 認証システム shall Passkeyクレデンシャルをユーザーアカウントに関連付ける
3. When ユーザーがPasskeyログインを試みる, the 認証システム shall WebAuthn認証チャレンジを生成する
4. When ユーザーがPasskey認証を完了する, the 認証システム shall セッションを作成する
5. If Passkey認証が失敗する, then the 認証システム shall エラーメッセージを表示し、代替認証方法を提示する
6. The 認証システム shall 複数のPasskeyを1つのアカウントに関連付けることをサポートする

### Requirement 5: Device Authorization
**Objective:** ユーザーとして、デバイスコードを使用してTVやIoTデバイスからログインできるようにすることで、キーボード入力が困難なデバイスでもアクセスを可能にする

#### Acceptance Criteria
1. When ユーザーがデバイスコードをリクエストする, the 認証システム shall デバイスコードとユーザーコードを生成する
2. When ユーザーがユーザーコードを入力する, the 認証システム shall デバイスの認証を承認する
3. When デバイスがポーリングでトークンをリクエストする, the 認証システム shall 承認状態を確認し、承認済みの場合はアクセストークンを返す
4. If デバイスコードが有効期限切れの場合, then the 認証システム shall エラーを返し、新しいコードの取得を促す
5. The 認証システム shall デバイスコードの有効期限を3ヶ月とする
6. The 認証システム shall デバイスのポーリング間隔を5秒とする

### Requirement 6: Bearer Token認証
**Objective:** APIクライアントとして、Bearer Tokenを使用してAPIにアクセスできるようにすることで、プログラマティックなアクセスを可能にする

#### Acceptance Criteria
1. When APIクライアントがトークンをリクエストする, the 認証システム shall 有効なBearer Tokenを生成する
2. When APIクライアントがBearer Tokenを使用してAPIにアクセスする, the 認証システム shall トークンを検証し、アクセスを許可する
3. If Bearer Tokenが無効または期限切れの場合, then the 認証システム shall 401エラーを返す
4. The 認証システム shall Bearer Tokenをリクエストヘッダー `Authorization: Bearer <token>` から抽出する

### Requirement 7: セッション管理
**Objective:** システムとして、セキュアで効率的なセッション管理を実現することで、ユーザーの認証状態を安全に維持する

#### Acceptance Criteria
1. When ユーザーが認証に成功する, the 認証システム shall セッションを作成し、セッショントークンを発行する
2. The 認証システム shall セッションの有効期限を7日間とする
3. The 認証システム shall セッションを15分間キャッシュする
4. When ユーザーがアクティブな場合, the 認証システム shall セッションの有効期限を24時間ごとに更新する
5. When セッションが期限切れになる, the 認証システム shall セッションを無効化し、ユーザーに再認証を要求する
6. When ユーザーがログアウトする, the 認証システム shall セッションを削除する
7. The 認証システム shall セッション情報をIPアドレスとUser-Agentと共に記録する

### Requirement 8: メール検証
**Objective:** システムとして、ユーザーのメールアドレスを検証することで、有効なユーザーのみがアカウントを作成できるようにする

#### Acceptance Criteria
1. When ユーザーがサインアップする, the 認証システム shall Resendを使用して検証メールを送信する
2. When ユーザーがメール検証リンクをクリックする, the 認証システム shall メールアドレスを検証済みとしてマークする
3. When メール検証が完了する, the 認証システム shall ユーザーを自動的にログインさせる
4. If 検証メールが届かない場合, then the 認証システム shall 検証メールの再送信を可能にする
5. The 認証システム shall 検証トークンの有効期限を設定する

### Requirement 9: 保護ルート
**Objective:** システムとして、認証が必要なページへのアクセスを制御することで、セキュリティを確保する

#### Acceptance Criteria
1. When 未認証ユーザーが保護ルートにアクセスする, the 認証システム shall ユーザーをサインインページにリダイレクトする
2. When 認証済みユーザーが保護ルートにアクセスする, the 認証システム shall ページへのアクセスを許可する
3. The 認証システム shall AuthLayoutコンポーネントで保護ルートをラップする
4. While ユーザーのセッション状態を読み込み中の場合, the 認証システム shall ローディングインジケーターを表示する

### Requirement 10: 認証UI
**Objective:** ユーザーとして、直感的で使いやすい認証UIを利用できるようにすることで、認証体験を向上させる

#### Acceptance Criteria
1. The 認証システム shall @daveyplate/better-auth-uiコンポーネントを使用して認証UIを提供する
2. The 認証システム shall サインイン、サインアップ、パスワードリセット、メール検証のUIを提供する
3. The 認証システム shall 各認証方式に対応したUIコンポーネントを表示する
4. When ユーザーが認証UIを操作する, the 認証システム shall リアルタイムでバリデーションフィードバックを提供する
5. The 認証システム shall アクセシブルで応答性の高いUIを提供する

### Requirement 11: データ永続化
**Objective:** システムとして、ユーザー、セッション、アカウント情報を安全に保存することで、認証状態を永続化する

#### Acceptance Criteria
1. The 認証システム shall Drizzle ORMとSQLiteを使用してデータを管理する
2. The 認証システム shall usersテーブルにユーザー情報を保存する
3. The 認証システム shall sessionsテーブルにセッション情報を保存する
4. The 認証システム shall accountsテーブルにOAuth/パスワード情報を保存する
5. The 認証システム shall verificationsテーブルにメール検証トークンを保存する
6. The 認証システム shall passkeysテーブルにWebAuthn認証情報を保存する
7. The 認証システム shall deviceCodesテーブルにデバイス認証コードを保存する
8. The 認証システム shall 適切なインデックスを設定してクエリパフォーマンスを最適化する

### Requirement 12: セキュリティ
**Objective:** システムとして、基本的なセキュリティベストプラクティスに従うことで、ユーザーデータを保護する

#### Acceptance Criteria
1. The 認証システム shall パスワードをbcryptまたはargon2でハッシュ化する
2. The 認証システム shall HTTPS接続を必須とする
3. The 認証システム shall セキュアなCookie設定(httpOnly, secure, sameSite)を使用する
4. The 認証システム shall 信頼されたオリジンからのリクエストのみを受け入れる
5. The 認証システム shall 環境変数で秘密鍵を管理する

