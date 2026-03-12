const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 入出力ファイル
const INPUT_FILE = 'システム会社判断.csv';
const OUTPUT_FILE = 'システム会社判断_結果.csv';
const PROGRESS_FILE = 'システム会社判断_進行中.csv';

// 設定
const TIMEOUT = 30000;
const DELAY_BETWEEN_REQUESTS = 2000;

// CSVパース
function parseCSV(content) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((h, idx) => {
            row[h.trim()] = values[idx] ? values[idx].trim() : '';
        });
        rows.push(row);
    }
    return rows;
}

// サイトコンテンツを取得
async function fetchSiteContent(browser, url) {
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });

        // ページのテキストを取得
        const content = await page.evaluate(() => {
            return document.body ? document.body.innerText : '';
        });

        // タイトルを取得
        const title = await page.title();

        // メタディスクリプションを取得
        const metaDesc = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="description"]');
            return meta ? meta.getAttribute('content') : '';
        });

        return { content, title, metaDesc, error: null };
    } catch (error) {
        return { content: '', title: '', metaDesc: '', error: error.message };
    } finally {
        await page.close();
    }
}

// サイト内の複数ページを取得
async function fetchMultiplePages(browser, baseUrl) {
    const results = {
        topPage: await fetchSiteContent(browser, baseUrl),
        servicePage: { content: '', title: '', metaDesc: '', error: null },
        worksPage: { content: '', title: '', metaDesc: '', error: null },
        aboutPage: { content: '', title: '', metaDesc: '', error: null },
        recruitPage: { content: '', title: '', metaDesc: '', error: null }
    };

    // サービスページを探す
    const serviceUrls = ['/service', '/services', '/business', '/solution', '/solutions'];
    for (const path of serviceUrls) {
        try {
            const url = new URL(path, baseUrl).href;
            const result = await fetchSiteContent(browser, url);
            if (!result.error && result.content.length > 100) {
                results.servicePage = result;
                break;
            }
        } catch (e) {}
    }

    // 実績ページを探す
    const worksUrls = ['/works', '/case', '/cases', '/portfolio', '/achievement'];
    for (const path of worksUrls) {
        try {
            const url = new URL(path, baseUrl).href;
            const result = await fetchSiteContent(browser, url);
            if (!result.error && result.content.length > 100) {
                results.worksPage = result;
                break;
            }
        } catch (e) {}
    }

    // 会社概要ページを探す
    const aboutUrls = ['/about', '/company', '/corporate', '/about-us'];
    for (const path of aboutUrls) {
        try {
            const url = new URL(path, baseUrl).href;
            const result = await fetchSiteContent(browser, url);
            if (!result.error && result.content.length > 100) {
                results.aboutPage = result;
                break;
            }
        } catch (e) {}
    }

    // 採用ページを探す
    const recruitUrls = ['/recruit', '/careers', '/jobs', '/hiring'];
    for (const path of recruitUrls) {
        try {
            const url = new URL(path, baseUrl).href;
            const result = await fetchSiteContent(browser, url);
            if (!result.error && result.content.length > 100) {
                results.recruitPage = result;
                break;
            }
        } catch (e) {}
    }

    return results;
}

