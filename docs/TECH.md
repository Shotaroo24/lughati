# Lughati — 技術要件

## 技術スタック

| 層 | 技術 | 備考 |
|----|------|------|
| プラットフォーム | PWA | アプリストア不要、全デバイス対応 |
| フレームワーク | React 18 + Vite | 高速開発、最適ビルド |
| スタイリング | Tailwind CSS | ユーティリティファースト、レスポンシブ |
| 言語 | TypeScript (strict) | `any` 型禁止 |
| バックエンド/DB | Supabase (PostgreSQL) | 無料: 500MB、5万MAU |
| 認証 | Supabase Auth | メール/パスワード + ゲストモード |
| TTS（メイン） | Google Cloud TTS (WaveNet) | 詳細は docs/TTS.md |
| TTS（予備） | Web Speech API | デバイス依存の品質 |
| ホスティング | Vercel | 無料、Gitから自動デプロイ |
| 開発ツール | Claude Code | AI支援開発 |

## プロジェクト構造
```
src/
  components/
    ui/               # 汎用UI: Button, Input, Modal, Card
    layout/           # Header, BottomNav, PageContainer
    deck/             # DeckCard, DeckList, DeckForm
    card/             # FlashCard, CardForm, CardListItem
    study/            # StudyCard, StudyControls, ProgressBar
    import/           # CSVImport, ImportPreview
  pages/
    LoginPage.tsx
    DeckListPage.tsx
    DeckDetailPage.tsx
    StudyPage.tsx
    SettingsPage.tsx
  hooks/
    useAuth.ts        # 認証状態とメソッド
    useDecks.ts       # デッキCRUD操作
    useCards.ts       # カードCRUD操作
    useTTS.ts         # TTS再生とキャッシュ
    useStudy.ts       # 学習セッション状態
  lib/
    supabase.ts       # Supabaseクライアント初期化
    tts.ts            # TTSサービス（Google Cloud + フォールバック）
    csv.ts            # PapaParseによるCSV解析
    cache.ts          # idb-keyvalによるIndexedDB音声キャッシュ
  types/
    database.ts       # Supabaseテーブルの型
    study.ts          # 学習セッションの型
  App.tsx             # ルーター設定
  main.tsx            # エントリポイント
  index.css           # Tailwindインポート + CSS変数

supabase/
  migrations/         # SQLマイグレーションファイル
  functions/
    tts/              # Edge Function（TTSプロキシ）

public/
  icons/              # PWAアイコン（192px、512px）
  manifest.json       # PWAマニフェスト
```

## ルーティング
```
/                → /decks（ログイン済み）または /login にリダイレクト
/login           → ログインページ
/decks           → デッキ一覧ページ
/decks/:id       → デッキ詳細ページ
/decks/:id/study → 学習ページ
/settings        → 設定ページ
```

## 認証フロー
1. ユーザーがアプリを開く → Supabaseセッション確認
2. セッションあり → /decks にリダイレクト
3. セッションなし → ログインページ表示
4. 選択肢:
   - メール/パスワードでサインアップ → アカウント作成 → /decks へ
   - メール/パスワードでログイン → 認証 → /decks へ
   - ゲストとして続ける → localStorageのみ（同期なし）
5. ゲストユーザーにはバナー表示:「サインアップするとデバイス間で同期できます」

## PWA設定

### manifest.json
```json
{
  "name": "Lughati",
  "short_name": "Lughati",
  "description": "アラビア語・英語単語帳アプリ",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFF7F9",
  "theme_color": "#E8567F",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker（vite-plugin-pwa経由）
- 静的アセットをキャッシュ: HTML、CSS、JS、フォント
- APIコールはネットワークファースト戦略
- TTS音声はIndexedDBで別途キャッシュ（docs/TTS.md参照）

## 環境変数
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```
- これらはクライアントコードに含めてOK（Supabase anon keyは公開前提の設計）
- Google Cloud TTS APIキーはSupabase Edge Functionの環境変数にのみ設置

## デプロイ（Vercel）
1. GitHubリポジトリをVercelに接続
2. Vercelダッシュボードで環境変数を設定
3. ビルドコマンド: `npm run build`
4. 出力ディレクトリ: `dist`
5. `git push` するたびに自動デプロイ

## パッケージ依存関係

### 本番用
- react、react-dom
- @supabase/supabase-js
- react-router-dom
- papaparse
- idb-keyval
- framer-motion

### 開発用
- typescript
- vite、@vitejs/plugin-react
- tailwindcss、@tailwindcss/vite
- @types/papaparse
- vite-plugin-pwa
