# Lughati — TTS（音声読み上げ）仕様

## 概要
アラビア語発音がQuizletとの最大の差別化ポイント。
メイン: Google Cloud TTS (WaveNet) をサーバー側プロキシ経由で使用。
予備: Web Speech API（メインが使えない時の自動切り替え）。

## 音声設定

| 設定 | 値 |
|------|-----|
| デフォルト音声 | ar-XA-Wavenet-A（女性） |
| 代替音声 | ar-XA-Wavenet-B（男性） |
| 音声形式 | MP3 |
| 読み上げ速度 | 0.85（学習者向けにやや遅め） |
| ピッチ | 0.0（デフォルト） |
| 言語コード | ar-XA |

ユーザーは設定画面で女性/男性を切り替え可能。

## TTSプロキシの構成

### なぜプロキシが必要？
Google Cloud TTS の APIキーをクライアント側のコードに絶対置かないため。
サーバー側の薄いプロキシがキーを安全に保持し、リクエストを中継する。

### 処理の流れ
```
ユーザーがスピーカーアイコンをタップ
  → クライアントがIndexedDBキャッシュを確認（テキスト＋音声名がキー）
    → キャッシュにあった場合: キャッシュ済み音声を即再生
    → キャッシュにない場合:
      → クライアントが POST /api/tts を送信（Supabase JWTトークン付き）
      → プロキシがJWTを検証（ログイン済みか確認）
      → プロキシがサーバー側のAPIキーでGoogle Cloud TTS APIを呼び出し
      → GoogleがMP3音声を返却
      → プロキシが音声をクライアントに返却
      → クライアントが音声を再生 + IndexedDBキャッシュに保存（30日間）
```

### エンドポイント仕様

**POST /api/tts**

リクエスト:
```json
{
  "text": "مرحبا",
  "voice": "ar-XA-Wavenet-A"
}
```

レスポンス:
- Content-Type: audio/mpeg
- ボディ: MP3バイナリデータ

エラー:
- 401: JWTが無い、または無効
- 400: textパラメータが無い
- 429: レート制限超過（ユーザーあたり50リクエスト/分）
- 500: Google TTS APIエラー

### Supabase Edge Function 実装

```typescript
// supabase/functions/tts/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GOOGLE_TTS_API_KEY = Deno.env.get('GOOGLE_TTS_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

serve(async (req) => {
  // CORSヘッダー
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  // JWT検証
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('認証エラー', { status: 401 })

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('認証エラー', { status: 401 })

  // リクエスト解析
  const { text, voice = 'ar-XA-Wavenet-A' } = await req.json()
  if (!text) return new Response('テキストが必要です', { status: 400 })

  // Google Cloud TTS呼び出し
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ar-XA', name: voice },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.85,
          pitch: 0.0,
        }
      })
    }
  )

  const data = await response.json()

  // 音声をバイナリで返却
  const audioBytes = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))
  return new Response(audioBytes, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Access-Control-Allow-Origin': '*',
    }
  })
})
```

## クライアント側の音声キャッシュ

### 技術
- IndexedDB（`idb-keyval` ライブラリ経由）
- シンプルなキー・バリューストア

### キャッシュキーの形式
```
tts:{音声名}:{テキスト}
```
例: `tts:ar-XA-Wavenet-A:مرحبا`

### キャッシュルール
- 有効期限: 30日間
- 最大容量: 制限なし（個々の音声ファイルは約5〜15KB）
- 書き込み時: 音声Blob + タイムスタンプを保存
- 読み込み時: タイムスタンプが30日以内かチェック、期限切れなら再取得
- 設定画面にキャッシュクリアオプション

### クライアントTTSサービス

```typescript
// lib/tts.ts
import { get, set } from 'idb-keyval';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30日

interface CachedAudio {
  blob: Blob;
  timestamp: number;
}

export async function playArabicTTS(
  text: string,
  voice: string = 'ar-XA-Wavenet-A',
  supabaseToken: string
): Promise<void> {
  const cacheKey = `tts:${voice}:${text}`;

  // キャッシュ確認
  const cached = await get<CachedAudio>(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    const url = URL.createObjectURL(cached.blob);
    const audio = new Audio(url);
    await audio.play();
    URL.revokeObjectURL(url);
    return;
  }

  // プロキシから取得
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseToken}`,
      },
      body: JSON.stringify({ text, voice }),
    });

    if (!response.ok) throw new Error(`TTSエラー: ${response.status}`);

    const blob = await response.blob();

    // キャッシュに保存
    await set(cacheKey, { blob, timestamp: Date.now() });

    // 再生
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn('Google TTS失敗、Web Speech APIにフォールバック', error);
    fallbackWebSpeech(text);
  }
}

function fallbackWebSpeech(text: string): void {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar';
  utterance.rate = 0.85;
  speechSynthesis.speak(utterance);
}
```

## コスト試算

Google Cloud TTS WaveNet 無料枠: 月間100万文字。
アラビア語1単語 ≈ 5文字。

| シナリオ | 文字数/回 | 回数/月 | 合計文字数 | コスト |
|----------|----------|---------|-----------|--------|
| 軽め（200語） | 1,000 | 30 | 30,000 | 0円 |
| 普通（500語） | 2,500 | 60 | 150,000 | 0円 |
| しっかり（1000語） | 5,000 | 90 | 450,000 | 0円 |
| 極端（毎日2000語） | 10,000 | 150 | 1,500,000 | 約$8 |

クライアント側キャッシュにより、同じ単語は再取得しない。
現実的な個人使用では無料枠内に十分収まる。

## Google Cloud セットアップ手順
1. Google Cloud Console でプロジェクト作成
2. 「Cloud Text-to-Speech API」を有効化
3. Credentials で APIキーを作成
4. 予算アラートを $1 に設定
5. APIキーを Supabase Edge Function の環境変数に追加
