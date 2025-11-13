# 実装タスク: cli-score-collector

## タスク概要

既存実装の動作検証とドキュメント作成を行う。全要件は実装済みのため、新規コード開発は不要。

---

## タスクリスト

- [ ] 1. Device Authorization Flow 動作検証テスト作成
- [ ] 1.1 (P) ポーリング処理とトークン取得の統合テスト
  - モック認証サーバーでデバイスコード・ユーザーコードのレスポンスを再現
  - 5秒間隔ポーリングが`authorization_pending`から`access_token`取得まで正常動作することを確認
  - トークン取得後、ConfigStoreへの保存と`device.access_token`読み取りを検証
  - _Requirements: 1_
  - _Contracts: AuthService.login(), ConfigStore API_

- [ ] 1.2 (P) トークン無効時の再認証フロー検証
  - 期限切れトークンでの認証失敗シナリオをテスト
  - `getSessionOrLogin()`が自動再認証を実行することを確認
  - エラーログに再認証促進メッセージが含まれることを検証
  - _Requirements: 1_
  - _Contracts: AuthService.getSessionOrLogin()_

- [ ] 2. Aim Labs データパース動作検証
- [ ] 2.1 (P) SQLite データ抽出とフィルタリングテスト
  - モック.bytesファイルから`taskData`テーブル読み取りを検証
  - 処理済みタスクIDフィルタリング（LocalDB照会）が正常動作することを確認
  - ユーザーID付与後のデータ構造が要件通りであることを検証
  - _Requirements: 2, 4_
  - _Contracts: AimlabParser.uploadAimlab(), LocalDB.getDB()_

- [ ] 2.2 (P) エラーハンドリングとログ出力テスト
  - .bytesファイル不在時に適切なエラーメッセージを出力することを確認
  - SQLite接続エラー時の詳細ログとスタックトレース記録を検証
  - 読み取り専用モードでのDB接続を確認
  - _Requirements: 2, 8_
  - _Contracts: StructuredLogger API_

- [ ] 3. Kovaak's データパース動作検証
- [ ] 3.1 (P) ファイル名解析と CSV パーステスト
  - 正規表現パターン`/^(?<scenario>.+?) - (?<mode>.+?) - (?<dt>\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}\.\d{2}) Stats\.csv$/u`が正常ファイル名に一致することを確認
  - 不正ファイル名（パターン不一致）のスキップと警告ログ出力を検証
  - CSV列数不一致行のスキップとデバッグログ記録を確認
  - 数値変換エラー時のデフォルト値（0）使用とログ記録を検証
  - _Requirements: 3, 8_
  - _Contracts: KovaaksParser.parseFilename(), KovaaksParser.parseKovaaks()_

- [ ] 3.2 (P) ファイルハッシュ計算と増分管理テスト
  - 同一ファイルで同一ハッシュが生成されることを確認
  - ファイル内容変更時にハッシュが異なることを検証
  - LocalDB照会で処理済みファイル（ファイル名+ハッシュ）がスキップされることをテスト
  - _Requirements: 3, 4_
  - _Contracts: LocalDB API, hashFile()_

- [ ] 4. バッチアップロード機能検証
- [ ] 4.1 (P) チャンク分割と順次アップロードテスト
  - 100件チャンク分割が正常動作することを確認（境界値: 0件、1件、100件、101件、999件）
  - 各チャンクが順次（非並列）でアップロードされることを検証
  - アップロード進捗ログ（X/Y chunks）が正確に出力されることを確認
  - _Requirements: 5_
  - _Contracts: BatchUploader.chunkArray(), ApiClient POST endpoints_

- [ ] 4.2 (P) アップロード失敗時のエラーハンドリングテスト
  - チャンク失敗時に即座に処理中断されることを確認
  - エラーログにレスポンスボディとステータスコードが含まれることを検証
  - 失敗チャンクがLocalDBに記録されず、次回実行時に再試行されることをテスト
  - _Requirements: 5, 8_
  - _Contracts: StructuredLogger.error()_

- [ ] 5. 構造化ログ出力検証
- [ ] 5.1 (P) ログレベル管理とJSON形式出力テスト
  - ログレベル（DEBUG, INFO, WARN, ERROR）フィルタリングが正常動作することを確認
  - JSON形式ログ（`{timestamp, level, message, data}`）が正確に出力されることを検証
  - エラー時にスタックトレースが自動抽出されることをテスト
  - 環境変数（`NODE_ENV=development`）でDEBUGレベルが自動有効化されることを確認
  - _Requirements: 6_
  - _Contracts: StructuredLogger API, LogEntry type_

- [ ] 5.2 (P) 各処理フェーズでのログ出力検証
  - 処理開始ログ（処理種別、パス、ユーザーID）を確認
  - ファイル検出ログ（ファイルパス、ファイル数）を検証
  - アップロード進捗ログ（チャンク数、レコード数）を確認
  - 完了サマリーログ（処理件数、所要時間）を検証
  - _Requirements: 6_

