# Requirements Document

## Project Description (Input)
Aim AI Coach CLIツール:
  Windowsローカル環境で動作するスコア収集CLIツール。Aim
  LabsのSQLiteデータベース(.bytes)とKovaak'sのCSVファイルをパースし、better-authのDevice
  Authorization Flowで認証してサーバーへアップロードする。Commander.jsベースのCLIインターフェー
  ス、Bunランタイム、増分アップロード対応（処理済みファイル追跡）、チャンク単位バッチアップロー
  ド（100件）、構造化ログ機能を持つ。

## Introduction
本要件定義は、Aim AI Coach アプリケーションのデータ収集を支援するCLIツールの要件を定義する。本ツールはWindowsローカル環境で動作し、Aim LabsとKovaak'sのプレイデータをパースしてサーバーへアップロードする役割を担う。Device Authorization Flowによる認証、増分アップロードによる重複防止、構造化ログによる可視性の高い運用を実現する。

## Requirements

### Requirement 1: Device Authorization Flow認証
**Objective:** CLIユーザーとして、パスワード入力なしでセキュアにサーバーへ認証したい。これにより、デバイス認証フローを使った安全で使いやすいCLI認証体験を提供する

#### Acceptance Criteria
1. When ユーザーがloginコマンドを実行する, the CLIツール shall better-authのDevice Authorization Flowを開始する
2. When Device Authorization Flowが開始される, the CLIツール shall デバイスコードとユーザーコードを取得する
3. When デバイスコードが取得される, the CLIツール shall 検証用URLをデフォルトブラウザで自動的に開く
4. When ユーザーがブラウザで認証を承認する, the CLIツール shall ポーリング処理により5秒間隔でトークン取得を試行する
5. When トークンが正常に取得される, the CLIツール shall アクセストークンとリフレッシュトークンをローカル設定ファイルに保存する
6. If 認証が拒否される, then the CLIツール shall エラーメッセージを表示し、処理を終了する
7. If トークンの有効期限が切れている, then the CLIツール shall エラーメッセージを表示し、再認証を促す
8. The CLIツール shall 保存されたトークンを使用してAPIリクエストのAuthorizationヘッダーにBearer認証を設定する

### Requirement 2: Aim Labs データパース
**Objective:** CLIユーザーとして、Aim Labsのローカルデータベース(.bytes)を自動的に読み取りたい。これにより、手動でのデータエクスポート作業を省略し、データ収集を効率化する

#### Acceptance Criteria
1. When ユーザーがaimlabコマンドを実行する, the CLIツール shall 指定されたパスから.bytesファイルを検索する
2. If .bytesファイルが見つからない, then the CLIツール shall エラーメッセージを表示し、処理を終了する
3. When .bytesファイルが見つかる, the CLIツール shall SQLiteクライアントで読み取り専用モードでデータベースを開く
4. When データベースが開かれる, the CLIツール shall taskDataテーブルからタスクレコードを抽出する
5. When タスクレコードが抽出される, the CLIツール shall 各レコードにユーザーIDを付与する
6. The CLIツール shall パース処理中にエラーが発生した場合は詳細なエラーログを出力する
7. When パース処理が完了する, the CLIツール shall データベース接続を安全に閉じる

### Requirement 3: Kovaak's データパース
**Objective:** CLIユーザーとして、Kovaak'sのCSVスコアファイルを自動的に読み取りたい。これにより、手動でのデータ整理作業を省略し、正確なデータ収集を実現する

#### Acceptance Criteria
1. When ユーザーがkovaaksコマンドを実行する, the CLIツール shall 指定されたディレクトリ内の全CSVファイルをスキャンする
2. When CSVファイルがスキャンされる, the CLIツール shall ファイル名から正規表現でシナリオ名、モード、実行日時を抽出する
3. If ファイル名が正規表現パターンに一致しない, then the CLIツール shall 警告ログを出力し、そのファイルをスキップする
4. When CSVファイルが読み込まれる, the CLIツール shall ヘッダー行と列数を検証する
5. If CSVの列数が不一致の行がある, then the CLIツール shall その行をスキップし、デバッグログを出力する
6. When CSVデータがパースされる, the CLIツール shall 各行のスコア情報（Accuracy, Hits, Shots, TTKなど）を安全にパースする
7. If パース中に数値変換エラーが発生する, then the CLIツール shall デフォルト値（0）を使用し、ログに記録する
8. The CLIツール shall パースされたデータにメタ情報（シナリオ名、モード、実行日時、ソースファイル名）を付与する
9. When データパースが完了する, the CLIツール shall 全レコードにユーザーIDを付与する