// 判定ロジック
function judgeCompany(companyName, siteData) {
    const allContent = [
        siteData.topPage.content,
        siteData.topPage.title,
        siteData.topPage.metaDesc,
        siteData.servicePage.content,
        siteData.worksPage.content,
        siteData.aboutPage.content,
        siteData.recruitPage.content
    ].join(' ').toLowerCase();

    const results = {
        q1: false, // 主事業はWeb制作ではなく、システム開発・受託開発・SaaS開発か？
        q2: false, // LP/サービスサイト/Webサイト制作の実績が少数でも存在するか？
        q3: false, // 専任のWebデザイナーがいない、または明記されていないか？
        q4: false, // DX支援/ITコンサル/スタートアップ支援などの文言があるか？
        q5: false, // サイト全体のデザイン品質が突出して高いわけではないか？（自動判定困難）
        q6: false, // クライアントが中小企業・スタートアップも含まれていそうか？
        reason: ''
    };

    // Q1: 主事業判定
    const systemKeywords = ['システム開発', '受託開発', 'saas', 'アプリ開発', 'ソフトウェア開発',
        'webアプリ', '業務システム', '基幹システム', 'クラウドサービス', 'システムインテグレーション',
        'si事業', 'エンジニアリング', 'ソリューション', 'システム構築'];
    const webOnlyKeywords = ['web制作会社', 'ホームページ制作会社', 'webデザイン会社',
        'クリエイティブ制作', 'デザイン事務所', 'web専門'];

    const hasSystemKeywords = systemKeywords.some(k => allContent.includes(k));
    const isWebOnly = webOnlyKeywords.some(k => allContent.includes(k));

    if (hasSystemKeywords && !isWebOnly) {
        results.q1 = true;
    }

    // Q2: LP/Web制作実績の存在
    const webWorksKeywords = ['lp制作', 'ランディングページ', 'webサイト制作', 'ホームページ制作',
        'コーポレートサイト', 'サービスサイト', 'ecサイト', 'webデザイン'];
    const hasWebWorks = webWorksKeywords.some(k => allContent.includes(k));

    // 「実績」ページにあるか、または軽く触れている程度なら対象
    if (hasWebWorks) {
        results.q2 = true;
    }

    // Q3: 専任Webデザイナーの不在
    const designerKeywords = ['webデザイナー', 'uiデザイナー', 'uxデザイナー', 'デザイナー募集',
        'デザインチーム', 'デザイン部門'];
    const hasDesigner = designerKeywords.some(k => allContent.includes(k));

    if (!hasDesigner) {
        results.q3 = true;
    }

    // Q4: DX支援/ITコンサル/スタートアップ支援
    const dxKeywords = ['dx支援', 'dxコンサル', 'itコンサル', 'デジタルトランスフォーメーション',
        'スタートアップ支援', '新規事業支援', 'mvp開発', 'poC', 'プロトタイプ開発',
        'デジタル化支援', 'it化支援', 'クラウド移行'];
    const hasDxKeywords = dxKeywords.some(k => allContent.includes(k));

    if (hasDxKeywords) {
        results.q4 = true;
    }

    // Q5: デザイン品質（自動判定が困難なため、保守的にYesとする）
    // 実際には目視確認が必要だが、システム会社のサイトは一般的に突出して高くない
    results.q5 = true;

    // Q6: 中小企業・スタートアップがクライアントに含まれるか
    const smbKeywords = ['中小企業', 'スタートアップ', 'ベンチャー', '中堅企業', '地方企業',
        '地域密着', '小規模', '個人事業'];
    const hasSmbClients = smbKeywords.some(k => allContent.includes(k));

    // 大手専門でなければYes
    const enterpriseOnly = ['大手企業専門', 'エンタープライズ専門', '上場企業のみ'].some(k => allContent.includes(k));

    if (hasSmbClients || !enterpriseOnly) {
        results.q6 = true;
    }

    // 総合判定
    const yesCount = [results.q1, results.q2, results.q3, results.q4, results.q5, results.q6]
        .filter(v => v).length;

    let judgment = '';
    if (yesCount >= 4) {
        judgment = '送る';
    } else if (yesCount >= 2) {
        judgment = '保留';
    } else {
        judgment = '除外';
    }

    // 理由を生成
    const reasons = [];
    if (results.q1) reasons.push('システム開発が主事業');
    else reasons.push('Web制作が主事業の可能性');

    if (results.q2) reasons.push('Web制作実績あり');
    else reasons.push('Web制作実績なし');

    if (results.q4) reasons.push('DX/ITコンサル系');

    if (!results.q3) reasons.push('デザイナー在籍の可能性');

    results.reason = reasons.slice(0, 3).join('。');
    results.judgment = judgment;
    results.yesCount = yesCount;

    return results;
}

