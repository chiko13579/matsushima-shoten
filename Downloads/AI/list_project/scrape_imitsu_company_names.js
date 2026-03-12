const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeCompanyNames() {
    // 入力ファイルを読み込む
    const inputData = fs.readFileSync('imitsu_urls_input.txt', 'utf8');
    const lines = inputData.trim().split('\n').filter(line => line.trim());

    console.log(`総URL数: ${lines.length}`);

    // 結果を格納する配列
    const results = [];

    // ブラウザを起動
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const [imitsuUrl, companyUrl] = line.split('\t');

        console.log(`[${i + 1}/${lines.length}] ${imitsuUrl}`);

        try {
            await page.goto(imitsuUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // 会社名を取得（h1タグまたは特定のセレクタから）
            let companyName = '';

            // まずh1タグを試す
            try {
                companyName = await page.$eval('h1', el => el.textContent.trim());
            } catch (e) {
                // h1がない場合は他のセレクタを試す
            }

            // 会社名が空の場合、他のセレクタを試す
            if (!companyName) {
                try {
                    companyName = await page.$eval('.supplier-name', el => el.textContent.trim());
                } catch (e) {}
            }

            if (!companyName) {
                try {
                    companyName = await page.$eval('.company-name', el => el.textContent.trim());
                } catch (e) {}
            }

            if (!companyName) {
                try {
                    companyName = await page.$eval('[data-testid="company-name"]', el => el.textContent.trim());
                } catch (e) {}
            }

            // タイトルから会社名を抽出することも試す
            if (!companyName) {
                try {
                    const title = await page.title();
                    // タイトルから会社名を抽出（例: "会社名 | imitsu"）
                    if (title.includes('|')) {
                        companyName = title.split('|')[0].trim();
                    } else if (title.includes('-')) {
                        companyName = title.split('-')[0].trim();
                    }
                } catch (e) {}
            }

            console.log(`  -> 会社名: ${companyName || '取得失敗'}`);

            results.push({
                companyName: companyName || '',
                imitsuUrl: imitsuUrl,
                companyUrl: companyUrl || ''
            });

            // リクエスト間隔を空ける
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.log(`  -> エラー: ${error.message}`);
            results.push({
                companyName: 'エラー',
                imitsuUrl: imitsuUrl,
                companyUrl: companyUrl || ''
            });
        }

        // 定期的に保存（10件ごと）
        if ((i + 1) % 10 === 0 || i === lines.length - 1) {
            // CSVとして保存
            const csvContent = '会社名,imitsuURL,会社URL\n' +
                results.map(r => `"${(r.companyName || '').replace(/"/g, '""')}","${r.imitsuUrl}","${r.companyUrl}"`).join('\n');
            fs.writeFileSync('imitsu_会社名リスト.csv', csvContent, 'utf8');
            console.log(`  [保存完了: ${results.length}件]`);
        }
    }

    await browser.close();

    console.log('\n=== 完了 ===');
    console.log(`取得成功: ${results.filter(r => r.companyName && r.companyName !== 'エラー').length}件`);
    console.log(`取得失敗: ${results.filter(r => !r.companyName || r.companyName === 'エラー').length}件`);
    console.log('出力ファイル: imitsu_会社名リスト.csv');
}

scrapeCompanyNames().catch(console.error);