### Requirement 4: 増分アップロード（処理済み追跡）
**Objective:** CLIユーザーとして、既にアップロード済みのデータを重複してアップロードしたくない。これにより、サーバー側のデータ重複を防止し、アップロード時間を短縮する

#### Acceptance Criteria
1. When CLIツールが初回実行される, the CLIツール shall ローカルデータベースを作成し、処理済みファイル追跡テーブルを初期化する
2. When Aim Labsデータをアップロードする前に, the CLIツール shall ローカルデータベースから処理済みタスクIDのリストを取得する
3. When 処理済みタスクIDリストが取得される, the CLIツール shall 新しいタスクのみをフィルタリングする
4. When Kovaak'sデータをアップロードする前に, the CLIツール shall 各CSVファイルのハッシュ値を計算する
5. When ファイルハッシュが計算される, the CLIツール shall ローカルデータベースでファイル名とハッシュ値の組み合わせをチェックする
6. If ファイルが既に処理済みの場合, then the CLIツール shall そのファイルをスキップし、デバッグログを出力する
7. When アップロードが成功する, the CLIツール shall 処理済みファイル情報をローカルデータベースに保存する
8. The CLIツール shall 処理済み情報の保存時に競合が発生した場合は、既存レコードを保持する（onConflictDoNothing）

### Requirement 5: バッチアップロード
**Objective:** CLIユーザーとして、大量のデータを効率的にアップロードしたい。これにより、ネットワーク効率を最大化し、タイムアウトを回避する

#### Acceptance Criteria
1. When アップロード対象データが100件を超える, the CLIツール shall データを100件ごとのチャンクに分割する
2. When チャンクが作成される, the CLIツール shall 各チャンクを順次アップロードする
3. When チャンクをアップロードする, the CLIツール shall POSTリクエストでJSON形式のデータを送信する
4. When チャンクアップロードが成功する, the CLIツール shall アップロード進捗（X/Y chunks）をログに記録する
5. If チャンクアップロードが失敗する, then the CLIツール shall エラーログを出力し、処理を中断する
6. If アップロードレスポンスが200 OKでない, then the CLIツール shall レスポンスボディをエラーログに含めて出力する
7. The CLIツール shall 全チャンクのアップロードが完了した後に、成功したタスク数とチャンク数をログに記録する

### Requirement 6: 構造化ログ
**Objective:** CLIユーザーとして、処理の進捗状況と問題を明確に把握したい。これにより、トラブルシューティングと運用の可視性を向上させる

#### Acceptance Criteria
1. When CLIツールが処理を開始する, the CLIツール shall 処理開始ログ（処理種別、パス、ユーザーID）を出力する
2. When ファイルが検出される, the CLIツール shall 検出ファイル情報ログ（ファイルパス、ファイル数）を出力する
3. When データパースが進行する, the CLIツール shall 進捗ログ（処理済み/総数）を出力する
4. When アップロードが進行する, the CLIツール shall アップロード進捗ログ（チャンク数、レコード数）を出力する
5. When 処理が正常完了する, the CLIツール shall 完了サマリーログ（処理件数、所要時間）を出力する
6. If エラーが発生する, then the CLIツール shall エラーレベルログ（エラー詳細、スタックトレース）を出力する
7. If 警告事象が発生する, then the CLIツール shall 警告ログ（警告内容、対象ファイル）を出力する
8. The CLIツール shall デバッグモードが有効な場合、詳細なデバッグログを出力する
9. The CLIツール shall 全ログを構造化形式（JSON）で出力し、検索とフィルタリングを容易にする

### Requirement 7: Commander.js CLIインターフェース
**Objective:** CLIユーザーとして、直感的なコマンドラインインターフェースでツールを操作したい。これにより、学習コストを下げ、使いやすさを向上させる

