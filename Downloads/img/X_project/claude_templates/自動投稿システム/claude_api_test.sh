#!/bin/bash

# Claude API接続テストスクリプト
# 使い方: ./claude_api_test.sh YOUR_API_KEY

API_KEY=$1

if [ -z "$API_KEY" ]; then
    echo "Error: APIキーを引数として指定してください"
    echo "使い方: ./claude_api_test.sh YOUR_API_KEY"
    exit 1
fi

echo "Claude APIテストを開始します..."
echo ""

# APIリクエスト送信
response=$(curl -s https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 500,
    "messages": [
      {
        "role": "user", 
        "content": "Webデザイナー向けの不安払拭系投稿を200文字で作成してください。共感フレーズから始めて、甘い情報を含め、最後は☺️✨で締めてください。"
      }
    ]
  }')

# レスポンス確認
if [[ $response == *"error"* ]]; then
    echo "❌ エラーが発生しました:"
    echo "$response" | jq .
else
    echo "✅ APIテスト成功！"
    echo ""
    echo "生成された投稿:"
    echo "-------------------"
    echo "$response" | jq -r '.content[0].text'
    echo "-------------------"
    echo ""
    echo "使用トークン数:"
    echo "Input: $(echo "$response" | jq '.usage.input_tokens') tokens"
    echo "Output: $(echo "$response" | jq '.usage.output_tokens') tokens"
fi