// メイン処理
async function main() {
    console.log('=== システム会社判定ツール ===\n');

    // CSVを読み込み
    const csvContent = fs.readFileSync(INPUT_FILE, 'utf-8');
    const companies = parseCSV(csvContent);
    console.log(`対象会社数: ${companies.length}社\n`);

    // 既存の進行ファイルがあれば読み込み
    let processed = new Set();
    let results = [];
    if (fs.existsSync(PROGRESS_FILE)) {
        const progressContent = fs.readFileSync(PROGRESS_FILE, 'utf-8');
        const progressRows = parseCSV(progressContent);
        progressRows.forEach(row => {
            processed.add(row['Company Website']);
            results.push(row);
        });
        console.log(`既処理: ${processed.size}社\n`);
    }

    // ブラウザを起動
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // ヘッダーを出力
    const header = 'Company Name,Company Website,Q1,Q2,Q3,Q4,Q5,Q6,Yes数,判定,理由';
    if (results.length === 0) {
        fs.writeFileSync(PROGRESS_FILE, header + '\n');
    }

    try {
        for (let i = 0; i < companies.length; i++) {
            const company = companies[i];
            const url = company['Company Website'];

            if (processed.has(url)) {
                continue;
            }

            console.log(`[${i + 1}/${companies.length}] ${company['Company Name']}`);
            console.log(`  URL: ${url}`);

            try {
                // サイトデータを取得
                const siteData = await fetchMultiplePages(browser, url);

                if (siteData.topPage.error) {
                    console.log(`  エラー: ${siteData.topPage.error}`);
                    const resultRow = `"${company['Company Name']}","${url}",,,,,,,除外,サイトアクセス不可`;
                    fs.appendFileSync(PROGRESS_FILE, resultRow + '\n');
                    continue;
                }

                // 判定
                const judgment = judgeCompany(company['Company Name'], siteData);

                console.log(`  Q1: ${judgment.q1 ? 'Yes' : 'No'}, Q2: ${judgment.q2 ? 'Yes' : 'No'}, Q3: ${judgment.q3 ? 'Yes' : 'No'}`);
                console.log(`  Q4: ${judgment.q4 ? 'Yes' : 'No'}, Q5: ${judgment.q5 ? 'Yes' : 'No'}, Q6: ${judgment.q6 ? 'Yes' : 'No'}`);
                console.log(`  Yes数: ${judgment.yesCount}, 判定: ${judgment.judgment}`);
                console.log(`  理由: ${judgment.reason}\n`);

                const resultRow = [
                    `"${company['Company Name']}"`,
                    `"${url}"`,
                    judgment.q1 ? 'Yes' : 'No',
                    judgment.q2 ? 'Yes' : 'No',
                    judgment.q3 ? 'Yes' : 'No',
                    judgment.q4 ? 'Yes' : 'No',
                    judgment.q5 ? 'Yes' : 'No',
                    judgment.q6 ? 'Yes' : 'No',
                    judgment.yesCount,
                    judgment.judgment,
                    `"${judgment.reason}"`
                ].join(',');

                fs.appendFileSync(PROGRESS_FILE, resultRow + '\n');

            } catch (error) {
                console.log(`  エラー: ${error.message}\n`);
                const resultRow = `"${company['Company Name']}","${url}",,,,,,,除外,処理エラー`;
                fs.appendFileSync(PROGRESS_FILE, resultRow + '\n');
            }

            // 待機
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }
    } finally {
        await browser.close();
    }

    // 完了ファイルをコピー
    fs.copyFileSync(PROGRESS_FILE, OUTPUT_FILE);
    console.log(`\n完了！結果は ${OUTPUT_FILE} に保存されました。`);
}

// 引数処理
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : null;