#### Acceptance Criteria
1. When CLIツールが実行される, the CLIツール shall Commander.jsでコマンドとオプションをパースする
2. The CLIツール shall loginコマンド（認証のみ実行）を提供する
3. The CLIツール shall aimlabコマンド（引数: データパス、オプション: --endpoint）を提供する
4. The CLIツール shall kovaaksコマンド（引数: データパス、オプション: --endpoint）を提供する
5. The CLIツール shall seedコマンド（シードデータ適用）を提供する
6. When --endpointオプションが指定される, the CLIツール shall カスタムエンドポイントURLを使用する
7. If --endpointオプションが省略される, then the CLIツール shall デフォルトエンドポイント（https://aim-ai-coach.mk2481.dev）を使用する
8. When ヘルプオプション（--help）が指定される, the CLIツール shall 利用可能なコマンドとオプションの説明を表示する
9. When バージョンオプション（--version）が指定される, the CLIツール shall CLIツールのバージョン番号を表示する
10. The CLIツール shall 各コマンド実行前にセッション有効性を確認し、必要に応じてログインを促す

### Requirement 8: エラーハンドリング
**Objective:** CLIユーザーとして、エラー発生時に明確な原因と対処法を知りたい。これにより、問題解決を迅速化し、ユーザー体験を向上させる

#### Acceptance Criteria
1. If .bytesファイルが見つからない, then the CLIツール shall "No .bytes file found in the specified path" というエラーメッセージを表示する
2. If CSVファイルが空の場合, then the CLIツール shall 警告ログを出力し、そのファイルをスキップする
3. If CSVヘッダーが不正な場合, then the CLIツール shall 警告ログを出力し、そのファイルをスキップする
4. If ネットワークエラーが発生する, then the CLIツール shall エラーログに詳細情報を含め、処理を中断する
5. If 認証トークンが無効の場合, then the CLIツール shall 再認証を促すエラーメッセージを表示する
6. If ファイルパース中にエラーが発生する, then the CLIツール shall エラーログを出力し、スタックトレースを記録する
7. If APIレスポンスが4xx/5xxエラーの場合, then the CLIツール shall レスポンスボディをログに含めて出力する
8. The CLIツール shall すべての例外をキャッチし、適切なエラーメッセージとログを出力する
9. The CLIツール shall エラー発生時にゼロでない終了コードを返す

### Requirement 9: Bunランタイム互換性
**Objective:** 開発者として、BunランタイムでCLIツールを効率的に実行したい。これにより、高速な起動時間とシンプルな依存関係管理を実現する

#### Acceptance Criteria
1. The CLIツール shall Bunランタイムで実行可能なエントリポイント（shebang: `#!/usr/bin/env bun`）を持つ
2. The CLIツール shall Bun標準APIを使用してファイル操作を実行する（`Bun.file()`, `Bun.sleep()`）
3. The CLIツール shall Bunの高速なSQLiteクライアント（`bun:sqlite`）を使用する
4. The CLIツール shall TypeScriptを直接実行可能にする（トランスパイル不要）
5. The CLIツール shall 依存関係をbunパッケージマネージャーで管理する
6. The CLIツール shall Node.js互換性を保ちつつ、Bunの最適化を活用する

### Requirement 10: サーバーAPI統合
**Objective:** CLIツールとして、サーバーAPIとシームレスに統合したい。これにより、正確なデータ転送と型安全性を保証する

#### Acceptance Criteria
1. When CLIツールがAim Labsデータをアップロードする, the CLIツール shall POST /api/aimlabs エンドポイントにリクエストを送信する
2. When CLIツールがKovaak'sデータをアップロードする, the CLIツール shall POST /api/kovaaks エンドポイントにリクエストを送信する
3. The CLIツール shall Hono Clientを使用して型安全なAPIリクエストを実行する
4. The CLIツール shall リクエストボディをJSON形式で送信する
5. The CLIツール shall リクエストヘッダーにBearer認証トークンを含める
6. When APIレスポンスが成功（200 OK）を返す, the CLIツール shall レスポンスボディから成功フラグとカウント情報を取得する
7. If APIレスポンスがエラーを返す, then the CLIツール shall レスポンステキストをエラーログに含めて出力する
8. The CLIツール shall APIエンドポイントのベースURLをコマンドラインオプション（--endpoint）で上書き可能にする

