# TanStack Query キャッシング最適化検証レポート

## 検証日時
2025-11-12

## キャッシング設定

### 現在の設定 (`useDashboardInitialLoad.ts`)
```typescript
{
  staleTime: 5 * 60 * 1000,  // 5分 (300,000ms)
  gcTime: 10 * 60 * 1000,     // 10分 (600,000ms)
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
}
```

### 設定の意味
- **staleTime (5分)**: データが「新鮮」とみなされる期間。この期間内は再フェッチなし
- **gcTime (10分)**: キャッシュがメモリに保持される期間。使用されていないキャッシュの保持時間
- **retry (3回)**: エラー時の自動リトライ回数
- **retryDelay**: 指数バックオフ (1s → 2s → 4s、最大30s)

## 検証項目

### 1. staleTime の動作確認

#### テスト手順
1. ダッシュボードを初回ロード
2. ブラウザ開発者ツール（F12）→ Networkタブを開く
3. 以下のAPIリクエストを確認:
   - `GET /api/coaching/status?userId=xxx`
   - `GET /api/coaching/daily-report?userId=xxx`
   - `GET /api/coaching/context?userId=xxx`
4. ページをリロード（5分以内）
5. Networkタブで新しいリクエストが**発生しないこと**を確認

#### 期待される動作
- ✅ 初回: 3つのAPIリクエストが並列実行される
- ✅ 5分以内の再ロード: **APIリクエスト0件**（キャッシュから取得）
- ✅ 5分経過後: 3つのAPIリクエストが再度実行される

#### 検証結果
- [ ] 初回ロード時に3つのAPIリクエストを確認
- [ ] 5分以内の再ロードでリクエスト0件を確認
- [ ] コンソールにエラーなし
- [ ] データが正常に表示される

### 2. gcTime の動作確認

#### テスト手順
1. ダッシュボードをロード
2. 別ページへ遷移（例: ホームページ）
3. 10分以内にダッシュボードへ戻る
4. Networkタブでリクエストを確認

#### 期待される動作
- ✅ 10分以内の再訪問: キャッシュから即座にデータ表示、バックグラウンドで再フェッチ（staleTime経過時のみ）
- ✅ 10分経過後: キャッシュが削除され、新規フェッチ

#### 検証結果
- [ ] 10分以内の再訪問でキャッシュが有効
- [ ] 10分経過後にキャッシュが削除される

### 3. 重複リクエスト防止の確認

#### テスト手順
1. 複数のタブでダッシュボードを同時に開く
2. Networkタブで各タブのリクエストを確認
3. 同じqueryKeyのリクエストが重複しないことを確認

#### 期待される動作
- ✅ TanStack Queryの自動重複排除機能により、同じqueryKeyのリクエストは1回のみ実行
- ✅ 他のタブは最初のタブのレスポンスを共有

#### 検証結果
- [ ] 複数タブで重複リクエストなし
- [ ] 全タブで同じデータが表示される

### 4. リトライ機能の確認

#### テスト手順
1. ネットワークをオフラインにする（開発者ツール → Networkタブ → Offline）
2. ダッシュボードをロード
3. Consoleタブでリトライ動作を確認
4. ネットワークをオンラインに戻す

#### 期待される動作
- ✅ 3回のリトライが自動実行される
- ✅ リトライ間隔: 1秒 → 2秒 → 4秒（指数バックオフ）
- ✅ 3回失敗後、エラー状態になる

#### 検証結果
- [ ] 3回のリトライを確認
- [ ] 指数バックオフの動作確認
- [ ] エラー表示が適切に動作

## パフォーマンス測定

### 初回ロード時間
- **目標**: 3秒以内
- **実測**: ___ 秒

### 2回目以降のロード時間（キャッシュ使用）
- **目標**: 0.5秒以内
- **実測**: ___ 秒

### ネットワークリクエスト削減率
- **初回**: 3リクエスト
- **5分以内の再ロード**: 0リクエスト
- **削減率**: 100%

## React Query DevTools での確認

### 使用方法
```typescript
// 開発環境でReact Query DevToolsを有効化
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### 確認項目
- [ ] queryKeyが正しく設定されている: `["coaching", "status", userId]`
- [ ] staleTime/gcTimeが設定値通り
- [ ] キャッシュステータス: fresh → stale → inactive → removed

## 最適化の効果

### メリット
1. **ネットワーク負荷削減**: 5分間で重複リクエスト0件
2. **レスポンス速度向上**: キャッシュからの即座のデータ表示
3. **サーバー負荷軽減**: 不要なAPIリクエストの削減
4. **ユーザー体験向上**: 高速なページ遷移

### トレードオフ
1. **データの鮮度**: 最大5分のデータ遅延の可能性
2. **メモリ使用量**: キャッシュデータの保持による若干のメモリ使用

### 推奨事項
現在の設定（staleTime: 5分、gcTime: 10分）は以下の理由で適切:
- コーチングデータは頻繁に変更されない（1日1回程度の更新）
- 5分の staleTime は鮮度とパフォーマンスのバランスが良い
- リアルタイム性が必要な場合は個別にinvalidateQueriesを使用可能

## 検証ツール

### ブラウザ開発者ツール
- **Chrome DevTools**: F12 → Network タブ
- **Lighthouse**: パフォーマンス測定
- **React Query DevTools**: キャッシュ状態の可視化

### 検証コマンド
```bash
# キャッシュテスト用の開発サーバー起動
bun run dev

# パフォーマンス測定
bun run build
bun run start
```

## 承認状況
- [ ] 開発者承認
- [ ] QA承認
- [ ] パフォーマンステスト承認

## 参考資料
- [TanStack Query Caching Guide](https://tanstack.com/query/latest/docs/framework/react/guides/caching)
- [Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