// メイン処理（制限付き）
async function mainWithLimit() {
    console.log('=== システム会社判定ツール ===\n');

    // CSVを読み込み
    const csvContent = fs.readFileSync(INPUT_FILE, 'utf-8');
    let companies = parseCSV(csvContent);

    if (LIMIT) {
        console.log(`制限: ${LIMIT}社のみ処理`);
        companies = companies.slice(0, LIMIT);
    }

    console.log(`対象会社数: ${companies.length}社\n`);

    // 既存の進行ファイルがあれば読み込み
    let processed = new Set();
    if (fs.existsSync(PROGRESS_FILE)) {
        const progressContent = fs.readFileSync(PROGRESS_FILE, 'utf-8');
        const progressRows = parseCSV(progressContent);
        progressRows.forEach(row => {
            if (row['Company Website']) {
                processed.add(row['Company Website']);
            }
        });
        console.log(`既処理: ${processed.size}社\n`);
    }

    // ブラウザを起動
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // ヘッダーを出力
    const header = 'Company Name,Company Website,Q1,Q2,Q3,Q4,Q5,Q6,Yes数,判定,理由';
    if (!fs.existsSync(PROGRESS_FILE)) {
        fs.writeFileSync(PROGRESS_FILE, header + '\n');
    }

    try {
        for (let i = 0; i < companies.length; i++) {
            const company = companies[i];
            const url = company['Company Website'];

            if (processed.has(url)) {
                continue;
            }

            console.log(`[${i + 1}/${companies.length}] ${company['Company Name']}`);
            console.log(`  URL: ${url}`);

            try {
                // サイトデータを取得
                const siteData = await fetchMultiplePages(browser, url);

                if (siteData.topPage.error) {
                    console.log(`  エラー: ${siteData.topPage.error}`);
                    const resultRow = `"${company['Company Name']}","${url}",,,,,,,除外,サイトアクセス不可`;
                    fs.appendFileSync(PROGRESS_FILE, resultRow + '\n');
                    continue;
                }

                // 判定
                const judgment = judgeCompany(company['Company Name'], siteData);

                console.log(`  Q1: ${judgment.q1 ? 'Yes' : 'No'}, Q2: ${judgment.q2 ? 'Yes' : 'No'}, Q3: ${judgment.q3 ? 'Yes' : 'No'}`);
                console.log(`  Q4: ${judgment.q4 ? 'Yes' : 'No'}, Q5: ${judgment.q5 ? 'Yes' : 'No'}, Q6: ${judgment.q6 ? 'Yes' : 'No'}`);
                console.log(`  Yes数: ${judgment.yesCount}, 判定: ${judgment.judgment}`);
                console.log(`  理由: ${judgment.reason}\n`);

                const resultRow = [
                    `"${company['Company Name']}"`,
                    `"${url}"`,
                    judgment.q1 ? 'Yes' : 'No',
                    judgment.q2 ? 'Yes' : 'No',
                    judgment.q3 ? 'Yes' : 'No',
                    judgment.q4 ? 'Yes' : 'No',
                    judgment.q5 ? 'Yes' : 'No',
                    judgment.q6 ? 'Yes' : 'No',
                    judgment.yesCount,
                    judgment.judgment,
                    `"${judgment.reason}"`
                ].join(',');

                fs.appendFileSync(PROGRESS_FILE, resultRow + '\n');

            } catch (error) {
                console.log(`  エラー: ${error.message}\n`);
                const resultRow = `"${company['Company Name']}","${url}",,,,,,,除外,処理エラー`;
                fs.appendFileSync(PROGRESS_FILE, resultRow + '\n');
            }

            // 待機
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }
    } finally {
        await browser.close();
    }

    // 完了ファイルをコピー
    fs.copyFileSync(PROGRESS_FILE, OUTPUT_FILE);
    console.log(`\n完了！結果は ${OUTPUT_FILE} に保存されました。`);
}

mainWithLimit().catch(console.error);
