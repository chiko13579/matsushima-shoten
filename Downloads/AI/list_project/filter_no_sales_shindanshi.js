const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const CONFIG = {
  inputFile: '全国の中小企業診断士リスト_フィルター済み.csv',
  outputFile: '全国の中小企業診断士リスト_営業可能.csv',
  progressFile: '全国の中小企業診断士リスト_営業可能_進行中.csv',
  delayBetweenPages: 2000,
  resumeFromExisting: true,
  browserRestartInterval: 100
};

/**
 * CSVエスケープ処理
 */
function escapeCSV(str) {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * CSVの行を正しく解析する関数（ダブルクォート対応）
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * 既存データの読み込み
 */
function loadExistingData() {
  if (!fs.existsSync(CONFIG.progressFile)) {
    return { processedUrls: new Set(), allowedEntries: [], blockedEntries: [] };
  }

  const content = fs.readFileSync(CONFIG.progressFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const dataLines = lines.slice(1);

  const processedUrls = new Set();
  const allowedEntries = [];

  dataLines.forEach(line => {
    const parts = parseCSVLine(line);
    if (parts.length >= 3) {
      processedUrls.add(parts[2]);
      allowedEntries.push({
        city: parts[0],
        name: parts[1],
        url: parts[2],
        contactUrl: parts[3] || ''
      });
    }
  });

  console.log(`📁 既存ファイルから${allowedEntries.length}件を読み込み`);
  return { processedUrls, allowedEntries, blockedEntries: [] };
}

/**
 * お問合せページのURLを探す
 */
async function findContactPage(page, baseUrl) {
  try {
    await page.goto(baseUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});

    const contactUrl = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      const contactKeywords = [
        'お問い合わせ',
        'お問合せ',
        'お問合わせ',
        '問い合わせ',
        '問合せ',
        'contact',
        'Contact',
        'CONTACT',
        'ご相談',
        '相談'
      ];

      for (const link of links) {
        const text = link.textContent.trim();
        const href = link.href;

        for (const keyword of contactKeywords) {
          if (text.includes(keyword) && href && !href.includes('javascript:') && !href.includes('mailto:') && !href.includes('tel:')) {
            return href;
          }
        }
      }

      // hrefにcontactが含まれるリンクも探す
      for (const link of links) {
        const href = link.href;
        if (href && href.toLowerCase().includes('contact') && !href.includes('javascript:') && !href.includes('mailto:') && !href.includes('tel:')) {
          return href;
        }
      }

      return '';
    });

    return contactUrl;
  } catch (error) {
    console.error(`  ❌ ページ取得エラー: ${error.message}`);
    return '';
  }
}

/**
 * ページに「営業禁止」の記載があるかチェック
 */
