# 🤖 Claude API設定手順

## 1. Anthropic APIキー取得

### 1-1. Anthropicアカウント作成
1. **https://console.anthropic.com** にアクセス
2. 「Sign Up」でアカウント作成
3. メール認証を完了

### 1-2. APIキー生成
1. Console画面で「API Keys」をクリック
2. 「Create Key」をクリック
3. Key名: 「n8n-auto-post」
4. 生成されたAPIキーをコピー・保存

**⚠️ 重要**: APIキーは一度しか表示されないので必ず保存してください

## 2. Claude API料金体系

### 料金（2024年1月現在）
```
Claude-3-5-Sonnet:
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens

月間予想コスト（1日3回投稿の場合）:
- 約$10-20/月（2,000-4,000円）
```

### 使用量目安
```
1回の投稿作成:
- Input: 約2,000 tokens（テンプレート+指示）
- Output: 約300 tokens（投稿内容）
- コスト: 約$0.01/回

1日3回 × 30日 = 90回/月 → 約$1/月
```

## 3. API接続テスト

### 3-1. curlでのテスト
```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 500,
    "messages": [
      {
        "role": "user", 
        "content": "Webデザイナー向けの不安払拭系投稿を200文字で作成してください。"
      }
    ]
  }'
```

### 3-2. 正常なレスポンス例
```json
{
  "id": "msg_xxx",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "デザインで行き詰まっている時..."
    }
  ],
  "model": "claude-3-5-sonnet-20241022",
  "usage": {
    "input_tokens": 50,
    "output_tokens": 100
  }
}
```

## 4. n8nでのClaude API設定

### 4-1. HTTP Requestノード設定
```
URL: https://api.anthropic.com/v1/messages
Method: POST
Headers:
  Content-Type: application/json
  x-api-key: {{ $vars.CLAUDE_API_KEY }}
  anthropic-version: 2023-06-01
```

### 4-2. リクエストボディ
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 500,
  "messages": [
    {
      "role": "user",
      "content": "{{ $vars.POST_CREATION_PROMPT }}"
    }
  ]
}
```

## 5. エラーハンドリング

### よくあるエラーと対処
```
401 Unauthorized:
→ APIキーを確認

429 Rate Limit:
→ リクエスト間隔を調整（推奨：1分間隔）

400 Bad Request:
→ リクエスト形式を確認
```

## 6. セキュリティ設定

### APIキーの安全な管理
1. n8nの環境変数に設定
2. 絶対にコードにハードコードしない
3. 定期的にキーをローテーション（3ヶ月毎推奨）

## 次のステップ
Claude API設定完了後、投稿作成プロンプトテンプレートの設定に進みます。