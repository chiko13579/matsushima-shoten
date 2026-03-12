const SheetsHandler = require('./sheets-handler');

async function testSheetsAPI() {
    console.log('=== Google Sheets API テスト ===');
    
    const sheetsHandler = new SheetsHandler();
    
    try {
        // 初期化テスト
        console.log('1. API初期化テスト...');
        const isInitialized = await sheetsHandler.init();
        
        if (!isInitialized) {
            console.error('❌ API初期化に失敗しました');
            return;
        }
        
        console.log('✅ API初期化成功');
        
        // 簡単なテストデータ
        const testData = [
            {
                url: 'https://example.com',
                companyName: 'テスト株式会社',
                ceoName: '山田 太郎',
                contactUrl: 'https://example.com/contact',
                fvText: 'テスト用のFVテキストです',
                strengths: 'テスト用の強みです',
                portfolioUrl: 'https://example.com/portfolio',
                hasPortfolio: true
            }
        ];
        
        // スプレッドシート作成テスト
        console.log('2. スプレッドシート作成テスト...');
        const result = await sheetsHandler.saveToSpreadsheet(testData, 'テスト地域');
        
        if (result.success) {
            console.log('✅ スプレッドシート作成成功');
            console.log(`📊 スプレッドシートURL: ${result.spreadsheetUrl}`);
            console.log(`📊 スプレッドシートID: ${result.spreadsheetId}`);
        } else {
            console.error('❌ スプレッドシート作成失敗:', result.error);
        }
        
    } catch (error) {
        console.error('❌ テスト中にエラーが発生:', error.message);
        console.error('詳細:', error);
    }
}

// テスト実行
testSheetsAPI();