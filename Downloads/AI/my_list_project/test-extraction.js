const puppeteer = require('puppeteer');
const CompanyInfoExtractor = require('./company-extractor');

async function testExtraction(testUrl) {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    try {
        console.log(`\n🔍 テストURL: ${testUrl}`);
        await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // company-extractor.jsのコードをページに注入
        await page.addScriptTag({ path: './company-extractor.js' });
        
        const companyInfo = await page.evaluate(() => {
            const extractor = new CompanyInfoExtractor();
            return extractor.extractAllInfo(document);
        });
        
        // 社長名が取得できなかった場合、aboutページから取得を試みる
        if (!companyInfo.ceoName || companyInfo.ceoName === '') {
            console.log('ℹ️  トップページで社長名が見つからないため、aboutページを探しています...');
            
            const aboutUrl = await page.evaluate(() => {
                const aboutKeywords = [
                    'about', '私たちについて', '会社概要', '会社案内', '会社情報',
                    '企業情報', '企業概要', '紹介', 'company', 'corporate'
                ];
                
                const links = document.querySelectorAll('a[href]');
                for (const link of links) {
                    const text = (link.textContent || '').toLowerCase();
                    const href = link.getAttribute('href') || '';
                    
                    if (!href || href.startsWith('javascript:') || href.startsWith('#')) continue;
                    
                    for (const keyword of aboutKeywords) {
                        if (text.includes(keyword.toLowerCase()) || 
                            href.toLowerCase().includes(keyword.toLowerCase())) {
                            const extractor = new CompanyInfoExtractor();
                            return extractor.normalizeUrl(href, document.location.href);
                        }
                    }
                }
                return null;
            });
            
            if (aboutUrl) {
                console.log(`📄 Aboutページ発見: ${aboutUrl}`);
                await page.goto(aboutUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                
                // ページ遷移後にスクリプトを再注入
                await page.addScriptTag({ path: './company-extractor.js' });
                
                const ceoName = await page.evaluate(() => {
                    const extractor = new CompanyInfoExtractor();
                    return extractor.extractCEOName(document);
                });
                
                if (ceoName) {
                    console.log(`✅ Aboutページから社長名を取得: ${ceoName}`);
                    companyInfo.ceoName = ceoName;
                }
            }
        }
        
        console.log('\n=== 抽出結果 ===');
        console.log(`会社名: ${companyInfo.companyName || 'なし'}`);
        console.log(`社長名: ${companyInfo.ceoName || 'なし'}`);
        console.log(`お問合せURL: ${companyInfo.contactUrl || 'なし'}`);
        console.log(`FVテキスト: ${companyInfo.fvText || 'なし'}`);
        console.log(`強み: ${companyInfo.strengths || 'なし'}`);
        console.log(`制作実績ページ: ${companyInfo.hasPortfolio ? 'あり' : 'なし'}`);
        console.log(`制作実績URL: ${companyInfo.portfolioUrl || 'なし'}`);
        console.log('================\n');
        
    } catch (error) {
        console.error('エラー:', error);
    } finally {
        await browser.close();
    }
}

// テスト実行
(async () => {
    // テストしたいURLを指定（中小のWeb制作会社）
    const testUrls = [
        'https://www.lancers.co.jp/',  // ランサーズ
        'https://www.chatwork.com/ja/',  // Chatwork
        'https://www.base.co.jp/'  // BASE
    ];
    
    for (const url of testUrls) {
        await testExtraction(url);
    }
})();