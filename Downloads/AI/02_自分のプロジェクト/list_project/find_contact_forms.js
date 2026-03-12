const puppeteer = require('puppeteer');
const fs = require('fs');

const INPUT_FILE = '/Users/saeki/Downloads/img/list_project/全国の税理士リスト_お問合せなし.csv';
const OUTPUT_FILE = '/Users/saeki/Downloads/img/list_project/全国の税理士リスト_お問合せ発見.csv';
const STILL_NONE_FILE = '/Users/saeki/Downloads/img/list_project/全国の税理士リスト_お問合せなし_確認済み.csv';
const ERROR_FILE = '/Users/saeki/Downloads/img/list_project/全国の税理士リスト_アクセス不可.csv';
const PROGRESS_FILE = '/Users/saeki/Downloads/img/list_project/find_contact_progress.json';

const TEST_MODE = false;
const TEST_LIMIT = 10;

// お問い合わせリンクを探すキーワード
const CONTACT_KEYWORDS = [
  'contact', 'inquiry', 'お問い合わせ', 'お問合せ', 'お問合わせ',
  '問い合わせ', '問合せ', '問合わせ', 'ご相談', '相談', 'お申込',
  'お申し込み', '無料相談', 'メールフォーム', 'mail', 'form'
];

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const header = lines[0];
  const rows = lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
  return { header, rows };
}

async function findContactLinks(page, baseUrl) {
  try {
    const links = await page.evaluate((keywords) => {
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      const contactLinks = [];

      for (const link of allLinks) {
        const href = link.href || '';
        const text = (link.textContent || '').toLowerCase();
        const hrefLower = href.toLowerCase();

        // キーワードに一致するリンクを探す
        for (const keyword of keywords) {
          if (text.includes(keyword) || hrefLower.includes(keyword)) {
            if (!href.startsWith('tel:') && !href.startsWith('mailto:') && !href.startsWith('javascript:')) {
              contactLinks.push({
                href: href,
                text: link.textContent.trim().substring(0, 50)
              });
              break;
            }
          }
        }
      }

      return contactLinks;
    }, CONTACT_KEYWORDS);

    return links;
  } catch (error) {
    return [];
  }
}

async function checkForForm(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));

    const hasForm = await page.evaluate(() => {
      // フォーム要素があるか
      const forms = document.querySelectorAll('form');
      if (forms.length > 0) {
        // 検索フォームだけでないか確認
        for (const form of forms) {
          const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="search"])');
          const textareas = form.querySelectorAll('textarea');
          if (inputs.length >= 2 || textareas.length > 0) {
            return true;
          }
        }
      }

      // フォームタグなしでもinput/textareaが複数あるか
      const allInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
      return allInputs.length >= 3;
    });

    return hasForm;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('お問合せフォーム探索スクリプト開始\n');
  if (TEST_MODE) {
    console.log(`テストモード: 最初の${TEST_LIMIT}件のみ処理\n`);
  }

  const csvContent = fs.readFileSync(INPUT_FILE, 'utf-8');
  const { header, rows } = parseCSV(csvContent);
  console.log('読み込み件数: ' + rows.length + '件\n');

  let progress = { checked: [], foundRows: [], notFoundRows: [], errorRows: [] };
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    if (!progress.errorRows) progress.errorRows = [];
    console.log('前回の進捗を復元: ' + progress.checked.length + '件チェック済み\n');
  }

  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-running-insecure-content',
      '--ignore-certificate-errors',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars'
    ]
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  let foundCount = progress.foundRows.length;
  let notFoundCount = progress.notFoundRows.length;
  let errorCount = 0;

  const limit = TEST_MODE ? Math.min(TEST_LIMIT, rows.length) : rows.length;

  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    const companyName = row[0];
    const siteUrl = row[1];

    if (progress.checked.includes(siteUrl)) {
      continue;
    }

    if (!siteUrl) {
      progress.notFoundRows.push(row);
      progress.checked.push(siteUrl);
      notFoundCount++;
      continue;
    }

    process.stdout.write('[' + (i + 1) + '/' + limit + '] ' + companyName + ' ... ');

    try {
      // トップページにアクセス
      await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1500));

      // お問い合わせリンクを探す
      const contactLinks = await findContactLinks(page, siteUrl);

      let contactUrl = null;

      if (contactLinks.length > 0) {
        // 見つかったリンクを順番にチェック
        for (const link of contactLinks) {
          const hasForm = await checkForForm(page, link.href);
          if (hasForm) {
            contactUrl = link.href;
            break;
          }
        }
      }

      // トップページ自体にフォームがあるかも確認
      if (!contactUrl) {
        await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 1000));
        const hasFormOnTop = await page.evaluate(() => {
          const allInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
          return allInputs.length >= 3;
        });
        if (hasFormOnTop) {
          contactUrl = siteUrl;
        }
      }

      if (contactUrl) {
        console.log('✅ 発見: ' + contactUrl.substring(0, 60));
        row[3] = contactUrl;
        progress.foundRows.push(row);
        foundCount++;
      } else {
        console.log('❌ なし');
        progress.notFoundRows.push(row);
        notFoundCount++;
      }

    } catch (error) {
      console.log('⚠️ エラー: ' + error.message.substring(0, 40));
      progress.errorRows.push(row);
      errorCount++;
    }

    progress.checked.push(siteUrl);

    if (progress.checked.length % 10 === 0) {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
    }
  }

  await browser.close();

  console.log('\n\n=== 結果 ===');
  console.log('お問合せ発見: ' + foundCount + '件');
  console.log('お問合せなし: ' + notFoundCount + '件');
  console.log('エラー: ' + errorCount + '件');

  if (progress.foundRows.length > 0) {
    const foundOutput = header + '\n' + progress.foundRows.map(row => row.join(',')).join('\n');
    fs.writeFileSync(OUTPUT_FILE, foundOutput, 'utf-8');
    console.log('\nお問合せ発見リストを保存: ' + OUTPUT_FILE);
  }

  if (progress.notFoundRows.length > 0) {
    const notFoundOutput = header + '\n' + progress.notFoundRows.map(row => row.join(',')).join('\n');
    fs.writeFileSync(STILL_NONE_FILE, notFoundOutput, 'utf-8');
    console.log('お問合せ確認なしリストを保存: ' + STILL_NONE_FILE);
  }

  if (progress.errorRows.length > 0) {
    const errorOutput = header + '\n' + progress.errorRows.map(row => row.join(',')).join('\n');
    fs.writeFileSync(ERROR_FILE, errorOutput, 'utf-8');
    console.log('アクセス不可リストを保存: ' + ERROR_FILE);
  }

  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  console.log('\n完了！');
}

main().catch(console.error);
