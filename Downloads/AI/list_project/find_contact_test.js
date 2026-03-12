const puppeteer = require('puppeteer');
const fs = require('fs');

const INPUT_FILE = '/Users/saeki/Downloads/img/list_project/全国の行政書士リスト_imitsu.csv';

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

// URLからトップページを取得
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
    return rows;
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
                // 同じドメインのリンクのみ
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
    console.log('テスト実行: 最初の10件を処理します...\n');

    const content = fs.readFileSync(INPUT_FILE, 'utf-8');
    const rows = parseCSV(content);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const testRows = rows.slice(0, 10);

    for (let i = 0; i < testRows.length; i++) {
        const row = testRows[i];
        const companyName = row[0];
        const siteUrl = row[1];

        console.log(`[${i + 1}/10] ${companyName}`);
        console.log(`  サイト: ${siteUrl}`);

        if (siteUrl && siteUrl.startsWith('http')) {
            try {
                // トップページにアクセス
                const topPageUrl = getTopPageUrl(siteUrl);
                console.log(`  トップ: ${topPageUrl}`);
                const contactUrl = await searchContactPage(browser, topPageUrl, 0, new Set());
                if (contactUrl) {
                    console.log(`  ✓ お問い合わせ: ${contactUrl}`);
                } else {
                    console.log(`  ✗ 見つからず`);
                }
            } catch (e) {
                console.log(`  ✗ エラー: ${e.message}`);
            }
        } else {
            console.log(`  ✗ 無効なURL`);
        }
        console.log('');
    }

    await browser.close();
    console.log('テスト完了！');
}

main().catch(console.error);
