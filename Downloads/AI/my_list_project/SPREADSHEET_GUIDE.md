# Google スプレッドシートIDを使用したデータ追加ガイド

## 手順1: Google スプレッドシートを作成して共有する

1. **Google Sheetsで新しいスプレッドシートを作成**
   - https://sheets.google.com にアクセス
   - 「+」ボタンをクリックして新しいスプレッドシートを作成

2. **スプレッドシートIDを確認**
   - URLから確認できます
   - 例: `https://docs.google.com/spreadsheets/d/1234567890abcdef/edit`
   - この場合、`1234567890abcdef` がスプレッドシートIDです

3. **サービスアカウントと共有**
   - 右上の「共有」ボタンをクリック
   - メールアドレス欄に以下を入力:
     ```
     web-company-scraper@x-auto-poster-466609.iam.gserviceaccount.com
     ```
   - 「編集者」権限を選択
   - 「送信」をクリック

## 手順2: コードを更新してスプレッドシートIDを使用

### 方法A: 環境変数として設定（推奨）

1. `.env`ファイルを作成:
```bash
SPREADSHEET_ID=あなたのスプレッドシートID
```

2. コードで使用:
```javascript
const spreadsheetId = process.env.SPREADSHEET_ID;
```

### 方法B: 設定ファイルに保存

1. `config.json`を作成:
```json
{
  "spreadsheetId": "あなたのスプレッドシートID"
}
```

### 方法C: web-app.htmlに直接入力欄を追加

HTMLに入力フィールドを追加して、ユーザーが直接スプレッドシートIDを入力できるようにする。

## 実装例

以下のコードをプロジェクトに追加します。