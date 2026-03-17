Lughati 修正リスト
このファイルの項目を上から順番に1つずつ対応してください。
各項目が完了したら、その項目をこのファイルから削除してください。

1. 設定モーダルを画面中央に表示する
現状：設定モーダル（ボトムシート）が画面下部に表示されている
変更：画面の中央に表示されるように修正する

モーダルを画面中央に配置（top: 50%, left: 50%, transform: translate(-50%, -50%)）
背景に半透明のオーバーレイを表示
モーダルの最大幅を 480px 程度に設定

2. アラビア語音声の読み上げスピードを上げる
現状：Google Cloud TTS の読み上げスピードが少し遅い
変更：speaking_rate を上げる

Edge Function（supabase/functions/tts/index.ts）の speaking_rate を 0.85 → 1.05 に変更
修正後 supabase functions deploy tts --no-verify-jwt でデプロイが必要