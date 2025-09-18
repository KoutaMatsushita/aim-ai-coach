# タスク完了時チェックリスト

## 必須実行コマンド
コード変更後は以下を必ず実行:

### Coach プロジェクト
```bash
cd coach
npm run check  # biome check + format + lint
```

### Collector プロジェクト  
```bash
cd collector
bun run check  # biome check + format
bun run lint   # biome lint のみ
```

### Discord Bot
```bash
cd discord-bot
npm run test   # vitest テスト実行
```

## データベース変更時
```bash
cd coach
npx drizzle-kit push  # スキーマ変更をTursoに反映
```

## 型チェック確認
- 両プロジェクトで型エラーなしを確認
- TypeScript 5.x系で統一

## 品質チェックポイント
- [ ] biome check が全プロジェクトでパス
- [ ] 型エラーなし
- [ ] 環境変数の検証実装 (env.ts)
- [ ] Zodスキーマによる入力検証
- [ ] 日時はepoch秒で統一
- [ ] Discord IDは文字列として扱う
- [ ] 例外処理の実装 (CSV/SQLite読み込み)

## デプロイ前チェック
```bash
# Discord Bot
cd discord-bot && npm run register  # コマンド登録
cd discord-bot && npm run deploy    # Cloudflare Workers デプロイ
```