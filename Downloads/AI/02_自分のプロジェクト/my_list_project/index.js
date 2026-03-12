const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const readlineSync = require('readline-sync');
const CompanyInfoExtractor = require('./company-extractor');
const SheetsHandler = require('./sheets-handler');
const fs = require('fs').promises;

class WebCompanyResearcher {
    constructor() {
        this.browser = null;
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-extensions',
                '--no-first-run',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        });
    }

    async searchWebCompanies(location, maxResults = 10) {
        const page = await this.browser.newPage();
        
        try {
            // 複数の検索クエリを試す
            const searchQueries = [
                `${location} Web制作会社`,
                `${location} ホームページ制作`,
                `${location} Webデザイン`,
                `${location} IT システム開発`,
                `${location} デジタルマーケティング`,
                `${location} アプリ開発`,
                `${location} ECサイト制作`,
                `${location} Webシステム開発`,
                `${location} UI/UXデザイン`,
                `${location} Webコンサルティング`
            ];
            
            let allResults = [];
            
            for (const searchQuery of searchQueries) {
                console.log(`検索中: ${searchQuery}`);
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
                
                // ユーザーエージェントを設定（自動化検出を回避）
                await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                
                // 自動化検出を回避
                await page.evaluateOnNewDocument(() => {
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                    });
                });
                
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
                });
                
                await page.goto(searchUrl, { 
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                
                // より長く待機してページの読み込みを確実にする
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // 検索結果があることを確認（セレクターに依存しない方法）
                const hasContent = await page.evaluate(() => {
                    return document.body.textContent.length > 1000;
                });
                
                if (!hasContent) {
                    console.log(`ページの読み込みが不完全: ${searchQuery}`);
                    continue;
                }
                
                const results = await page.evaluate((maxResults, searchQuery) => {
                const searchResults = [];
                console.log(`ページ評価開始: ${searchQuery}`);
                
                // より広範囲にリンクを探す
                const selectors = [
                    'a[href^="http"]:not([href*="google.com"]):not([href*="youtube.com"]):not([href*="maps.google"])',
                    'a[href^="https"]:not([href*="google.com"]):not([href*="youtube.com"])',
                    'a[data-ved]',
                    'a[jsaction]',
                    'a[ping]',
                    '.g a',
                    '.rc a',
                    '.r a',
                    '[role="link"]',
                    'h3 > a',
                    'cite ~ a'
                ];
                
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    console.log(`セレクター ${selector}: ${elements.length} 個の要素を発見`);
                    
                    for (let i = 0; i < Math.min(50, elements.length); i++) {
                        const element = elements[i];
                        let href = element.getAttribute('href');
                        let titleElement = element;
                        
                        // h3の場合は親のaタグからhrefを取得
                        if (element.tagName === 'H3') {
                            const parentA = element.closest('a');
                            if (parentA) {
                                href = parentA.getAttribute('href');
                                titleElement = element;
                            }
                        }
                        
                        // より厳格なフィルタリング - 転職サイトや求人サイトを除外
                        if (href && href.startsWith('http') && 
                            !href.includes('google.com') && 
                            !href.includes('youtube.com') && 
                            !href.includes('facebook.com') && 
                            !href.includes('twitter.com') && 
                            !href.includes('instagram.com') && 
                            !href.includes('maps.google') && 
                            !href.includes('translate.google') &&
                            !href.includes('geekly.co.jp') &&
                            !href.includes('rikunabi.com') &&
                            !href.includes('mynavi.jp') &&
                            !href.includes('doda.jp') &&
                            !href.includes('indeed.com') &&
                            !href.includes('bizreach.jp') &&
                            !href.includes('type.jp') &&
                            !href.includes('en-japan.com') &&
                            !href.includes('recruit.co.jp') &&
                            !href.includes('careercross.com') &&
                            !href.includes('wantedly.com') &&
                            !href.includes('find-job.net') &&
                            !href.includes('web-kanji.com') &&
                            !href.includes('web-tsuhan.jp') &&
                            !href.includes('nulab.com') &&
                            !href.includes('ferret-plus.com') &&
                            !href.includes('techacademy.jp') &&
                            !href.includes('webdesignmagazine.net') &&
                            !href.includes('biz.ne.jp') &&
                            !href.includes('ikkatsu.jp') &&
                            !href.includes('comparebiz.net') &&
                            !href.includes('goodfirms.co') &&
                            !href.includes('web-homepage.jp') &&
                            !href.includes('hp-seisaku.net') &&
                            !href.includes('directorbank.co.jp') &&
                            !href.includes('applied-g.jp') &&
                            !href.includes('comparebiz.net') &&
                            !href.includes('imitsu.jp') &&
                            !href.includes('nulab.com') &&
                            !href.includes('lancers.jp') &&
                            !href.includes('crowdworks.jp') &&
                            !href.includes('coconala.com') &&
                            !href.includes('hub-tokyo.com') &&
                            !href.includes('startuplist.jp') &&
                            !href.includes('liskul.com') &&
                            !href.includes('marketing-bank.jp') &&
                            !href.includes('ferret-one.com') &&
                            !href.includes('popinsight.jp') &&
                            !href.includes('ysinc.co.jp') &&
                            !href.includes('qopo.co.jp') &&
                            !href.includes('geo-code.co.jp') &&
                            !href.includes('webclimb.co.jp') &&
                            !href.includes('media.') &&
                            !href.includes('blog') &&
                            !href.includes('mag') &&
                            !href.startsWith('https://www.google.')) {
                            const title = titleElement.textContent || titleElement.innerText || '';
                            
                            if (title && title.length > 3) {
                                // 検索条件を大幅に緩和 - より多くの結果を取得
                                const keywords = ['Web', 'ウェブ', 'web', '制作', 'デザイン', '開発', 'サイト', 'ホームページ', 'HP', 'システム', 'クリエイティブ', 'IT', 'DX', 'プログラミング', 'コーディング', 'UI', 'UX', 'グラフィック', 'ブランディング', 'マーケティング', 'SEO', 'ECサイト', 'CMS', 'WordPress', 'デジタル', 'アプリ', 'ソフトウェア', 'テクノロジー', 'インターネット', 'オンライン', '株式会社', '会社', 'Company', 'スタジオ', 'オフィス', 'ラボ', 'エージェンシー'];
                                
                                // Web制作会社に特化したマッチング条件
                                const webKeywords = ['Web制作', 'web制作', 'ホームページ制作', 'Webデザイン', 'webデザイン', 'サイト制作', 'HP制作'];
                                const hasWebKeyword = webKeywords.some(keyword => 
                                    title.includes(keyword) || href.includes(keyword)
                                );
                                
                                const generalKeywords = ['Web', 'ウェブ', 'web', '制作', 'デザイン', '開発', 'システム', 'IT'];
                                const hasGeneralKeyword = generalKeywords.some(keyword => 
                                    title.toLowerCase().includes(keyword.toLowerCase()) ||
                                    href.toLowerCase().includes(keyword.toLowerCase())
                                );
                                
                                // 企業サイトの可能性が高いドメイン
                                const isCompanyDomain = href.includes('.co.jp') || 
                                                      (href.includes('.com') && !href.includes('blogspot') && !href.includes('wordpress'));
                                
                                // 比較サイト・紹介サイトのタイトルを除外
                                const isComparisonSite = title.includes('比較') || 
                                                        title.includes('おすすめ') || 
                                                        title.includes('厳選') || 
                                                        title.includes('選び方') || 
                                                        title.includes('ランキング') || 
                                                        title.includes('まとめ') || 
                                                        title.includes('費用相場') ||
                                                        title.includes('社をプロが') ||
                                                        title.includes('制作会社○○社') ||
                                                        title.includes('業界最安値') ||
                                                        title.includes('99,800円から') ||
                                                        title.includes('丸投げOK') ||
                                                        title.includes('実力のある') ||
                                                        title.includes('Web制作会社5選') ||
                                                        title.includes('Web制作会社8選') ||
                                                        title.includes('Web制作会社36選') ||
                                                        title.includes('徹底比較') ||
                                                        title.includes('でおすすめの') ||
                                                        title.includes('HP作成でおすすめ') ||
                                                        /制作会社\d+選/.test(title) ||
                                                        /\d+社/.test(title);
                                
                                const hasKeyword = hasWebKeyword || (hasGeneralKeyword && isCompanyDomain);
                                
                                if (hasKeyword && !isComparisonSite) {
                                    // ドメインベースの重複チェック（同じドメインから複数ページを取得しない）
                                    try {
                                        const domain = new URL(href).hostname;
                                        const isDuplicateDomain = searchResults.some(result => {
                                            try {
                                                return new URL(result.url).hostname === domain;
                                            } catch {
                                                return false;
                                            }
                                        });
                                        
                                        if (!isDuplicateDomain) {
                                            searchResults.push({
                                                url: href,
                                                title: title.trim()
                                            });
                                        }
                                    } catch (error) {
                                        // URL parsing error - skip this result
                                    }
                                }
                            }
                        }
                    }
                    
                    // 十分な結果が得られたら終了
                    if (searchResults.length >= maxResults) break;
                }
                
                console.log(`検索結果総数: ${searchResults.length}`);
                return searchResults.slice(0, Math.ceil(maxResults / 5) + 5);
                }, Math.ceil(maxResults / 5) + 5, searchQuery);
                
                // 結果をマージ
                console.log(`${searchQuery} で ${results.length} 件の結果を取得`);
                allResults.push(...results);
                
                // 十分な結果が得られた場合は終了
                if (allResults.length >= maxResults) {
                    console.log(`十分な結果を取得済み: ${allResults.length}/${maxResults}`);
                    break;
                }
                
                // 次の検索まで少し待機
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // 重複を除去し、要求された数まで結果を返す
            const uniqueResults = [];
            const seenUrls = new Set();
            
            for (const result of allResults) {
                if (!seenUrls.has(result.url) && uniqueResults.length < maxResults) {
                    seenUrls.add(result.url);
                    uniqueResults.push(result);
                }
            }
            
            await page.close();
            return uniqueResults;
            
        } catch (error) {
            console.error('検索エラー:', error.message);
            await page.close();
            return [];
        }
    }

    async extractCompanyInfo(url) {
        const page = await this.browser.newPage();
        
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // company-extractor.jsのコードをページに注入
            await page.addScriptTag({ path: './company-extractor.js' });
            
            const companyInfo = await page.evaluate(() => {
                const extractor = new CompanyInfoExtractor();
                const result = extractor.extractAllInfo(document);
                console.log('Extracted company info:', result);
                return result;
            });
            
            console.log(`Company info extracted for ${url}:`, companyInfo);
            
            // 社長名が取得できなかった場合、aboutページから取得を試みる
            if (!companyInfo.ceoName || companyInfo.ceoName === '') {
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
                    console.log(`Aboutページから社長名を取得中: ${aboutUrl}`);
                    await page.goto(aboutUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                    
                    // ページ遷移後にスクリプトを再注入
                    await page.addScriptTag({ path: './company-extractor.js' });
                    
                    const ceoName = await page.evaluate(() => {
                        const extractor = new CompanyInfoExtractor();
                        return extractor.extractCEOName(document);
                    });
                    
                    if (ceoName) {
                        companyInfo.ceoName = ceoName;
                    }
                }
            }
            
            await page.close();
            return companyInfo;
            
        } catch (error) {
            console.error(`情報抽出エラー (${url}):`, error.message);
            console.error('エラーの詳細:', error.stack);
            await page.close();
            return {
                companyName: '',
                ceoName: '',
                contactUrl: '',
                fvText: '',
                strengths: '',
                hasPortfolio: false,
                portfolioUrl: ''
            };
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    displayResults(companies) {
        console.log('\n' + '='.repeat(60));
        console.log('           Web制作会社調査結果');
        console.log('='.repeat(60));
        
        companies.forEach((company, index) => {
            console.log(`\n【${index + 1}】 ${company.title || company.companyName}`);
            console.log('┌' + '─'.repeat(58) + '┐');
            console.log(`│ URL: ${this.formatField(company.url, 51)}`);
            console.log(`│ 会社名: ${this.formatField(company.companyName || 'N/A', 47)}`);
            console.log(`│ 社長名: ${this.formatField(company.ceoName || 'N/A', 47)}`);
            console.log(`│ お問合せURL: ${this.formatField(company.contactUrl || 'N/A', 41)}`);
            console.log(`│ FVテキスト: ${this.formatField(company.fvText || 'N/A', 44)}`);
            console.log(`│ 強み: ${this.formatField(company.strengths || 'N/A', 49)}`);
            console.log(`│ 制作実績ページ: ${company.hasPortfolio ? 'あり' : 'なし'}${' '.repeat(37)}`);
            if (company.portfolioUrl) {
                console.log(`│ 制作実績URL: ${this.formatField(company.portfolioUrl, 41)}`);
            }
            console.log('└' + '─'.repeat(58) + '┘');
        });
        
        console.log(`\n検索完了: ${companies.length}社の情報を取得しました。`);
    }
    
    formatField(text, maxLength) {
        if (!text || text === 'N/A') return text + ' '.repeat(maxLength - text.length);
        
        if (text.length <= maxLength) {
            return text + ' '.repeat(maxLength - text.length);
        } else {
            return text.substring(0, maxLength - 3) + '...';
        }
    }
    
    async saveToFile(companies, location) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `web-companies-${location}-${timestamp}`;
        
        try {
            const jsonData = {
                searchLocation: location,
                searchDate: new Date().toISOString(),
                totalCompanies: companies.length,
                companies: companies.map(company => ({
                    url: company.url,
                    title: company.title,
                    companyName: company.companyName,
                    ceoName: company.ceoName,
                    contactUrl: company.contactUrl,
                    fvText: company.fvText,
                    strengths: company.strengths,
                    hasPortfolio: company.hasPortfolio,
                    portfolioUrl: company.portfolioUrl
                }))
            };
            
            await fs.writeFile(`${filename}.json`, JSON.stringify(jsonData, null, 2), 'utf8');
            console.log(`\n✅ 結果をJSONファイルに保存しました: ${filename}.json`);
            
            const csvHeaders = 'URL,会社名,社長名,お問合せURL,FVテキスト,強み,制作実績ページ,制作実績URL\n';
            const csvData = companies.map(company => [
                `"${company.url}"`,
                `"${company.companyName || ''}"`,
                `"${company.ceoName || ''}"`,
                `"${company.contactUrl || ''}"`,
                `"${(company.fvText || '').replace(/"/g, '""')}"`,
                `"${(company.strengths || '').replace(/"/g, '""')}"`,
                `"${company.hasPortfolio ? 'あり' : 'なし'}"`,
                `"${company.portfolioUrl || ''}"`
            ].join(',')).join('\n');
            
            await fs.writeFile(`${filename}.csv`, csvHeaders + csvData, 'utf8');
            console.log(`✅ 結果をCSVファイルに保存しました: ${filename}.csv`);
            
        } catch (error) {
            console.error('ファイル保存エラー:', error.message);
        }
    }
    
    async saveToSpreadsheet(companies, location) {
        try {
            const sheetsHandler = new SheetsHandler();
            
            console.log('\n📊 Googleスプレッドシートに保存中...');
            
            const existingId = readlineSync.question('既存のスプレッドシートに追加しますか？ (スプレッドシートIDを入力、新規作成の場合はEnter): ');
            
            let result;
            if (existingId && existingId.trim()) {
                result = await sheetsHandler.addToExistingSpreadsheet(existingId.trim(), companies, location);
                
                if (result.success) {
                    console.log(`✅ 既存のスプレッドシートに${result.addedRows}行を追加しました！`);
                    console.log(`📊 スプレッドシートURL: https://docs.google.com/spreadsheets/d/${existingId.trim()}`);
                } else {
                    console.log(`❌ 既存スプレッドシートへの追加に失敗: ${result.error}`);
                    console.log('新規スプレッドシートを作成します...');
                    result = await sheetsHandler.saveToSpreadsheet(companies, location);
                }
            } else {
                result = await sheetsHandler.saveToSpreadsheet(companies, location);
            }
            
            if (result.success) {
                console.log('✅ Googleスプレッドシートに保存完了！');
                console.log(`📊 スプレッドシートURL: ${result.spreadsheetUrl}`);
                console.log(`📋 スプレッドシートID: ${result.spreadsheetId}`);
                console.log('💡 次回は上記のIDを使用して同じスプレッドシートに追加できます。');
            } else {
                console.error(`❌ スプレッドシート保存エラー: ${result.error}`);
                if (result.error.includes('credentials.json')) {
                    console.log('📝 Google Sheets API の設定が必要です。SETUP.md を参照してください。');
                }
            }
            
        } catch (error) {
            console.error('スプレッドシート保存エラー:', error.message);
        }
    }
}

