# 見積書生成

引数: $ARGUMENTS
使い方の例:
- `/quote 株式会社〇〇 wordpress 下層5ページ`
- `/quote 株式会社〇〇 studio 下層3ページ`

## 実行手順

### 1. 引数の解析
以下を引数から読み取る:
- クライアント名
- プラン（wordpress / studio）
- 下層ページ数

### 2. 参照ファイルの確認
既存の見積書を参考に読む:
- WordPress版参考: `/Users/saeki/Downloads/AI/03_請求書・契約/ai-invoice-tool/output/JFEチュービック株式会社/info.json`
- Studio版参考: `/Users/saeki/Downloads/AI/03_請求書・契約/ai-invoice-tool/output/JFEチュービック株式会社/info_studio.json`

### 3. info.jsonの生成
参考ファイルをベースに以下のルールで新しいinfo.jsonを作成する:
- `client`: クライアント名
- `project_name`: "ホームページ制作"
- `date`: 今日の日付（YYYY-MM-DD形式）
- 下層ページの `quantity`: 引数のページ数に変更
- Studio版はWordPress実装・サーバー設定を除外
- **備考欄は常に空白**

保存先: `/Users/saeki/Downloads/AI/03_請求書・契約/ai-invoice-tool/output/[クライアント名]/info.json`

### 4. PDF生成
```bash
cd "/Users/saeki/Downloads/AI/03_請求書・契約/ai-invoice-tool"
python quote.py
```

### 5. 完了報告
生成したPDFのパスと見積もり合計金額を報告する。
