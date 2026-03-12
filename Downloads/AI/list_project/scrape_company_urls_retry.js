const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeCompanyUrls() {
    // 完了ファイルを読み込んで、URLが空の会社を抽出
    const completedContent = fs.readFileSync('マーケ会社_URL取得完了.csv', 'utf8');
    const completedLines = completedContent.split('\n');

    const allCompanies = [];
    const successCompanies = [];

    for (let i = 1; i < completedLines.length; i++) {
        const line = completedLines[i].trim();
        if (!line) continue;

        const match = line.match(/^"([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
        if (match) {
            const company = {
                name: match[1],
                address: match[2],
                url: match[3],
                contactUrl: match[4]
            };
            allCompanies.push(company);

            if (company.url) {
                successCompanies.push(company);
            }
        }
    }

    // URLが空の会社をフィルタリング
    const failedCompanies = allCompanies.filter(c => !c.url);

    console.log(`総会社数: ${allCompanies.length}`);
    console.log(`既に成功: ${successCompanies.length}件`);
    console.log(`再取得対象: ${failedCompanies.length}件`);
    console.log('\n再取得を開始します...\n');

    // 進行状況ファイルを確認（再開機能）
    let startIndex = 0;
    let results = [...successCompanies]; // 成功済みを保持
    const progressFile = 'マーケ会社_URL再取得_進行中.csv';

    if (fs.existsSync(progressFile)) {
        const existingContent = fs.readFileSync(progressFile, 'utf8');
        const existingLines = existingContent.split('\n').slice(1);
        const existingResults = existingLines.filter(l => l.trim()).map(line => {
            const parts = line.match(/^"([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
            if (parts) {
                return {
                    name: parts[1],
                    address: parts[2],
                    url: parts[3],
                    contactUrl: parts[4]
                };
            }
            return null;
        }).filter(r => r);

        // 再取得済みの件数を計算
        const retrySuccessCount = existingResults.filter(r => r.url).length - successCompanies.length;
        if (retrySuccessCount > 0) {
            results = existingResults;
            // 再取得対象から既に処理済みを除外
            const processedNames = new Set(existingResults.map(r => r.name));
            const remaining = failedCompanies.filter(c => !processedNames.has(c.name) || !existingResults.find(r => r.name === c.name && r.url));
            startIndex = failedCompanies.length - remaining.length;
            console.log(`既存の進行状況を読み込みました。${startIndex}件処理済み。\n`);
        }
    }

    let browser = null;
    let page = null;
    let retryResults = [];

    // ブラウザを起動する関数
    async function launchBrowser() {
        if (browser) {
            try {
                await browser.close();
            } catch (e) {}
        }
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }

    await launchBrowser();

    for (let i = startIndex; i < failedCompanies.length; i++) {
        const company = failedCompanies[i];
        console.log(`[${i + 1}/${failedCompanies.length}] ${company.name}`);

        // 100件ごとにブラウザを再起動
        if (i > 0 && i % 100 === 0) {
            console.log('\n  [ブラウザを再起動中...]\n');
            await launchBrowser();
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        try {
            // DuckDuckGoのHTML版で検索
            const searchQuery = encodeURIComponent(`${company.name} 公式サイト`);
            const searchUrl = `https://html.duckduckgo.com/html/?q=${searchQuery}`;

            await page.goto(searchUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // 待機時間を長めに（3秒）
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 検索結果からURLを取得
            const url = await page.evaluate(() => {
                const results = document.querySelectorAll('.result__a');
                for (const link of results) {
                    const href = link.href;
                    if (href && href.includes('uddg=')) {
                        const match = href.match(/uddg=([^&]+)/);
                        if (match) {
                            const actualUrl = decodeURIComponent(match[1]);
                            if (!actualUrl.includes('wikipedia.org') &&
                                !actualUrl.includes('facebook.com') &&
                                !actualUrl.includes('twitter.com') &&
                                !actualUrl.includes('linkedin.com') &&
                                !actualUrl.includes('youtube.com') &&
                                !actualUrl.includes('indeed.com') &&
                                !actualUrl.includes('wantedly.com') &&
                                !actualUrl.includes('en-gage.net') &&
                                !actualUrl.includes('mynavi.jp') &&
                                !actualUrl.includes('rikunabi.com') &&
                                !actualUrl.includes('baseconnect.in') &&
                                !actualUrl.includes('bunshun.jp')) {
                                return actualUrl;
                            }
                        }
                    }
                }
                return '';
            });

            console.log(`  -> URL: ${url || '取得失敗'}`);

            retryResults.push({
                name: company.name,
                address: company.address,
                url: url || '',
                contactUrl: ''
            });

            // リクエスト間隔を長めに（4秒）
            await new Promise(resolve => setTimeout(resolve, 4000));

        } catch (error) {
            console.log(`  -> エラー: ${error.message}`);

            // エラー時はブラウザを再起動
            if (error.message.includes('detached') || error.message.includes('Target closed')) {
                console.log('  [ブラウザを再起動中...]');
                await launchBrowser();
                await new Promise(resolve => setTimeout(resolve, 10000));
            }

            retryResults.push({
                name: company.name,
                address: company.address,
                url: '',
                contactUrl: ''
            });
        }

        // 50件ごとに保存
        if ((i + 1) % 50 === 0 || i === failedCompanies.length - 1) {
            // 成功済み + 再取得結果をマージ
            const allResults = [...successCompanies, ...retryResults];
            const csvContent = '会社名,住所,URL,お問合せURL\n' +
                allResults.map(r => `"${(r.name || '').replace(/"/g, '""')}","${(r.address || '').replace(/"/g, '""')}","${(r.url || '').replace(/"/g, '""')}","${(r.contactUrl || '').replace(/"/g, '""')}"`).join('\n');
            fs.writeFileSync(progressFile, csvContent, 'utf8');

            const totalSuccess = allResults.filter(r => r.url).length;
            const retrySuccess = retryResults.filter(r => r.url).length;
            console.log(`\n  [保存: ${allResults.length}件 | 総成功: ${totalSuccess} | 今回成功: ${retrySuccess}/${retryResults.length}]\n`);
        }
    }

    if (browser) {
        await browser.close();
    }

    // 最終結果を保存
    const finalResults = [...successCompanies, ...retryResults];
    const finalCsvContent = '会社名,住所,URL,お問合せURL\n' +
        finalResults.map(r => `"${(r.name || '').replace(/"/g, '""')}","${(r.address || '').replace(/"/g, '""')}","${(r.url || '').replace(/"/g, '""')}","${(r.contactUrl || '').replace(/"/g, '""')}"`).join('\n');
    fs.writeFileSync('マーケ会社_URL取得完了.csv', finalCsvContent, 'utf8');

    // 進行中ファイルを削除
    if (fs.existsSync(progressFile)) {
        fs.unlinkSync(progressFile);
    }

    const totalSuccess = finalResults.filter(r => r.url).length;
    const totalFail = finalResults.filter(r => !r.url).length;

    console.log('\n=== 完了 ===');
    console.log(`総件数: ${finalResults.length}`);
    console.log(`成功: ${totalSuccess}件`);
    console.log(`失敗: ${totalFail}件`);
    console.log('出力ファイル: マーケ会社_URL取得完了.csv');
}

scrapeCompanyUrls().catch(console.error);