- [ ] 6. Commander.js CLIインターフェース検証
- [ ] 6.1 (P) コマンドとオプション解析テスト
  - `login`コマンドが認証のみ実行することを確認
  - `aimlab <path>`コマンドがパス引数を正常に処理することを検証
  - `kovaaks <path>`コマンドがパス引数を正常に処理することを検証
  - `--endpoint`オプションでカスタムエンドポイントURLが適用されることをテスト
  - デフォルトエンドポイント（`https://aim-ai-coach.mk2481.dev`）が使用されることを確認
  - _Requirements: 7_

- [ ] 6.2 (P) ヘルプとバージョン表示テスト
  - `--help`オプションでコマンド説明が表示されることを確認
  - `--version`オプションでバージョン番号が表示されることを検証
  - 各コマンド実行前のセッション有効性チェックをテスト（無効時はログイン促進）
  - _Requirements: 7_

- [ ] 7. Bunランタイム互換性検証
- [ ] 7.1 (P) Bun標準API利用とTypeScript直接実行テスト
  - Shebang `#!/usr/bin/env bun` でCLI直接実行が可能であることを確認
  - `bun:sqlite`クライアントでSQLite高速読み取りが動作することを検証
  - `Bun.file()`, `Bun.sleep()`等のBun APIが正常動作することをテスト
  - TypeScript直接実行（トランスパイル不要）を確認
  - _Requirements: 9_

- [ ] 8. サーバーAPI統合検証
- [ ] 8.1 (P) Hono Client型安全API通信テスト
  - `POST /api/aimlabs`エンドポイントへのリクエスト送信と型安全レスポンス取得を確認
  - `POST /api/kovaaks`エンドポイントへのリクエスト送信と型安全レスポンス取得を確認
  - Bearer認証ヘッダー（`Authorization: Bearer <token>`）が正常に設定されることを検証
  - リクエストボディがJSON形式であることを確認
  - _Requirements: 10_
  - _Contracts: ApiClient API contract, UploadResponse type_

- [ ] 8.2 (P) APIエラーレスポンスハンドリングテスト
  - 4xxエラー時にレスポンスボディがエラーログに含まれることを確認
  - 5xxエラー時にレスポンスボディがエラーログに含まれることを確認
  - 認証エラー（401）時に再認証促進メッセージが表示されることを検証
  - _Requirements: 8, 10_

- [ ] 9. E2Eユーザーシナリオ検証
- [ ] 9.1 初回認証からAim Labsアップロード完全フロー
  - `login`コマンド → ブラウザ認証 → トークン保存 → `aimlab`コマンド実行 → データアップロード → 完了ログ出力の一連フローを検証
  - 新規タスクのみがアップロードされることを確認
  - LocalDBに処理済みタスクIDが記録されることをテスト
  - _Requirements: 1, 2, 4, 5, 6, 7, 10_

- [ ] 9.2 既存セッションでのKovaak'sアップロード増分管理フロー
  - 既存セッション（トークン有効）で`kovaaks`コマンドを実行
  - CSVスキャン → 新規ファイルのみフィルタリング → アップロード → 完了ログ出力を検証
  - 2回目実行時に既存ファイルがスキップされることをテスト
  - LocalDBにファイル名+ハッシュが記録されることを確認
  - _Requirements: 3, 4, 5, 6, 7, 10_

- [ ] 9.3 エラーリカバリとロバストネステスト
  - ネットワーク切断シミュレーション → エラーログ出力 → 再実行時の正常完了を検証
  - 不正CSVファイル混在時に警告ログ + スキップ → 正常ファイルの処理継続を確認
  - .bytesファイル不在時のエラーメッセージとゼロ終了コード返却をテスト
  - _Requirements: 8_

- [ ] 10. ユーザードキュメント作成
- [ ] 10.1 インストールとセットアップガイド作成
  - Bunインストール手順（Windows環境）を記載
  - CLI依存関係インストール（`bun install`）を説明
  - 環境変数設定（エンドポイントURL、ログレベル）を文書化
  - _Requirements: 全般_

- [ ] 10.2 使用方法とコマンドリファレンス作成
  - `login`コマンドの使用方法と認証フローを説明
  - `aimlab <path>`コマンドの引数・オプションを文書化
  - `kovaaks <path>`コマンドの引数・オプションを文書化
  - `--endpoint`オプションの使用例を記載
  - _Requirements: 7_

- [ ] 10.3 トラブルシューティングガイド作成
  - 認証失敗時の対処法（トークン無効、ブラウザ不在）を記載
  - ファイル検出エラー時の対処法（パス確認、権限）を説明
  - ネットワークエラー時の再試行方法を文書化
  - ログ解析方法（JQ利用例）を記載
  - _Requirements: 8_

---

## タスク進捗

**合計**: 10メジャータスク、29サブタスク
**要件カバレッジ**: 全10要件を完全カバー
**平均タスクサイズ**: 1-2時間 / サブタスク

---

## 次のアクション

1. タスクレビュー完了後、`/kiro:spec-impl cli-score-collector 1.1`で実装開始
2. 各タスク完了後に`/kiro:spec-status cli-score-collector`で進捗確認
3. 全タスク完了後、仕様書を最終承認

---

**生成日時**: 2025-11-11
**フェーズ**: 実装タスク生成完了
