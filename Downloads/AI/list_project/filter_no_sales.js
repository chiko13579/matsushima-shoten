const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

// 除外するキーワード
const BLOCK_KEYWORDS = [
  '営業禁止',
  '営業お断り',
  '営業目的.*ご遠慮',
  '営業目的.*お断り',
  '営業の.*ご遠慮',
  '営業の.*お断り',
  '営業メール.*禁止',
  '営業メール.*お断り',
  '営業連絡.*禁止',
  '営業連絡.*お断り',
  'セールス.*禁止',
  'セールス.*お断り',
  '売り込み.*禁止',
  '売り込み.*お断り',
  'ご遠慮.*ください.*営業',
  '法的処置',
  '法的手段',
  '損害賠償.*請求',
  '費用.*請求',
  '請求.*させていただ'
];

const INPUT_FILE = '/Users/saeki/Downloads/img/list_project/全国の行政書士リスト_お問合せあり.csv';
const OUTPUT_FILE = '/Users/saeki/Downloads/img/list_project/全国の行政書士リスト_お問合せあり_営業OK.csv';
const BLOCKED_FILE = '/Users/saeki/Downloads/img/list_project/全国の行政書士リスト_営業禁止.csv';
const PROGRESS_FILE = '/Users/saeki/Downloads/img/list_project/filter_gyosei_progress.json';

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

async function checkPageForBlockedContent(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));

    const pageText = await page.evaluate(() => {
      return document.body ? document.body.innerText : '';
    });

    for (const keyword of BLOCK_KEYWORDS) {
      const regex = new RegExp(keyword, 'i');
      if (regex.test(pageText)) {
        const match = pageText.match(new RegExp('.{0,30}' + keyword + '.{0,30}', 'i'));
        return { blocked: true, reason: keyword, context: match ? match[0].trim().replace(/,/g, '、') : '' };
      }
    }
    return { blocked: false };
  } catch (error) {
    return { blocked: false, error: error.message };
  }
}

async function main() {
  console.log('営業禁止フィルタリングスクリプト開始\n');

  const csvContent = fs.readFileSync(INPUT_FILE, 'utf-8');
  const { header, rows } = parseCSV(csvContent);
  console.log('読み込み件数: ' + rows.length + '件\n');

  let progress = { checked: [], okRows: [], blockedRows: [] };
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    console.log('前回の進捗を復元: ' + progress.checked.length + '件チェック済み\n');
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  let okCount = progress.okRows.length;
  let blockedCount = progress.blockedRows.length;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const companyName = row[0];
    const contactUrl = row[4];

    if (progress.checked.includes(contactUrl)) {
      continue;
    }

    if (!contactUrl) {
      progress.okRows.push(row);
      progress.checked.push(contactUrl);
      okCount++;
      continue;
    }

    process.stdout.write('[' + (i + 1) + '/' + rows.length + '] ' + companyName + ' ... ');

    const result = await checkPageForBlockedContent(page, contactUrl);

    if (result.blocked) {
      console.log('❌ 営業禁止 (' + result.reason + ')');
      console.log('   文脈: "' + result.context + '"');
      progress.blockedRows.push([...row, result.reason, result.context]);
      blockedCount++;
    } else if (result.error) {
      console.log('⚠️ エラー: ' + result.error);
      progress.okRows.push(row);
      errorCount++;
      okCount++;
    } else {
      console.log('✅ OK');
      progress.okRows.push(row);
      okCount++;
    }

    progress.checked.push(contactUrl);

    if (progress.checked.length % 10 === 0) {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
    }
  }

  await browser.close();

  console.log('\n\n=== 結果 ===');
  console.log('OK: ' + okCount + '件');
  console.log('営業禁止: ' + blockedCount + '件');
  console.log('エラー: ' + errorCount + '件');

  const okOutput = header + '\n' + progress.okRows.map(row => row.join(',')).join('\n');
  fs.writeFileSync(OUTPUT_FILE, okOutput, 'utf-8');
  console.log('\n営業OKリストを保存: ' + OUTPUT_FILE);

  if (progress.blockedRows.length > 0) {
    const blockedHeader = header + ',ブロック理由,文脈';
    const blockedOutput = blockedHeader + '\n' + progress.blockedRows.map(row => row.join(',')).join('\n');
    fs.writeFileSync(BLOCKED_FILE, blockedOutput, 'utf-8');
    console.log('営業禁止リストを保存: ' + BLOCKED_FILE);
  }

  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  console.log('\n完了！');
}

main().catch(console.error);