async function hasNoSalesText(page, url) {
  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});

    const hasNoSales = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const noSalesKeywords = [
        '営業禁止',
        '営業お断り',
        '営業はお断り',
        'セールス禁止',
        'セールスお断り',
        '営業電話禁止',
        '営業メール禁止'
      ];

      for (const keyword of noSalesKeywords) {
        if (bodyText.includes(keyword)) {
          return { found: true, keyword };
        }
      }

      return { found: false, keyword: '' };
    });

    return hasNoSales;
  } catch (error) {
    console.error(`  ❌ ページチェックエラー: ${error.message}`);
    return { found: false, keyword: '' };
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 中小企業診断士リストから「営業禁止」記載の事務所を除外します\n');

  // 入力CSVを読み込む
  const inputContent = fs.readFileSync(CONFIG.inputFile, 'utf-8');
  const inputLines = inputContent.split('\n').filter(line => line.trim());

  console.log(`📄 入力ファイル: ${inputLines.length - 1}件`);

  // 既存データの読み込み
  const { processedUrls, allowedEntries, blockedEntries } = CONFIG.resumeFromExisting ?
    loadExistingData() :
    { processedUrls: new Set(), allowedEntries: [], blockedEntries: [] };

  let browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const newAllowedEntries = [];
  const newBlockedEntries = [];
  const header = '都市,名前,URL,お問合せページURL';

  try {
    let processed = 0;
    let allowed = allowedEntries.length;
    let blocked = blockedEntries.length;

    for (let i = 1; i < inputLines.length; i++) {
      const line = inputLines[i].trim();
      if (!line) continue;

      const parts = parseCSVLine(line);
      if (parts.length < 3) continue;

      const city = parts[0];
      const name = parts[1];
      const url = parts[2];

      // 既に処理済みの場合はスキップ
      if (processedUrls.has(url)) {
        console.log(`⏭️  ${name} はスキップ（処理済み）`);
        continue;
      }

      console.log(`\n[${i}/${inputLines.length - 1}] ${name} を処理中...`);
      console.log(`  🔗 URL: ${url}`);

      try {
        // まずトップページに「営業禁止」があるかチェック
        const topPageCheck = await hasNoSalesText(page, url);

        if (topPageCheck.found) {
          console.log(`  🚫 トップページに「${topPageCheck.keyword}」を発見 → 除外`);
          newBlockedEntries.push({ city, name, url, contactUrl: '' });
          blocked++;
          processed++;
          await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenPages));
          continue;
        }

        // お問合せページを探す
        console.log(`  📧 お問合せページを探しています...`);
        const contactUrl = await findContactPage(page, url);

        if (contactUrl) {
          console.log(`  ✅ お問合せページ発見: ${contactUrl}`);

          // お問合せページに「営業禁止」があるかチェック
          const contactPageCheck = await hasNoSalesText(page, contactUrl);

          if (contactPageCheck.found) {
            console.log(`  🚫 お問合せページに「${contactPageCheck.keyword}」を発見 → 除外`);
            newBlockedEntries.push({ city, name, url, contactUrl });
            blocked++;
          } else {
            console.log(`  ✨ 営業禁止の記載なし → リストに追加`);
            newAllowedEntries.push({ city, name, url, contactUrl });
            allowed++;
          }
        } else {
          console.log(`  ⚠️  お問合せページが見つかりません → リストに追加（営業可能と判断）`);
          newAllowedEntries.push({ city, name, url, contactUrl: '' });
          allowed++;
        }

        processed++;

        // 50件ごとに保存
        if (processed % 50 === 0) {
          const csvLines = [header];

          // 既存の許可データを追加
          allowedEntries.forEach(entry => {
            csvLines.push(`${escapeCSV(entry.city)},${escapeCSV(entry.name)},${entry.url},${entry.contactUrl || ''}`);
          });

          // 新規の許可データを追加
          newAllowedEntries.forEach(entry => {
            csvLines.push(`${escapeCSV(entry.city)},${escapeCSV(entry.name)},${entry.url},${entry.contactUrl || ''}`);
          });

          fs.writeFileSync(CONFIG.progressFile, csvLines.join('\n'), 'utf-8');
          console.log(`💾 中間保存: ${processed}件処理済み（許可: ${allowed}件, 除外: ${blocked}件）`);
        }

        // ブラウザ再起動（メモリリーク対策）
        if (processed % CONFIG.browserRestartInterval === 0) {
          console.log(`\n🔄 ブラウザを再起動します...`);
          await page.close();
          await browser.close();

          browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });

          page = await browser.newPage();
          await page.setViewport({ width: 1920, height: 1080 });
        }

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenPages));
      } catch (error) {
        console.error(`  ❌ エラー: ${error.message}`);
        // エラーが発生した場合は安全側に倒して除外
        newBlockedEntries.push({ city, name, url, contactUrl: '' });
        blocked++;
        processed++;
      }
    }

    // 最終保存
    const csvLines = [header];

    // 既存の許可データを追加
    allowedEntries.forEach(entry => {
      csvLines.push(`${escapeCSV(entry.city)},${escapeCSV(entry.name)},${entry.url},${entry.contactUrl || ''}`);
    });

    // 新規の許可データを追加
    newAllowedEntries.forEach(entry => {
      csvLines.push(`${escapeCSV(entry.city)},${escapeCSV(entry.name)},${entry.url},${entry.contactUrl || ''}`);
    });

    fs.writeFileSync(CONFIG.outputFile, csvLines.join('\n'), 'utf-8');

    // ブロックされたエントリも別ファイルに保存（参考用）
    const blockedCsvLines = [header];
    blockedEntries.concat(newBlockedEntries).forEach(entry => {
      blockedCsvLines.push(`${escapeCSV(entry.city)},${escapeCSV(entry.name)},${entry.url},${entry.contactUrl || ''}`);
    });
    fs.writeFileSync('全国の中小企業診断士リスト_営業禁止.csv', blockedCsvLines.join('\n'), 'utf-8');

    // 進行中ファイルを削除
    if (fs.existsSync(CONFIG.progressFile)) {
      fs.unlinkSync(CONFIG.progressFile);
    }

    console.log(`\n✅ 完了！ ${CONFIG.outputFile} に保存しました`);
    console.log(`📊 処理件数: ${processed}件`);
    console.log(`📊 営業可能: ${allowed}件 (${(allowed / (allowed + blocked) * 100).toFixed(1)}%)`);
    console.log(`📊 営業禁止: ${blocked}件 (${(blocked / (allowed + blocked) * 100).toFixed(1)}%)`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await browser.close();
  }
}

main();
