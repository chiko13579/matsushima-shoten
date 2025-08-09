const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

// 設定
const SPREADSHEET_ID = '1Xhb0WtJHMePeaJmISlUqVxtpcy04G3m3i3gYh5PpcKY';
const SHEET_NAME = '投稿管理';
const SERVICE_ACCOUNT_FILE = '/Users/saeki/Downloads/x-auto-poster-466609-d2a40365318b.json';

// 質問を行う関数
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise(resolve => {
        rl.question(query, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

// スプレッドシートに投稿を追加する関数
async function addToSpreadsheet(posts) {
    try {
        // サービスアカウントの認証情報を読み込む
        const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));
        
        // 認証設定
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        
        const sheets = google.sheets({ version: 'v4', auth });
        
        // 既存データの最後のIDを取得
        const existingData = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:A`
        });
        
        let lastId = 1000;
        if (existingData.data.values && existingData.data.values.length > 1) {
            const ids = existingData.data.values.slice(1).map(row => parseInt(row[0])).filter(id => !isNaN(id));
            if (ids.length > 0) {
                lastId = Math.max(...ids);
            }
        }
        
        // 投稿データを整形
        const values = posts.map((post, index) => [
            lastId + index + 1,
            post.content,
            post.type,
            '未投稿',
            '',
            '',
            '',
            'Claude Code自動生成'
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
        
        console.log(`\n✅ ${values.length}件の投稿をスプレッドシートに追加しました！`);
        console.log(`ID範囲: ${lastId + 1} 〜 ${lastId + posts.length}`);
        console.log(`スプレッドシートURL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
        
    } catch (error) {
        console.error('エラーが発生しました:', error.message);
    }
}

// 投稿を生成してスプレッドシートに追加するメイン関数
async function generateAndAddPosts(posts) {
    console.log('\n--- 生成された投稿 ---');
    posts.forEach((post, index) => {
        console.log(`\n[${index + 1}] ${post.type}`);
        console.log(post.content);
        console.log('---');
    });
    
    // スプレッドシートに追加するか質問
    const answer = await askQuestion('\nこれらの投稿をスプレッドシートに自動追加しますか？ (y/n): ');
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await addToSpreadsheet(posts);
    } else {
        console.log('スプレッドシートへの追加をキャンセルしました。');
    }
}

// エクスポート
module.exports = {
    generateAndAddPosts,
    addToSpreadsheet
};