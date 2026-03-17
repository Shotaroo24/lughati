# Lughati (لُغَتِي) — Claude Code プロジェクトルール

## プロジェクト概要
Lughati は、Google Cloud TTS によるネイティブ品質のアラビア語発音付きアラビア語・英語単語帳PWAアプリです。
Quizlet の機械的な音声を、高品質な WaveNet 音声に置き換えつつ、使い慣れた単語帳のUXを提供します。

## ドキュメント構成
作業を始める前に、関連するドキュメントを必ず読んでください:

| ファイル | 読むタイミング |
|---------|-------------|
| `docs/DESIGN.md` | UI作業、スタイリング、新コンポーネント、レイアウト変更時 |
| `docs/TECH.md` | アーキテクチャ、技術スタック、デプロイ関連 |
| `docs/DATA_MODEL.md` | データベーステーブル、Supabaseクエリ、RLSポリシー |
| `docs/TTS.md` | 音声再生、TTSプロキシ、キャッシュ、音声設定 |
| `docs/PROGRESS.md` | 現在のフェーズ確認、タスク完了マーク |

## 基本原則

### 1. モバイルファースト
- スマホ画面（375px）を基準に設計し、上に拡大
- タッチターゲットは最低44x44px
- 375px、768px、1024px でレスポンシブ確認

### 2. RTL対応
- アラビア語テキストは常に `dir="rtl"` + 専用アラビア語フォント
- 英語/UIテキストは `dir="ltr"`
- 同一テキスト要素内で方向を混在させない

### 3. 桜色テーマ
- `docs/DESIGN.md` で定義されたCSS変数を常に使用
- 色のハードコーディング禁止 — 必ずデザイントークンを参照
- 背景は純白ではない — #FFF7F9（桜白）

### 4. コード品質
- TypeScript strict モード — `any` 型禁止
- 全コンポーネントはフックを使った関数コンポーネント
- コンポーネント名・変数名は英語で意味のある名前
- コメントは英語

### 5. パフォーマンス
- TTS音声はIndexedDBにキャッシュ — 同じ単語の再取得禁止
- ルートは React.lazy() で遅延読み込み
- 画像は最適化、フォントはプリロード

### 6. ファイル整理
```
src/
  components/    → 再利用可能なUI部品（Button, Card, Modal...）
  pages/         → ルートレベルのページ（Login, DeckList, Study...）
  hooks/         → カスタムReactフック（useAuth, useTTS, useDecks...）
  lib/           → サービスモジュール（supabase.ts, tts.ts, csv.ts）
  types/         → TypeScript型定義
```

## 作業の進め方
1. `docs/PROGRESS.md` で現在のフェーズと次のタスクを確認
2. 実装前に関連ドキュメントを読む
3. 一度に1つのタスクを実装
4. タスク完了後、PROGRESS.md のチェックボックスを更新: ☐ → ☑
5. 次のタスクに進む前にブラウザでテスト

## 重要な注意事項
- デフォルトTTS音声: **女性** (ar-XA-Neural2-A) ※Neural2に変更済み（旧WaveNet-Aではない）
- Google Cloud TTS APIキーは Supabase Edge Function 内に配置、クライアントコードには絶対に書かない
- Supabase anon key はクライアントコードに書いてOK（公開前提の設計）
- 全テーブルにRLSを有効化すること

---

## トラブルシューティング（過去の教訓）

### 問題: Supabase Edge Function の JWT 検証でゲストが弾かれる
- 症状: ゲストユーザーがTTS音声を再生しようとすると401エラーになる
- 原因: Edge Function に `verify_jwt: true` が設定されているとゲストは JWT を持たないため拒否される
- 解決策: `supabase/config.toml` で `[functions.tts] verify_jwt = false` に設定し、手動でトークン検証するロジックをFunction内に実装。ゲストには `SUPABASE_ANON_KEY` をBearerトークンとして渡す
- 教訓: Edge Function の JWT 検証は無効化し、Function 内で `Authorization` ヘッダーを自前でチェックする方が柔軟。ゲストモードを作るときは最初から考慮すること

### 問題: framer-motion の 3D transform でアラビア語テキストがぼやける
- 症状: カードフリップアニメーション中にアラビア語テキストがぼやける（特に Retina ディスプレイ）
- 原因: `rotateX` などの 3D transform が GPU レイヤーに昇格し、サブピクセルレンダリングが崩れる
- 解決策: アニメーション中のみ `willChange: 'transform'` を適用し、終了後は `'auto'` に戻す。さらに `WebkitFontSmoothing: 'antialiased'` を文字要素に付与
- 教訓: 3D アニメーション + テキストの組み合わせは `willChange` を必要最小限に使うこと。常時 `willChange: 'transform'` は逆効果

