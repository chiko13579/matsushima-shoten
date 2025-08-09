# 🔑 X Developer アカウント設定手順

## 1. X Developer Portal 登録

### 1-1. アカウント申請
1. **https://developer.twitter.com/** にアクセス
2. 「Apply for a developer account」をクリック
3. 普段使用しているXアカウントでログイン

### 1-2. 申請フォーム記入
**基本情報：**
- Country/Region: Japan
- What's your use case?: Hobbyist (趣味)

**詳細な用途（英語で回答）:**
```
Use Case: Personal blog automation
Description: I want to create an automated posting system for my web design blog. The system will help me share design tips and tutorials with my followers on a regular schedule.

Planned API usage:
- Post tweets containing design tips and tutorials
- No data collection or analysis
- Estimated 10-20 tweets per day maximum
- Content will be original educational material about web design

The automation will help maintain consistent communication with my audience while I focus on creating quality content.
```

### 1-3. 利用規約確認
- 全ての利用規約を読んで同意
- 「Looks good!」をクリック
- 承認を待つ（通常1-3日）

## 2. アプリケーション作成

### 2-1. 新しいアプリ作成
1. Developer Portalにログイン
2. 「Create App」をクリック
3. アプリ情報を入力：

```
App name: ChikoPostSystem
App description: Automated posting system for web design educational content
Website URL: https://your-website.com（ご自身のサイトURL）
App usage: Posting educational content about web design
```

### 2-2. アプリ設定
1. 「Settings」タブに移動
2. **App permissions を「Read and Write」に変更**
3. 「Save」をクリック

## 3. API キー取得

### 3-1. Keys and Tokens
「Keys and Tokens」タブで以下を取得：

```
✅ API Key: [コピーしてメモ]
✅ API Key Secret: [コピーしてメモ]  
✅ Bearer Token: [コピーしてメモ]
✅ Access Token: [Generate]ボタンで生成してメモ
✅ Access Token Secret: [同時に生成されるのでメモ]
```

### 3-2. 安全な保管
取得した5つのキーを以下のフォーマットでメモ帳に保存：

```
=== X API キー情報 ===
API Key: YOUR_API_KEY_HERE
API Key Secret: YOUR_API_SECRET_HERE  
Bearer Token: YOUR_BEARER_TOKEN_HERE
Access Token: YOUR_ACCESS_TOKEN_HERE
Access Token Secret: YOUR_ACCESS_TOKEN_SECRET_HERE

作成日: 2024/01/15
用途: X自動投稿システム
```

⚠️ **重要**: これらのキーは絶対に他人に見せない・公開しないでください

## 4. API制限の確認

### Free Tier (無料プラン) の制限:
- 月間投稿数: 1,500ツイート
- 1日あたり: 約50ツイート
- レート制限: 15分間に300リクエスト

### 十分な理由:
- 1日2-3投稿なら月90投稿程度
- 無料枠の1,500投稿で十分対応可能

✅ X Developer設定完了！

## 次のステップ
n8nでこれらのキーを使ってX接続を設定します。