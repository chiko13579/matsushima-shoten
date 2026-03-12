const puppeteer = require('puppeteer');
const CompanyInfoExtractor = require('./company-extractor');

async function testSimple() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    try {
        // テスト用のHTMLを作成
        const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>テスト会社株式会社</title>
        </head>
        <body>
            <h1>テスト会社株式会社</h1>
            
            <section class="company-overview">
                <h2>会社概要</h2>
                <table>
                    <tr>
                        <th>会社名</th>
                        <td>テスト会社株式会社</td>
                    </tr>
                    <tr>
                        <th>代表取締役社長</th>
                        <td>山田 太郎</td>
                    </tr>
                    <tr>
                        <th>設立</th>
                        <td>2020年</td>
                    </tr>
                </table>
            </section>
            
            <section>
                <h2>別のパターン</h2>
                <dl>
                    <dt>代表取締役</dt>
                    <dd>佐藤 花子</dd>
                </dl>
            </section>
            
            <section>
                <p>代表者：鈴木 一郎</p>
                <p>CEO 田中 次郎</p>
            </section>
        </body>
        </html>
        `;
        
        await page.setContent(testHtml);
        
        // company-extractor.jsのコードをページに注入
        await page.addScriptTag({ path: './company-extractor.js' });
        
        const results = await page.evaluate(() => {
            const extractor = new CompanyInfoExtractor();
            
            // デバッグ用に詳細な情報を取得
            const tables = document.querySelectorAll('table');
            const tableData = [];
            for (const table of tables) {
                const rows = table.querySelectorAll('tr');
                const rowData = [];
                for (const row of rows) {
                    const cells = row.querySelectorAll('th, td');
                    const cellData = [];
                    for (const cell of cells) {
                        cellData.push(cell.textContent.trim());
                    }
                    if (cellData.length > 0) rowData.push(cellData);
                }
                if (rowData.length > 0) tableData.push(rowData);
            }
            
            const ceoName = extractor.extractCEOName(document);
            
            // より詳細なデバッグ情報
            const debugInfo = {
                bodyText: document.body.textContent.substring(0, 500),
                tableCount: document.querySelectorAll('table').length,
                dlCount: document.querySelectorAll('dl').length,
                hasCompanySection: !!document.querySelector('[class*="company"]'),
                tableData: tableData
            };
            
            return { ceoName, debugInfo };
        });
        
        console.log('\n=== テスト結果 ===');
        console.log(`抽出された社長名: ${results.ceoName || 'なし'}`);
        console.log('\nデバッグ情報:');
        console.log(results.debugInfo);
        
    } catch (error) {
        console.error('エラー:', error);
    } finally {
        await browser.close();
    }
}

// テスト実行
testSimple();