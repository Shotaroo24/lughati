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
- デフォルトTTS音声: **女性** (ar-XA-Wavenet-A)
- Google Cloud TTS APIキーは Supabase Edge Function 内に配置、クライアントコードには絶対に書かない
- Supabase anon key はクライアントコードに書いてOK（公開前提の設計）
- 全テーブルにRLSを有効化すること
