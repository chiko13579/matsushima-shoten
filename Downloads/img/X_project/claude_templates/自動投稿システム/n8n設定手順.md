# 🔧 n8n 詳細設定手順

## 1. n8n アカウント作成

### 1-1. アカウント登録
1. **https://n8n.cloud** にアクセス
2. 「Start for free」をクリック
3. メールアドレスとパスワードを入力
4. 認証メールが送信されるので、メール内のリンクをクリック

### 1-2. プラン選択
```
🆓 Free Plan:
- 5,000 workflow executions/月
- 2 active workflows
- Community support

💰 Starter Plan ($20/月):
- 無制限 workflow executions
- 無制限 active workflows  
- Email support
- ← おすすめ（14日間無料トライアル）
```

**推奨**: まず14日間無料トライアルでStarterプランを試す

## 2. ワークスペース初期設定

### 2-1. 初回ログイン
1. n8n Cloudにログイン
2. ワークスペース名: 「ChikoAutoPost」
3. 「Create workspace」をクリック

### 2-2. 初期設定
1. タイムゾーン: Asia/Tokyo
2. 言語: English（日本語対応は限定的）
3. 「Save settings」

## 3. 認証情報（Credentials）の設定

### 3-1. Google Sheets認証
1. 左サイドバー「Credentials」をクリック
2. 「Create Credential」
3. 「Google」を検索して選択
4. Service Account方式を選択：

**Google Cloud Console設定:**
1. https://console.cloud.google.com にアクセス
2. 新しいプロジェクト作成: 「ChikoPostSystem」
3. APIs & Services → Library
4. 「Google Sheets API」を有効化
5. 「Credentials」→「Create Credentials」→「Service Account」
6. サービスアカウント名: 「n8n-sheets-access」
7. JSONキーをダウンロード

**n8nでの設定:**
1. Credential Name: 「Google Sheets Access」
2. Service Account Email: [JSONファイルのclient_email値]
3. Private Key: [JSONファイルのprivate_key値]

### 3-2. X (Twitter) 認証
1. 「Create Credential」→「Twitter」
2. 以下の情報を入力：

```
Credential Name: X Auto Post
Consumer Key: [X DeveloperのAPI Key]
Consumer Secret: [X DeveloperのAPI Key Secret]  
Access Token: [X DeveloperのAccess Token]
Access Token Secret: [X DeveloperのAccess Token Secret]
```

3. 「Save」をクリック
4. 「Test」で接続確認

## 4. ワークフロー作成準備

### 4-1. 新しいワークフロー作成
1. 「Workflows」→「Create Workflow」
2. ワークフロー名: 「X自動投稿システム」
3. 説明: 「Googleスプレッドシートから承認済み投稿を自動でXに投稿」

### 4-2. 基本設定
1. 「Settings」タブ
2. Timezone: Asia/Tokyo
3. Save Data on Error: ON（エラー時のデバッグ用）
4. Save Data on Success: ON（実行履歴保存用）

## 5. 環境変数の設定

### 5-1. Environment Variables
n8nで使用する変数を事前に設定：

```
SPREADSHEET_ID: [GoogleスプレッドシートのID]
SHEET_NAME: シート1
STATUS_APPROVED: 承認済み
STATUS_COMPLETED: 投稿完了
STATUS_ERROR: エラー
```

### 5-2. スプレッドシートID取得方法
GoogleスプレッドシートのURLから取得：
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
                                        ↑ここの部分
```

## 6. テスト環境準備

### 6-1. テスト用データ
スプレッドシートに以下のテストデータを準備：

```
ID: 1
投稿内容: 【テスト】n8n自動投稿システムのテストです #n8ntest
投稿種類: テスト  
ステータス: 承認済み
投稿予定日時: [現在時刻の5分後]
```

### 6-2. 段階的テスト計画
1. **Phase 1**: 各ノード個別テスト
2. **Phase 2**: ワークフロー全体テスト（手動実行）
3. **Phase 3**: スケジュール実行テスト
4. **Phase 4**: エラーハンドリングテスト

✅ n8n基本設定完了！

## 次のステップ
具体的なワークフローの構築に進みます。