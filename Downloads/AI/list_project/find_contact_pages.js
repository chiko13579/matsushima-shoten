const puppeteer = require('puppeteer');
const fs = require('fs');

const INPUT_FILE = '/Users/saeki/Downloads/img/list_project/全国の行政書士リスト_imitsu.csv';
const OUTPUT_FILE = '/Users/saeki/Downloads/img/list_project/全国の行政書士リスト_imitsu_contact.csv';
const PROGRESS_FILE = '/Users/saeki/Downloads/img/list_project/contact_progress.json';

// お問い合わせページを示すキーワード
const CONTACT_KEYWORDS = [
    'contact', 'お問い合わせ', 'お問合せ', 'お問合わせ', 'お問い合せ',
    '問い合わせ', '問合せ', '問合わせ', 'otoiawase', 'inquiry', 'inquiries',
    'メールフォーム', 'mailform', 'mail-form', 'お気軽に', '相談', 'soudan',
    'フォーム', 'form', 'ご依頼', '依頼', 'コンタクト', 'ご相談', '無料相談'
];

function isContactUrl(url) {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    const contactUrlPatterns = ['contact', 'inquiry', 'otoiawase', 'mailform', 'mail-form', 'soudan'];
    return contactUrlPatterns.some(pattern => lowerUrl.includes(pattern));
}

function getTopPageUrl(url) {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.hostname}/`;
    } catch (e) {
        return url;
    }
}

function isContactText(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return CONTACT_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function parseCSV(content) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (const char of lines[i]) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);
        rows.push(values);
    }

    return { headers, rows };
}

function writeCSV(headers, rows, filename) {
    const escape = (val) => {
        if (!val) return '';
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
    };

    const lines = [headers.map(escape).join(',')];
    for (const row of rows) {
        lines.push(row.map(escape).join(','));
    }
    fs.writeFileSync(filename, lines.join('\n'), 'utf-8');
}

async function findContactLinks(page, baseUrl) {
    try {
        const links = await page.evaluate((baseUrl) => {
            const results = [];
            const anchors = document.querySelectorAll('a[href]');
            let baseHost = '';
            try {
                baseHost = new URL(baseUrl).hostname;
            } catch(e) {}

            for (const a of anchors) {
                const href = a.href;
                const text = a.textContent.trim();
                if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
                    continue;
                }
                try {
                    const linkHost = new URL(href).hostname;
                    if (linkHost !== baseHost && !linkHost.endsWith('.' + baseHost)) {
                        continue;
                    }
                } catch(e) {
                    continue;
                }
                results.push({ href, text });
            }
            return results;
        }, baseUrl);

        const scored = links.map(link => {
            let score = 0;
            if (isContactUrl(link.href)) score += 10;
            if (isContactText(link.text)) score += 20;
            if (link.href.toLowerCase().includes('contact')) score += 5;
            if (link.href.toLowerCase().includes('otoiawase')) score += 5;
            return { ...link, score };
        }).filter(link => link.score > 0);

        scored.sort((a, b) => b.score - a.score);
        return scored;
    } catch (e) {
        return [];
    }
}

async function searchContactPage(browser, baseUrl, depth = 0, visited = new Set()) {
    if (depth > 2 || visited.has(baseUrl)) return null;
    visited.add(baseUrl);

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(15000);

    try {
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 1000));

        const contactLinks = await findContactLinks(page, baseUrl);

        if (contactLinks.length > 0) {
            await page.close();
            return contactLinks[0].href;
        }

        if (depth < 2) {
            const internalLinks = await page.evaluate((baseUrl) => {
                const base = new URL(baseUrl);
                const links = [];
                const anchors = document.querySelectorAll('a[href]');
                for (const a of anchors) {
                    try {
                        const url = new URL(a.href);
                        if (url.hostname === base.hostname && !a.href.includes('#')) {
                            links.push(a.href);
                        }
                    } catch (e) {}
                }
                return [...new Set(links)].slice(0, 5);
            }, baseUrl);

            await page.close();

            for (const link of internalLinks) {
                if (!visited.has(link)) {
                    const result = await searchContactPage(browser, link, depth + 1, visited);
                    if (result) return result;
                }
            }
        } else {
            await page.close();
        }

        return null;
    } catch (e) {
        try { await page.close(); } catch (err) {}
        return null;
    }
}

async function main() {
    console.log('お問い合わせページ検索を開始します...');

    const content = fs.readFileSync(INPUT_FILE, 'utf-8');
    const { headers, rows } = parseCSV(content);

    const newHeaders = [...headers, 'お問い合わせURL'];

    let progress = { lastIndex: -1, results: {} };
    if (fs.existsSync(PROGRESS_FILE)) {
        progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
        console.log(`前回の進捗から再開: ${progress.lastIndex + 1}件目から`);
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const results = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const companyName = row[0];
        const siteUrl = row[1];

        if (i <= progress.lastIndex && progress.results[i] !== undefined) {
            results.push([...row, progress.results[i] || '']);
            continue;
        }

        let contactUrl = '';

        if (siteUrl && siteUrl.startsWith('http')) {
            try {
                const topPageUrl = getTopPageUrl(siteUrl);
                console.log(`[${i + 1}/${rows.length}] ${companyName}`);
                contactUrl = await searchContactPage(browser, topPageUrl, 0, new Set()) || '';
                if (contactUrl) {
                    console.log(`  ✓ ${contactUrl}`);
                } else {
                    console.log(`  ✗ 見つからず`);
                }
            } catch (e) {
                console.log(`  ✗ エラー: ${e.message}`);
            }
        }

        results.push([...row, contactUrl]);

        progress.lastIndex = i;
        progress.results[i] = contactUrl;

        if (i % 10 === 0) {
            fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress), 'utf-8');
            writeCSV(newHeaders, results, OUTPUT_FILE);
        }
    }

    await browser.close();

    writeCSV(newHeaders, results, OUTPUT_FILE);

    if (fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE);
    }

    console.log(`\n完了！結果を保存しました: ${OUTPUT_FILE}`);

    const found = results.filter(r => r[r.length - 1]).length;
    console.log(`お問い合わせページ発見: ${found}/${rows.length}件`);
}

main().catch(console.error);