function validateInput(location) {
    const errors = [];
    
    if (!location || typeof location !== 'string') {
        errors.push('場所が入力されていません。');
    } else {
        const trimmedLocation = location.trim();
        if (trimmedLocation.length === 0) {
            errors.push('場所が入力されていません。');
        } else if (trimmedLocation.length < 2) {
            errors.push('場所は2文字以上で入力してください。');
        } else if (trimmedLocation.length > 50) {
            errors.push('場所は50文字以下で入力してください。');
        }
    }
    
    return errors;
}

function validateResultCount(count) {
    const errors = [];
    
    // 空文字は許可（デフォルト値使用）
    if (count.trim() === '') {
        return errors;
    }
    
    const num = parseInt(count.trim());
    
    if (isNaN(num)) {
        errors.push('数値を入力してください。');
    } else if (num < 1) {
        errors.push('1以上の数値を入力してください。');
    } else if (num > 20) {
        errors.push('20以下の数値を入力してください。');
    }
    
    return errors;
}

async function main() {
    const researcher = new WebCompanyResearcher();
    
    try {
        console.log('🔍 Web制作会社調査ツールを開始します...');
        console.log('このツールは転職活動での企業研究を支援します。\n');
        
        const SheetsHandler = require('./sheets-handler');
        const sheetsHandler = new SheetsHandler();
        const hasCredentials = await sheetsHandler.init();
        
        if (!hasCredentials) {
            console.log('📊 Google Sheets機能を使用するには設定が必要です。');
            const runSetup = readlineSync.question('セットアップウィザードを実行しますか？ (y/n): ');
            
            if (runSetup.toLowerCase() === 'y') {
                const SetupWizard = require('./setup-wizard');
                const wizard = new SetupWizard();
                const setupSuccess = await wizard.run();
                
                if (!setupSuccess) {
                    console.log('⚠️  Google Sheets機能は無効ですが、ローカルファイル保存は利用できます。\n');
                }
            } else {
                console.log('💡 後で設定する場合は: npm run setup\n');
            }
        }
        
        let location = '';
        let validationErrors = [];
        
        do {
            location = readlineSync.question('調査したい場所を入力してください (例: 東京, 大阪, 名古屋): ');
            validationErrors = validateInput(location);
            
            if (validationErrors.length > 0) {
                console.log('\n❌ 入力エラー:');
                validationErrors.forEach(error => console.log(`   ${error}`));
                console.log('');
            }
        } while (validationErrors.length > 0);
        
        location = location.trim();
        
        let maxResults = '';
        let resultValidationErrors = [];
        
        do {
            maxResults = readlineSync.question('取得したい企業数を入力してください (1-20、デフォルト: 10): ');
            resultValidationErrors = validateResultCount(maxResults);
            
            if (resultValidationErrors.length > 0) {
                console.log('\n❌ 入力エラー:');
                resultValidationErrors.forEach(error => console.log(`   ${error}`));
                console.log('');
            }
        } while (resultValidationErrors.length > 0);
        
        const resultCount = maxResults.trim() === '' ? 10 : parseInt(maxResults.trim());
        
        console.log(`\n🔍 「${location}」のWeb制作会社を検索中（最大${resultCount}社）...`);
        
        await researcher.init();
        const searchResults = await researcher.searchWebCompanies(location, resultCount);
        
        if (searchResults.length === 0) {
            console.log('❌ Web制作会社が見つかりませんでした。');
            console.log('   以下を試してください:');
            console.log('   - 別の場所で検索（例：東京、大阪、名古屋）');
            console.log('   - より具体的な地名（例：新宿、渋谷、六本木）');
            console.log('   - しばらく時間をおいて再実行');
            return;
        }
        
        console.log(`✅ ${searchResults.length}社の会社を発見しました。`);
        console.log('📊 各会社の詳細情報を取得中...\n');
        
        const companies = [];
        const failedUrls = [];
        
        for (let i = 0; i < searchResults.length; i++) {
            const result = searchResults[i];
            process.stdout.write(`\r⏳ 進行状況: ${i + 1}/${searchResults.length} - ${result.title.substring(0, 30)}...`);
            
            try {
                const companyInfo = await researcher.extractCompanyInfo(result.url);
                companies.push({
                    ...result,
                    ...companyInfo
                });
            } catch (error) {
                console.error(`\n⚠️  情報取得失敗: ${result.url} - ${error.message}`);
                failedUrls.push(result.url);
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('\n\n✅ 情報取得完了！');
        
        if (failedUrls.length > 0) {
            console.log(`⚠️  ${failedUrls.length}社の情報取得に失敗しました。`);
        }
        
        if (companies.length === 0) {
            console.log('❌ 有効な企業情報を取得できませんでした。');
            return;
        }
        
        researcher.displayResults(companies);
        
        console.log('\n📁 保存オプションを選択してください:');
        console.log('1. ローカルファイル (JSON/CSV)');
        console.log('2. Googleスプレッドシート');
        console.log('3. 両方');
        console.log('4. 保存しない');
        
        const saveOption = readlineSync.question('\n選択してください (1-4): ');
        
        switch (saveOption) {
            case '1':
                await researcher.saveToFile(companies, location);
                break;
                
            case '2':
                await researcher.saveToSpreadsheet(companies, location);
                break;
                
            case '3':
                await researcher.saveToFile(companies, location);
                await researcher.saveToSpreadsheet(companies, location);
                break;
                
            case '4':
                console.log('保存をスキップしました。');
                break;
                
            default:
                console.log('無効な選択です。保存をスキップします。');
                break;
        }
        
        console.log('\n🎉 調査完了！転職活動頑張ってください！');
        
    } catch (error) {
        console.error('\n❌ 予期しないエラーが発生しました:', error.message);
        console.log('ブラウザの問題やネットワーク接続を確認してください。');
    } finally {
        try {
            await researcher.close();
        } catch (closeError) {
            console.error('ブラウザ終了エラー:', closeError.message);
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = WebCompanyResearcher;