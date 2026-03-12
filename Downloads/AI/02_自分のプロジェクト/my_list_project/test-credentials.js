const { google } = require('googleapis');
const credentials = require('./credentials.json');

async function testCredentials() {
    console.log('=== Google認証テスト ===');
    
    try {
        console.log('1. 認証情報の確認...');
        console.log(`Project ID: ${credentials.project_id}`);
        console.log(`Client Email: ${credentials.client_email}`);
        
        console.log('2. Google Auth初期化...');
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        
        console.log('3. アクセストークン取得...');
        const accessToken = await auth.getAccessToken();
        
        if (accessToken) {
            console.log('✅ アクセストークン取得成功');
            console.log(`Token: ${accessToken.token ? 'あり' : 'なし'}`);
        } else {
            console.log('❌ アクセストークン取得失敗');
        }
        
        console.log('4. Google Sheets API 初期化...');
        const sheets = google.sheets({ version: 'v4', auth });
        
        console.log('5. 簡単なAPI呼び出しテスト...');
        // Try to list spreadsheets (this should work without creating anything)
        const response = await sheets.spreadsheets.create({
            resource: {
                properties: {
                    title: 'テスト_' + Date.now()
                }
            }
        });
        
        if (response.data) {
            console.log('✅ スプレッドシート作成成功');
            console.log(`スプレッドシートID: ${response.data.spreadsheetId}`);
            console.log(`URL: https://docs.google.com/spreadsheets/d/${response.data.spreadsheetId}/edit`);
        }
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
        console.error('エラーコード:', error.code);
        console.error('エラー詳細:', error.details || 'なし');
        
        if (error.message.includes('unavailable')) {
            console.log('\n💡 Google Sheets APIが一時的に利用できない可能性があります。');
            console.log('   しばらく時間をおいてから再試行してください。');
        } else if (error.message.includes('permission')) {
            console.log('\n💡 権限エラーの可能性があります。');
            console.log('   1. Google Cloud Consoleでプロジェクトを確認');
            console.log('   2. Sheets APIが有効になっているか確認');
            console.log('   3. サービスアカウントの権限を確認');
        }
    }
}

testCredentials();