const SheetsHandler = require('./sheets-handler');

// テスト用のサンプルデータ
const sampleData = [
    {
        url: 'https://example1.com',
        companyName: 'サンプル会社A株式会社',
        ceoName: '田中 太郎',
        contactUrl: 'https://example1.com/contact',
        fvText: 'お客様の成功を支援するWebソリューション',
        strengths: '10年以上の実績と高い技術力でお客様のビジネスを支援',
        portfolioUrl: 'https://example1.com/works',
        hasPortfolio: true
    },
    {
        url: 'https://example2.com',
        companyName: 'テスト制作株式会社',
        ceoName: '佐藤 花子',
        contactUrl: 'https://example2.com/inquiry',
        fvText: '創造性と技術の融合で最高のWebサイトを',
        strengths: 'デザイン力とSEO対策で集客効果の高いサイトを制作',
        portfolioUrl: 'https://example2.com/portfolio',
        hasPortfolio: true
    }
];

async function testWithExistingSpreadsheet() {
    console.log('=== 既存スプレッドシートへのデータ追加テスト ===');
    console.log('');
    
    // ユーザーにスプレッドシートIDの入力を求める
    console.log('📋 テスト手順:');
    console.log('1. Google Sheets (https://sheets.google.com) で新しいスプレッドシートを作成');
    console.log('2. 右上の「共有」ボタンをクリック');
    console.log('3. 以下のメールアドレスを「編集者」として追加:');
    console.log('   web-company-scraper@x-auto-poster-466609.iam.gserviceaccount.com');
    console.log('4. URLからスプレッドシートIDをコピー');
    console.log('   例: https://docs.google.com/spreadsheets/d/【ここの部分】/edit');
    console.log('');
    
    // スプレッドシートIDの例
    const EXAMPLE_SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // これは例です
    
    console.log('⚠️  実際にテストするには、上記の手順でスプレッドシートを作成し、');
    console.log('    このファイルの EXAMPLE_SPREADSHEET_ID を置き換えてください。');
    console.log('');
    
    const sheetsHandler = new SheetsHandler();
    
    try {
        console.log('🔑 Google Sheets API 初期化中...');
        const isInitialized = await sheetsHandler.init();
        
        if (!isInitialized) {
            console.error('❌ API初期化に失敗しました');
            return;
        }
        
        console.log('✅ API初期化成功');
        
        // テスト: 既存のスプレッドシートにデータを追加
        console.log('📊 既存スプレッドシートにデータを追加中...');
        console.log(`使用するスプレッドシートID: ${EXAMPLE_SPREADSHEET_ID}`);
        
        const result = await sheetsHandler.addToExistingSpreadsheet(
            EXAMPLE_SPREADSHEET_ID, 
            sampleData, 
            'テスト地域'
        );
        
        if (result.success) {
            console.log('✅ データ追加成功！');
            console.log(`📊 追加された行数: ${result.addedRows}`);
            console.log(`📊 スプレッドシートを確認: https://docs.google.com/spreadsheets/d/${EXAMPLE_SPREADSHEET_ID}/edit`);
        } else {
            console.error('❌ データ追加失敗:', result.error);
            
            if (result.error.includes('not found')) {
                console.log('💡 スプレッドシートが見つかりません。IDを確認してください。');
            } else if (result.error.includes('permission')) {
                console.log('💡 権限エラー: サービスアカウントがスプレッドシートにアクセスできません。');
                console.log('   スプレッドシートの共有設定を確認してください。');
            }
        }
        
    } catch (error) {
        console.error('❌ テスト中にエラー:', error.message);
    }
}

// 実際のスプレッドシートIDを使用する関数
async function testWithUserSpreadsheet(spreadsheetId) {
    console.log(`=== スプレッドシートID: ${spreadsheetId} でテスト ===`);
    
    const sheetsHandler = new SheetsHandler();
    
    try {
        await sheetsHandler.init();
        
        const result = await sheetsHandler.addToExistingSpreadsheet(
            spreadsheetId, 
            sampleData, 
            'テスト地域'
        );
        
        if (result.success) {
            console.log('✅ 成功！スプレッドシートを確認してください。');
            console.log(`📊 URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
        } else {
            console.error('❌ 失敗:', result.error);
        }
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    }
}

// コマンドライン引数でスプレッドシートIDが指定された場合
const args = process.argv.slice(2);
if (args.length > 0 && args[0]) {
    testWithUserSpreadsheet(args[0]);
} else {
    testWithExistingSpreadsheet();
}