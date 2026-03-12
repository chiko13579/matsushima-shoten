const WebCompanyResearcher = require('./index');

async function debugSearch() {
    const researcher = new WebCompanyResearcher();
    
    try {
        console.log('🔍 デバッグ検索を開始します...');
        
        await researcher.init();
        
        // 単一のURLで詳細テスト
        const testUrl = 'https://www.lancers.co.jp/';
        console.log(`\n📋 URL: ${testUrl} の詳細情報を取得中...`);
        
        const companyInfo = await researcher.extractCompanyInfo(testUrl);
        
        console.log('\n=== 抽出結果詳細 ===');
        console.log('会社名:', companyInfo.companyName);
        console.log('社長名:', companyInfo.ceoName);
        console.log('お問合せURL:', companyInfo.contactUrl);
        console.log('FVテキスト:', companyInfo.fvText);
        console.log('強み:', companyInfo.strengths);
        console.log('制作実績ページ:', companyInfo.hasPortfolio);
        console.log('制作実績URL:', companyInfo.portfolioUrl);
        console.log('===================');
        
        console.log('\n🔍 JSON形式での出力:');
        console.log(JSON.stringify(companyInfo, null, 2));
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await researcher.close();
    }
}

// テスト実行
debugSearch();