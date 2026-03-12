const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeCompanyUrls() {
    // CSVファイルを読み込む
    const csvContent = fs.readFileSync('マーケ会社.csv', 'utf8');
    const lines = csvContent.split('\n');

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
                address: parts[1] || ''
            });
        }
    }

    console.log(`総会社数: ${companies.length}`);
    console.log('URL取得を開始します...\n');

    // 進行状況ファイルを確認（再開機能）
    let startIndex = 0;
    let results = [];
    const progressFile = 'マーケ会社_URL取得_進行中.csv';

    if (fs.existsSync(progressFile)) {
        const existingContent = fs.readFileSync(progressFile, 'utf8');
        const existingLines = existingContent.split('\n').slice(1); // ヘッダーを除く
        results = existingLines.filter(l => l.trim()).map(line => {
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
        startIndex = results.length;
        console.log(`既存の進行状況を読み込みました。${startIndex}件から再開します。\n`);
    }

    // ブラウザを起動
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    for (let i = startIndex; i < companies.length; i++) {
        const company = companies[i];
        console.log(`[${i + 1}/${companies.length}] ${company.name}`);

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

            // リクエスト間隔を空ける（2秒）
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.log(`  -> エラー: ${error.message}`);
            results.push({
                name: company.name,
                address: company.address,
                url: '',
                contactUrl: ''
            });
        }

        // 50件ごとに保存
        if ((i + 1) % 50 === 0 || i === companies.length - 1) {
            const csvContent = '会社名,住所,URL,お問合せURL\n' +
                results.map(r => `"${(r.name || '').replace(/"/g, '""')}","${(r.address || '').replace(/"/g, '""')}","${(r.url || '').replace(/"/g, '""')}","${(r.contactUrl || '').replace(/"/g, '""')}"`).join('\n');
            fs.writeFileSync(progressFile, csvContent, 'utf8');

            const successCount = results.filter(r => r.url && r.url !== '').length;
            const failCount = results.filter(r => !r.url || r.url === '').length;
            console.log(`\n  [保存: ${results.length}件 | 成功: ${successCount} | 失敗: ${failCount}]\n`);
        }
    }

    await browser.close();

    // 最終結果を保存
    const finalCsvContent = '会社名,住所,URL,お問合せURL\n' +
        results.map(r => `"${(r.name || '').replace(/"/g, '""')}","${(r.address || '').replace(/"/g, '""')}","${(r.url || '').replace(/"/g, '""')}","${(r.contactUrl || '').replace(/"/g, '""')}"`).join('\n');
    fs.writeFileSync('マーケ会社_URL取得完了.csv', finalCsvContent, 'utf8');

    // 進行中ファイルを削除
    if (fs.existsSync(progressFile)) {
        fs.unlinkSync(progressFile);
    }

    console.log('\n=== 完了 ===');
    console.log(`成功: ${results.filter(r => r.url).length}件`);
    console.log(`失敗: ${results.filter(r => !r.url).length}件`);
    console.log('出力ファイル: マーケ会社_URL取得完了.csv');
}

scrapeCompanyUrls().catch(console.error);
