const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeCompanyUrls() {
    // 進行中ファイルを読み込む
    const progressFile = 'マーケ会社_URL再取得_進行中.csv';
    const progressContent = fs.readFileSync(progressFile, 'utf8');
    const progressLines = progressContent.split('\n');

    // 既存の結果を取得
    const existingResults = [];
    for (let i = 1; i < progressLines.length; i++) {
        const line = progressLines[i].trim();
        if (!line) continue;

        const match = line.match(/^"([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
        if (match) {
            existingResults.push({
                name: match[1],
                address: match[2],
                url: match[3],
                contactUrl: match[4]
            });
        }
    }

    // 元のマーケ会社.csvを読み込む
    const originalContent = fs.readFileSync('マーケ会社.csv', 'utf8');
    const originalLines = originalContent.split('\n');

    const allCompanies = [];
    for (let i = 1; i < originalLines.length; i++) {
        const line = originalLines[i].trim();
        if (!line) continue;

        const parts = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current.replace(/^"|"$/g, '').trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.replace(/^"|"$/g, '').trim());

        const companyName = parts[0];
        if (companyName && companyName !== 'Company Name') {
            allCompanies.push({
                name: companyName,
                address: parts[1] || ''
            });
        }
    }

    // 処理済みの会社名セット
    const processedNames = new Set(existingResults.map(r => r.name));

    // 未処理の会社を抽出
    const remainingCompanies = allCompanies.filter(c => !processedNames.has(c.name));

    console.log(`元の総会社数: ${allCompanies.length}`);
    console.log(`既に処理済み: ${existingResults.length}件`);
    console.log(`残り: ${remainingCompanies.length}件`);
    console.log('\n続きから再開します...\n');

    if (remainingCompanies.length === 0) {
        console.log('全件処理済みです！');
        // 最終ファイルを保存
        const finalCsvContent = '会社名,住所,URL,お問合せURL\n' +
            existingResults.map(r => `"${(r.name || '').replace(/"/g, '""')}","${(r.address || '').replace(/"/g, '""')}","${(r.url || '').replace(/"/g, '""')}","${(r.contactUrl || '').replace(/"/g, '""')}"`).join('\n');
        fs.writeFileSync('マーケ会社_URL取得完了.csv', finalCsvContent, 'utf8');
        console.log('出力ファイル: マーケ会社_URL取得完了.csv');
        return;
    }

    let browser = null;
    let page = null;
    let results = [...existingResults];

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

    for (let i = 0; i < remainingCompanies.length; i++) {
        const company = remainingCompanies[i];
        console.log(`[${i + 1}/${remainingCompanies.length}] ${company.name}`);

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

            results.push({
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

            results.push({
                name: company.name,
                address: company.address,
                url: '',
                contactUrl: ''
            });
        }

        // 50件ごとに保存
        if ((i + 1) % 50 === 0 || i === remainingCompanies.length - 1) {
            const csvContent = '会社名,住所,URL,お問合せURL\n' +
                results.map(r => `"${(r.name || '').replace(/"/g, '""')}","${(r.address || '').replace(/"/g, '""')}","${(r.url || '').replace(/"/g, '""')}","${(r.contactUrl || '').replace(/"/g, '""')}"`).join('\n');
            fs.writeFileSync(progressFile, csvContent, 'utf8');

            const totalSuccess = results.filter(r => r.url).length;
            console.log(`\n  [保存: ${results.length}件 | 総成功: ${totalSuccess}]\n`);
        }
    }

    if (browser) {
        await browser.close();
    }

    // 最終結果を保存
    const finalCsvContent = '会社名,住所,URL,お問合せURL\n' +
        results.map(r => `"${(r.name || '').replace(/"/g, '""')}","${(r.address || '').replace(/"/g, '""')}","${(r.url || '').replace(/"/g, '""')}","${(r.contactUrl || '').replace(/"/g, '""')}"`).join('\n');
    fs.writeFileSync('マーケ会社_URL取得完了.csv', finalCsvContent, 'utf8');

    const totalSuccess = results.filter(r => r.url).length;
    const totalFail = results.filter(r => !r.url).length;

    console.log('\n=== 完了 ===');
    console.log(`総件数: ${results.length}`);
    console.log(`成功: ${totalSuccess}件`);
    console.log(`失敗: ${totalFail}件`);
    console.log('出力ファイル: マーケ会社_URL取得完了.csv');
}

scrapeCompanyUrls().catch(console.error);
