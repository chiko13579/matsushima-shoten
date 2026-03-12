const puppeteer = require('puppeteer');
const CompanyInfoExtractor = require('./company-extractor');

async function testPortfolioExtraction(testUrl) {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    try {
        console.log(`\n🔍 制作実績テスト URL: ${testUrl}`);
        await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // company-extractor.jsのコードをページに注入
        await page.addScriptTag({ path: './company-extractor.js' });
        
        const portfolioInfo = await page.evaluate(() => {
            const extractor = new CompanyInfoExtractor();
            
            // 制作実績の有無と URL を取得
            const hasPortfolio = extractor.checkPortfolioExists(document);
            const portfolioUrl = extractor.findPortfolioUrl(document);
            
            // デバッグ情報も収集
            const debugInfo = {
                // ページ内の制作実績関連リンクを探す
                portfolioLinks: [],
                navLinks: [],
                allLinks: []
            };
            
            // ナビゲーション内のリンクをチェック
            const navSelectors = [
                'nav a', 'header a', '.menu a', '.navigation a', '.nav a',
                '.header-menu a', '.global-nav a', '.main-nav a', '.navbar a'
            ];
            
            for (const selector of navSelectors) {
                const links = document.querySelectorAll(selector);
                for (const link of links) {
                    const text = (link.textContent || '').trim();
                    const href = link.getAttribute('href') || '';
                    if (text && href) {
                        debugInfo.navLinks.push({ text, href });
                    }
                }
            }
            
            // 制作実績関連のキーワードを含むリンクを探す
            const portfolioKeywords = [
                '実績', 'ポートフォリオ', '制作事例', 'portfolio', 'works', 'work',
                '事例', '導入事例', '制作実績', 'case study', 'gallery', 'project',
                '作品', '活動実績', 'achievement', 'お仕事', '成果物'
            ];
            
            const allLinks = document.querySelectorAll('a[href]');
            for (const link of allLinks) {
                const text = (link.textContent || '').toLowerCase();
                const href = link.getAttribute('href') || '';
                
                for (const keyword of portfolioKeywords) {
                    if (text.includes(keyword.toLowerCase()) || 
                        href.toLowerCase().includes(keyword.toLowerCase())) {
                        debugInfo.portfolioLinks.push({
                            text: link.textContent?.trim() || '',
                            href: href,
                            matchedKeyword: keyword
                        });
                        break;
                    }
                }
            }
            
            // 全リンクの統計
            debugInfo.allLinks = Array.from(allLinks).slice(0, 10).map(link => ({
                text: (link.textContent || '').trim().substring(0, 50),
                href: link.getAttribute('href') || ''
            }));
            
            return {
                hasPortfolio,
                portfolioUrl,
                debugInfo
            };
        });
        
        console.log('\n=== 制作実績抽出結果 ===');
        console.log(`制作実績ページ: ${portfolioInfo.hasPortfolio ? 'あり' : 'なし'}`);
        console.log(`制作実績URL: ${portfolioInfo.portfolioUrl || 'なし'}`);
        
        console.log('\n=== デバッグ情報 ===');
        console.log(`ナビゲーションリンク数: ${portfolioInfo.debugInfo.navLinks.length}`);
        console.log(`制作実績関連リンク数: ${portfolioInfo.debugInfo.portfolioLinks.length}`);
        
        if (portfolioInfo.debugInfo.portfolioLinks.length > 0) {
            console.log('\n制作実績関連リンク:');
            portfolioInfo.debugInfo.portfolioLinks.forEach((link, index) => {
                console.log(`  ${index + 1}. "${link.text}" → ${link.href} (キーワード: ${link.matchedKeyword})`);
            });
        }
        
        if (portfolioInfo.debugInfo.navLinks.length > 0) {
            console.log('\nナビゲーションリンク（最初の10個）:');
            portfolioInfo.debugInfo.navLinks.slice(0, 10).forEach((link, index) => {
                console.log(`  ${index + 1}. "${link.text}" → ${link.href}`);
            });
        }
        
        console.log('========================\n');
        
    } catch (error) {
        console.error('エラー:', error);
    } finally {
        await browser.close();
    }
}

// シンプルなHTMLテストも追加
async function testPortfolioSimple() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    try {
        console.log('\n🔍 制作実績 - シンプルテスト');
        
        // テスト用のHTMLを作成
        const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Web制作会社テスト</title>
        </head>
        <body>
            <header>
                <nav class="main-nav">
                    <ul>
                        <li><a href="/">ホーム</a></li>
                        <li><a href="/about">会社概要</a></li>
                        <li><a href="/works">制作実績</a></li>
                        <li><a href="/portfolio">ポートフォリオ</a></li>
                        <li><a href="/contact">お問い合わせ</a></li>
                    </ul>
                </nav>
            </header>
            
            <main>
                <section>
                    <h1>Web制作会社テスト</h1>
                    <p>私たちの<a href="/case-study">制作事例</a>をご覧ください。</p>
                </section>
                
                <div class="sidebar">
                    <a href="/gallery">ギャラリー</a>
                    <a href="/projects">プロジェクト</a>
                </div>
            </main>
            
            <footer>
                <a href="/works/web">Web制作実績</a>
            </footer>
        </body>
        </html>
        `;
        
        await page.setContent(testHtml);
        
        // company-extractor.jsのコードをページに注入
        await page.addScriptTag({ path: './company-extractor.js' });
        
        const results = await page.evaluate(() => {
            const extractor = new CompanyInfoExtractor();
            const hasPortfolio = extractor.checkPortfolioExists(document);
            const portfolioUrl = extractor.findPortfolioUrl(document);
            return { hasPortfolio, portfolioUrl };
        });
        
        console.log('=== シンプルテスト結果 ===');
        console.log(`制作実績ページ: ${results.hasPortfolio ? 'あり' : 'なし'}`);
        console.log(`制作実績URL: ${results.portfolioUrl || 'なし'}`);
        console.log('========================\n');
        
    } catch (error) {
        console.error('エラー:', error);
    } finally {
        await browser.close();
    }
}

// テスト実行
(async () => {
    // まずシンプルなHTMLテスト
    await testPortfolioSimple();
    
    // 実際のWeb制作会社でテスト
    const testUrls = [
        'https://www.digitalcube.jp/',  // デジタルキューブ
        'https://www.fenrir-inc.com/jp/',  // フェンリル
        'https://www.tam-tam.co.jp/',  // TAM
        'https://www.granfairs.com/',  // グランフェアズ
        'https://baigie.me/'  // ベイジ
    ];
    
    for (const url of testUrls) {
        await testPortfolioExtraction(url);
    }
})();