### 問題: framer-motion の `initial`/`exit` に関数を渡すと TypeScript エラー
- 症状: `TS2322: Type '(ref: ...) => ...' is not assignable to type 'TargetAndTransition'`
- 原因: AnimatePresence の `custom` prop を使って方向対応アニメーションを書くとき、`initial`/`exit` に関数を渡す形式は型定義と合わない
- 解決策: `as unknown as TargetAndTransition` でキャスト。`TargetAndTransition` は framer-motion からインポートする
- 教訓: framer-motion のカスタムアニメーション（方向対応など）はナビゲーション直前に `useRef` で方向を記録し、`custom` prop 経由で渡すパターンが安全

### 問題: PapaParse の列自動検出でアラビア語が `english` と誤検出される
- 症状: CSV のアラビア語列が英語列として認識される
- 原因: ヘッダー名だけで判定するとアラビア語の列名を含まないCSVで誤判定が起きる
- 解決策: ヘッダー名マッチに加えて、セル内容がアラビア文字（`/[\u0600-\u06FF]/`）を含む比率でアラビア語列を検出するロジックを追加
- 教訓: ユーザー作成のCSVはヘッダー名が不定。内容ベースの検出を必ず組み合わせること

### 問題: RTL テキスト入力でカーソルが左端に表示される
- 症状: アラビア語入力フィールドでテキスト入力時にカーソル位置がおかしい
- 原因: `<input>` に `dir="rtl"` を付けないとデフォルトが LTR になりアラビア語入力で混乱する
- 解決策: アラビア語用 `<input>` には必ず `dir="rtl"` を付与。さらに `fontFamily: 'var(--font-arabic)'` でアラビア語フォントを指定
- 教訓: アラビア語入力フィールドは `dir="rtl"` と Arabic フォントの両方が必須。片方だけでは不十分

### 問題: Supabase Edge Function デプロイ後に古いコードが動く
- 症状: コードを修正して `supabase functions deploy tts` したのに変更が反映されない
- 原因: `--no-verify-jwt` フラグを使わずにデプロイするとエラーになる場合がある。またローカルキャッシュで古い動作が続くことがある
- 解決策: `supabase functions deploy tts --no-verify-jwt` で再デプロイ。IndexedDB キャッシュも手動クリア（DevTools → Application → IndexedDB）
- 教訓: TTS 動作確認時は必ずキャッシュをクリアしてから音声再生をテストすること

### 問題: `require` が ES Module 環境で使えない
- 症状: `scripts/generate-icons.js` を実行すると `ReferenceError: require is not defined`
- 原因: `package.json` に `"type": "module"` が設定されているため、`.js` ファイルは ESM として扱われ `require()` が使えない
- 解決策: スクリプトファイルを `.cjs` 拡張子に変更（`generate-icons.cjs`）。CJS として明示的にマーク
- 教訓: `package.json` に `"type": "module"` がある場合、CommonJS スクリプトは `.cjs` 拡張子にすること

### 問題: フォルダ追加マイグレーション時に既存デッキが folder_id = NULL になる
- 症状: Migration 003 実行後、既存ユーザーのデッキが folder_id = NULL のままになり、FolderView に表示されない
- 原因: `ALTER TABLE decks ADD COLUMN folder_id` した後、既存デッキへの割り当てが漏れる
- 解決策: マイグレーション内で CTE を使い「ユーザーごとにデフォルトフォルダを作成し、既存デッキを割り当てる」処理を同一 SQL で実行する
- 教訓: カラム追加マイグレーションは既存データの移行処理も必ずセットで書くこと。`ON DELETE RESTRICT` でフォルダ削除前にデッキ移動を強制する設計も重要

### 問題: ゲストモードでフォルダ機能追加時に localStorage 設計が複雑化
- 症状: ゲストユーザーのデッキが初回フォルダ導入後に表示されなくなる
- 原因: 旧実装では `lughati_guest_decks` キーだけ使っていたが、フォルダ導入後は `folder_id` も必要になり、初回ロード時のマイグレーションが必要
- 解決策: `useFolder` フック初回ロード時に、フォルダが空なら「マイフォルダ」を作成し、`folder_id = null` のデッキを全て割り当てる移行ロジックを追加
- 教訓: ゲストモードの localStorage スキーマ変更は、アプリ側で自動マイグレーションを書くこと。ユーザーにキャッシュクリアを要求しない設計が原則

### 問題: Tailwind v4 でカスタムユーティリティクラスが認識されない
- 症状: `animate-fade-in` クラスが適用されない / Tailwind がカスタムアニメーションを生成しない
- 原因: Tailwind v4 では v3 の `extend.animation` 設定が廃止され、`tailwind.config.js` が不要になった
- 解決策: `src/index.css` に `@keyframes fadeIn { ... }` と `@utility animate-fade-in { animation: fadeIn 0.2s ease-out; }` を追記（`@utility` は Tailwind v4 の構文）
- 教訓: Tailwind v4 ではカスタムクラスは `@utility` で定義する。`tailwind.config.js` の `extend` は効かない
