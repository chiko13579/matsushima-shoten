const { google } = require('googleapis');
const fs = require('fs');
const csv = require('csv-parse/sync');

// 設定
const SPREADSHEET_ID = '1Xhb0WtJHMePeaJmISlUqVxtpcy04G3m3i3gYh5PpcKY';
const SHEET_NAME = '投稿管理';
const SERVICE_ACCOUNT_FILE = '/Users/saeki/Downloads/x-auto-poster-466609-d2a40365318b.json';
const CSV_FILE = '/Users/saeki/Downloads/img/X_project/claude_templates/投稿データ.csv';

async function importCsvToSheets() {
    try {
        // サービスアカウントの認証情報を読み込む
        const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
        
        // 認証設定
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        
        const sheets = google.sheets({ version: 'v4', auth });
        
        // CSVファイルを読み込む
        const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
        const records = csv.parse(csvContent, {
            columns: true,
            skip_empty_lines: true
        });
        
        console.log(`${records.length}件のデータを読み込みました`);
        
        // データを整形
        const values = records.map(record => [
            record.ID,
            record.投稿内容,
            record.投稿種類,
            record.ステータス,
            record.投稿予定日時 || '',
            record.実際投稿日時 || '',
            record.投稿URL || '',
            record.メモ || ''
        ]);
        
        // スプレッドシートに追加
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:H`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: values
            }
        });
        
        console.log(`✅ ${values.length}件のデータをスプレッドシートに追加しました！`);
        console.log(`スプレッドシートURL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
        
    } catch (error) {
        console.error('エラーが発生しました:', error.message);
    }
}

// 実行
importCsvToSheets();