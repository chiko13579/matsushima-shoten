const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeCompanyUrls() {
    // CSVファイルを読み込む
    const csvContent = fs.readFileSync('マーケ会社.csv', 'utf8');
    const lines = csvContent.split('\n');
    const header = lines[0];

    // 会社名を取得（1列目）
    const companies = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSVパース
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
            companies.push({
                name: companyName,
                address: parts[1] || '',
                url: parts[2] || '',
                contactUrl: parts[3] || ''
            });
        }
    }

    console.log(`総会社数: ${companies.length}`);
    console.log('最初の10件でテストします...\n');

    // テスト用に最初の10件のみ
    const testCompanies = companies.slice(0, 10);

    // ブラウザを起動
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const results = [];

    for (let i = 0; i < testCompanies.length; i++) {
        const company = testCompanies[i];
        console.log(`[${i + 1}/${testCompanies.length}] ${company.name}`);

        try {
            // DuckDuckGoのHTML版で検索
            const searchQuery = encodeURIComponent(`${company.name} 公式サイト`);
            const searchUrl = `https://html.duckduckgo.com/html/?q=${searchQuery}`;

            await page.goto(searchUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // 少し待機
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 検索結果からURLを取得
            const url = await page.evaluate(() => {
                // HTML版DuckDuckGoの検索結果
                const results = document.querySelectorAll('.result__a');
                for (const link of results) {
                    const href = link.href;
                    // DuckDuckGoのリダイレクトURLからactual URLを抽出
                    if (href && href.includes('uddg=')) {
                        const match = href.match(/uddg=([^&]+)/);
                        if (match) {
                            const actualUrl = decodeURIComponent(match[1]);
                            // 不要なサイトを除外
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

            // リクエスト間隔を空ける（3秒）
            await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (error) {
            console.log(`  -> エラー: ${error.message}`);
            results.push({
                name: company.name,
                address: company.address,
                url: 'エラー',
                contactUrl: ''
            });
        }
    }

    await browser.close();

    // 結果を表示
    console.log('\n=== テスト結果 ===');
    results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.name}`);
        console.log(`   URL: ${r.url}`);
    });

    // テスト結果をCSVに保存
    const testCsvContent = '会社名,住所,URL,お問合せURL\n' +
        results.map(r => `"${r.name}","${r.address}","${r.url}","${r.contactUrl}"`).join('\n');
    fs.writeFileSync('マーケ会社_URL取得テスト.csv', testCsvContent, 'utf8');

    console.log('\nテスト結果を マーケ会社_URL取得テスト.csv に保存しました');
    console.log(`成功: ${results.filter(r => r.url && r.url !== 'エラー').length}件`);
    console.log(`失敗: ${results.filter(r => !r.url || r.url === 'エラー').length}件`);
}

scrapeCompanyUrls().catch(console.error);
