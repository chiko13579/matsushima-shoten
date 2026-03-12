const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// 営業禁止ワード
const PROHIBITED_WORDS = [
  '営業禁止',
  '営業目的',
  '営業お断り',
  '営業はお断り',
  '営業のお問い合わせ',
  '営業の方',
  '営業メール',
  '売り込み',
  'セールス目的',
  'セールスお断り',
  '勧誘目的',
  '勧誘お断り',
  '広告・宣伝目的',
  '宣伝目的',
  '商用目的でのお問い合わせ',
  '営業連絡はご遠慮',
  '営業活動はご遠慮',
  '営業ご遠慮',
  '営業についてはお断り'
];

const CONFIG = {
  inputFile: process.argv[2] || '全国のシステム開発会社リスト_コンタクト付き.csv',
  outputFile: process.argv[3] || '全国のシステム開発会社リスト_営業OK.csv',
  prohibitedFile: '全国のシステム開発会社リスト_営業禁止.csv',
  progressFile: '全国のシステム開発会社リスト_営業チェック_進行中.csv',
  timeout: 15000,
  startFrom: parseInt(process.argv[4]) || 0,  // 何件目から開始するか
  browserRestartInterval: 100  // 100件ごとにブラウザ再起動
};

async function checkPage(browser, url) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
    await new Promise(r => setTimeout(r, 2000));

    const pageText = await page.evaluate(() => document.body?.innerText || '');

    for (const word of PROHIBITED_WORDS) {
      if (pageText.includes(word)) {
        return { prohibited: true, word };
      }
    }

    return { prohibited: false };
  } catch (err) {
    return { prohibited: false, error: err.message };
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🔍 営業禁止ワードチェックを開始します...\n');

  const csvContent = fs.readFileSync(CONFIG.inputFile, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const header = lines[0];
  const dataLines = lines.slice(1);

  console.log(`📋 チェック対象: ${dataLines.length}件`);
  if (CONFIG.startFrom > 0) {
    console.log(`📍 ${CONFIG.startFrom}件目から再開します\n`);
  } else {
    console.log('');
  }

  const browser = await puppeteer.launch({ headless: true });

  // 既存結果を読み込む（再開の場合）
  let okLines = [];
  let prohibitedLines = [];

  if (CONFIG.startFrom > 0) {
    // startFromまでの行は既にOKとして処理済みとみなす
    okLines = dataLines.slice(0, CONFIG.startFrom);
    console.log(`📂 前回分 ${CONFIG.startFrom}件をスキップして追加`);
  }

  let checked = CONFIG.startFrom;
  let skipped = 0;
  let okCount = 0;
  let prohibitedCount = 0;

  // 定期保存用
  const saveResults = () => {
    fs.writeFileSync(CONFIG.outputFile, header + '\n' + okLines.join('\n'), 'utf-8');
    fs.writeFileSync(CONFIG.prohibitedFile, header + '\n' + prohibitedLines.join('\n'), 'utf-8');
  };

  for (let i = CONFIG.startFrom; i < dataLines.length; i++) {
    const line = dataLines[i];
    const cols = line.split(',');
    // CSVフォーマット: 市名,会社名,URL,お問合せURL
    const companyName = cols[1];  // 会社名は2列目
    const contactUrl = cols[3];   // お問合せURLは4列目

    checked++;
    process.stdout.write(`\r[${checked}/${dataLines.length}] ${companyName.substring(0, 20).padEnd(20)}...`);

    if (!contactUrl || contactUrl.trim() === '') {
      okLines.push(line);
      skipped++;
      okCount++;
      continue;
    }

    const result = await checkPage(browser, contactUrl);

    if (result.prohibited) {
      prohibitedLines.push(line);
      prohibitedCount++;
      console.log(`\n   ❌ 営業禁止: "${result.word}"`);
    } else {
      okLines.push(line);
      okCount++;
    }

    // 50件ごとに保存
    if ((checked - CONFIG.startFrom) % 50 === 0) {
      saveResults();
    }
  }

  await browser.close();

  // 最終結果を保存
  saveResults();

  console.log('\n\n✅ 完了！');
  console.log(`📊 営業OK: ${okLines.length}件 → ${CONFIG.outputFile}`);
  console.log(`📊 営業禁止: ${prohibitedLines.length}件 → ${CONFIG.prohibitedFile}`);
  console.log(`📊 今回処理: OK ${okCount}件, 禁止 ${prohibitedCount}件`);
  console.log(`📊 URLなしスキップ: ${skipped}件`);
}

main().catch(console.error);
