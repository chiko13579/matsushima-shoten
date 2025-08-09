# 🔄 n8n ワークフロー構築手順

## 1. ワークフローのインポート

### 1-1. JSONワークフローのインポート
1. n8nにログイン
2. 「Workflows」→「Create Workflow」
3. 右上の「⋯」→「Import from JSON」
4. `n8n_workflow.json` の内容をコピーペースト
5. 「Import」をクリック

### 1-2. 環境変数の設定
「Settings」→「Environment Variables」で以下を設定：
```
SPREADSHEET_ID: [GoogleスプレッドシートのID]
SHEET_NAME: シート1
```

## 2. 各ノードの詳細設定

### 2-1. Schedule Trigger（15分間隔チェック）
```
⚙️ 設定内容:
- Trigger Interval: Every 15 minutes
- Start Time: 08:00 (朝8時から)
- End Time: 22:00 (夜10時まで)
```

**設定手順:**
1. Schedule Triggerノードをクリック
2. Rule → Interval → Minutes: 15
3. Advanced → Time Zone: Asia/Tokyo
4. Advanced → Between Times: 08:00 - 22:00

### 2-2. Google Sheets Read（スプレッドシート読み込み）
```
⚙️ 設定内容:
- Resource: Sheet
- Operation: Read
- Document ID: {{ $vars.SPREADSHEET_ID }}
- Sheet Name: {{ $vars.SHEET_NAME }}
- Range: A:H (全カラム)
```

**認証設定:**
1. Credentialsで「Google Sheets Access」を選択
2. Test Connectionで接続確認

### 2-3. Filter（承認済み投稿フィルター）
```
⚙️ 条件設定:
1. ステータス = '承認済み'
2. 投稿予定日時 <= 現在時刻  
3. 投稿内容が空でない
4. 条件結合: AND
```

**詳細設定:**
```javascript
// 条件1: ステータスチェック
{{ $json.ステータス }} equals '承認済み'

// 条件2: 時刻チェック  
{{ new Date($json['投稿予定日時']) }} before {{ new Date() }}

// 条件3: 内容チェック
{{ $json['投稿内容'] }} is not empty
```

### 2-4. Twitter Post（X投稿実行）
```
⚙️ 設定内容:
- Resource: Tweet
- Operation: Create
- Text: {{ $json['投稿内容'] }}
```

**認証設定:**
1. Credentialsで「X Auto Post」を選択
2. Test Connectionで接続確認

### 2-5. Success Update（投稿成功時更新）
```
⚙️ 更新内容:
- ステータス(D列): '投稿完了'
- 実際投稿日時(F列): 現在時刻
- 投稿URL(G列): TwitterのURL
```

**範囲指定:**
```
Range: D{{ $('スプレッドシート読み込み').item.json.__rowNumber }}:G{{ $('スプレッドシート読み込み').item.json.__rowNumber }}
```

### 2-6. Error Update（投稿エラー時更新）
```
⚙️ 更新内容:
- ステータス(D列): 'エラー'  
- メモ(H列): エラーメッセージ
```

## 3. エラーハンドリング設定

### 3-1. Twitter Postのエラー処理
1. Twitter Postノードを選択
2. 「On Error」→「Continue」
3. エラー時の接続先を「投稿エラー時更新」に設定

### 3-2. リトライ設定
```
⚙️ 設定:
- Retry on Fail: 3回
- Wait Between Retries: 10秒
```

## 4. テスト実行

### 4-1. 手動テスト
1. スプレッドシートにテストデータを追加：
```
ID: 999
投稿内容: 【テスト】n8n自動投稿システムのテスト投稿です #n8ntest
投稿種類: テスト
ステータス: 承認済み
投稿予定日時: [現在時刻の1分前]
```

2. n8nで「Execute Workflow」をクリック
3. 各ノードの実行結果を確認

### 4-2. 結果確認
✅ **成功パターン:**
- X に投稿される
- スプレッドシートのステータスが「投稿完了」に更新
- 投稿URLが記録される

❌ **エラーパターン:**
- スプレッドシートのステータスが「エラー」に更新  
- メモ欄にエラー詳細が記録される

## 5. 本番運用設定

### 5-1. ワークフロー有効化
1. ワークフロー画面の「Active」トグルをON
2. 「Save」で保存

### 5-2. 実行履歴の確認
1. 「Executions」タブで実行履歴を確認
2. エラーが発生した場合は詳細を確認

### 5-3. 監視設定
- 毎日実行結果を確認
- エラー発生時はスプレッドシートのメモ欄を確認
- 月末に投稿数をチェック（1,500投稿以内）

## 6. 運用フロー

### 6-1. 日常運用
```
1. 投稿コンテンツをスプレッドシートに追加
2. ステータスを「承認済み」に変更
3. 投稿予定日時を設定
4. n8nが自動で15分間隔でチェック・投稿
5. 投稿後、自動でステータス更新
```

### 6-2. トラブルシューティング
```
⚠️ よくある問題と対処:
- 投稿されない → フィルター条件を確認
- エラーになる → API制限・認証を確認  
- 文字化け → 日本語文字コードを確認
```

✅ ワークフロー設定完了！自動投稿システムの稼働開始です🚀