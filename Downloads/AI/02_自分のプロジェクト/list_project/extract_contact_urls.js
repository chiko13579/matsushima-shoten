const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const CONFIG = {
  inputFile: '全国のシステム開発会社リスト_フィルタ済み.csv',
  outputFile: '全国のシステム開発会社リスト_コンタクト付き.csv',
  progressFile: '全国のシステム開発会社リスト_コンタクト付き_進行中.csv',
  delayBetweenPages: 1000,
  resumeFromExisting: true,
  browserRestartInterval: 100, // エラー対策: 100件ごとに再起動
  maxRetries: 3 // リトライ回数
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
 * 既存データの読み込み
 */
function loadExistingData() {
  if (!fs.existsSync(CONFIG.progressFile)) {
    return { processedUrls: new Set(), lines: [] };
  }

  const content = fs.readFileSync(CONFIG.progressFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const dataLines = lines.slice(1);

  const processedUrls = new Set();
  dataLines.forEach(line => {
    // CSVフォーマット: 市名,会社名,URL,お問合せURL
    const match = line.match(/^[^,]*,[^,]*,([^,]+)/);
    if (match) {
      processedUrls.add(match[1]);
    }
  });

  console.log(`📁 既存ファイルから${dataLines.length}件を読み込み`);
  return { processedUrls, lines };
}

/**
 * お問合せページのURLを取得（リトライ機能付き）
 */
async function extractContactUrl(page, url, retryCount = 0) {
  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    // 少し待機してページが安定するのを待つ
    await new Promise(resolve => setTimeout(resolve, 500));

    const contactUrl = await page.evaluate(() => {
      const links = document.querySelectorAll('a');

      // お問合せページのキーワード
      const contactKeywords = [
        'お問い合わせ', 'お問合せ', 'お問合わせ',
        'contact', 'Contact', 'CONTACT',
        'コンタクト', 'ご相談', '相談', '無料相談',
        '問い合わせ', '問合せ', 'inquiry'
      ];

      // パターン1: テキストベースの検索
      for (const link of links) {
        const text = link.textContent.trim();
        const href = link.href;

        if (href) {
          for (const keyword of contactKeywords) {
            if (text.includes(keyword)) {
              return href;
            }
          }
        }
      }

      // パターン2: href属性にキーワードを含む
      for (const link of links) {
        const href = link.href;

        if (href) {
          for (const keyword of contactKeywords) {
            if (href.toLowerCase().includes(keyword.toLowerCase())) {
              return href;
            }
          }
        }
      }

      return '';
    });

    return contactUrl;
  } catch (error) {
    // フレーム切断エラーやタイムアウトの場合、リトライ
    if (retryCount < CONFIG.maxRetries &&
        (error.message.includes('detached Frame') ||
         error.message.includes('timeout') ||
         error.message.includes('Navigation'))) {
      console.error(`  ⚠️  エラー発生、リトライ中 (${retryCount + 1}/${CONFIG.maxRetries}): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return extractContactUrl(page, url, retryCount + 1);
    }

    console.error(`  ❌ ページ取得エラー: ${error.message}`);
    return '';
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 お問合せページURL取得を開始します\n');

  // 入力CSVを読み込む
  const inputContent = fs.readFileSync(CONFIG.inputFile, 'utf-8');
  const inputLines = inputContent.split('\n').filter(line => line.trim());

  console.log(`📄 入力ファイル: ${inputLines.length - 1}件`);

  // 既存データの読み込み
  const { processedUrls, lines } = CONFIG.resumeFromExisting ?
    loadExistingData() :
    { processedUrls: new Set(), lines: [] };

  // 未処理のレコードのみをフィルタリング
  console.log('\n🔍 未処理のレコードを抽出中...');
  const unprocessedRecords = [];

  for (let i = 1; i < inputLines.length; i++) {
    const line = inputLines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 3) continue;

    // CSVフォーマット: 市名,会社名,URL
    const cityName = parts[0];
    const companyName = parts[1];
    const companyUrl = parts[2];
    const address = cityName; // 市名を住所として使用

    // 未処理のものだけを配列に追加
    if (!processedUrls.has(companyUrl)) {
      unprocessedRecords.push({
        originalIndex: i,
        companyName,
        companyUrl,
        address
      });
    }
  }

  console.log(`✅ 未処理: ${unprocessedRecords.length}件`);
  console.log(`⏭️  処理済み: ${processedUrls.size}件（スキップ処理なし）\n`);

  if (unprocessedRecords.length === 0) {
    console.log('🎉 すべてのレコードが処理済みです！');
    return;
  }

  let browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const allData = [];
  const header = '市名,会社名,URL,お問合せURL';

  try {
    let processed = 0;
    let found = 0;
    let notFound = 0;

    // 未処理のレコードのみを処理
    for (let idx = 0; idx < unprocessedRecords.length; idx++) {
      const record = unprocessedRecords[idx];
      const { originalIndex, companyName, companyUrl, address } = record;

      console.log(`\n[${idx + 1}/${unprocessedRecords.length}] (元: ${originalIndex}/${inputLines.length - 1}) ${companyName} を処理中...`);

      try {
        const contactUrl = await extractContactUrl(page, companyUrl);

        if (contactUrl) {
          console.log(`  ✅ お問合せページ発見: ${contactUrl}`);
          found++;
        } else {
          console.log(`  ⚠️  お問合せページが見つかりませんでした`);
          notFound++;
        }

        allData.push({
          companyName,
          companyUrl,
          address,
          contactUrl
        });

        processed++;

        // 100件ごとに保存
        if (processed % 100 === 0) {
          const csvLines = [header];

          // 既存データを追加
          if (lines.length > 0) {
            csvLines.push(...lines.slice(1));
          }

          // 新規データを追加
          allData.forEach(data => {
            csvLines.push(`${escapeCSV(data.address)},${escapeCSV(data.companyName)},${data.companyUrl},${data.contactUrl}`);
          });

          fs.writeFileSync(CONFIG.progressFile, csvLines.join('\n'), 'utf-8');
          console.log(`💾 中間保存: ${processed}件処理済み（発見: ${found}件, 未発見: ${notFound}件）`);
        }

        // 500件ごとにブラウザを再起動（メモリリーク対策）
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
        // エラーが発生しても次に進む
        allData.push({
          companyName,
          companyUrl,
          address,
          contactUrl: ''
        });
        notFound++;
        processed++;
      }
    }

    // 最終保存
    const csvLines = [header];

    // 既存データを追加
    if (lines.length > 0) {
      csvLines.push(...lines.slice(1));
    }

    // 新規データを追加
    allData.forEach(data => {
      csvLines.push(`${escapeCSV(data.address)},${escapeCSV(data.companyName)},${data.companyUrl},${data.contactUrl}`);
    });

    fs.writeFileSync(CONFIG.outputFile, csvLines.join('\n'), 'utf-8');

    // 進行中ファイルを削除
    if (fs.existsSync(CONFIG.progressFile)) {
      fs.unlinkSync(CONFIG.progressFile);
    }

    console.log(`\n✅ 完了！ ${CONFIG.outputFile} に保存しました`);
    console.log(`📊 処理件数: ${processed}件`);
    console.log(`📊 お問合せページ発見: ${found}件`);
    console.log(`📊 お問合せページ未発見: ${notFound}件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await browser.close();
  }
}

main();
