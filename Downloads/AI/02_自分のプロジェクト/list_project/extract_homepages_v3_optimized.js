const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const CONFIG = {
  inputFile: '全国の社労士リスト_syaroushikensaku_v2.csv',
  outputFile: '全国の社労士リスト_v2_ホームページ付き.csv',
  progressFile: '全国の社労士リスト_v2_ホームページ付き_進行中.csv',
  delayBetweenPages: 1500,
  resumeFromExisting: true,
  browserRestartInterval: 500 // 500件ごとにブラウザを再起動
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
    // URLは3番目のカラム（ただしCSVエスケープを考慮）
    const match = line.match(/^[^,]*,[^,]*,([^,]+)/);
    if (match) {
      processedUrls.add(match[1]);
    }
  });

  console.log(`📁 既存ファイルから${dataLines.length}件を読み込み`);
  return { processedUrls, lines };
}

/**
 * 詳細ページからホームページURLを取得
 */
async function extractHomepage(page, url) {
  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('body', { timeout: 10000 });

    const homepage = await page.evaluate(() => {
      // ホームページへのリンクを探す
      // 一般的なパターン:
      // 1. "ホームページ", "HP", "公式サイト", "WEBサイト" などのテキストを含むリンク
      // 2. 外部リンク（syaroushikensaku.com以外）

      const links = document.querySelectorAll('a');

      // パターン1: テキストベースの検索
      const homepageKeywords = ['ホームページ', 'HP', '公式サイト', 'WEBサイト', 'ウェブサイト', 'webサイト'];

      for (const link of links) {
        const text = link.textContent.trim();
        const href = link.href;

        // syaroushikensaku.com以外のリンクで、キーワードを含む
        if (href && !href.includes('syaroushikensaku.com')) {
          for (const keyword of homepageKeywords) {
            if (text.includes(keyword)) {
              return href;
            }
          }
        }
      }

      // パターン2: 外部リンクを探す（syaroushikensaku.com以外）
      for (const link of links) {
        const href = link.href;

        if (href &&
            !href.includes('syaroushikensaku.com') &&
            !href.includes('javascript:') &&
            !href.includes('mailto:') &&
            !href.includes('tel:') &&
            (href.startsWith('http://') || href.startsWith('https://'))) {
          return href;
        }
      }

      return '';
    });

    return homepage;
  } catch (error) {
    console.error(`  ❌ ページ取得エラー: ${error.message}`);
    return '';
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 ホームページURL取得を開始します（v3 - 最適化版）\n');

  // 入力CSVを読み込む
  const inputContent = fs.readFileSync(CONFIG.inputFile, 'utf-8');
  const inputLines = inputContent.split('\n').filter(line => line.trim());

  console.log(`📄 入力ファイル: ${inputLines.length - 1}件`);

  // 既存データの読み込み
  const { processedUrls, lines } = CONFIG.resumeFromExisting ?
    loadExistingData() :
    { processedUrls: new Set(), lines: [] };

  // 【最適化】未処理のレコードのみをフィルタリング
  console.log('\n🔍 未処理のレコードを抽出中...');
  const unprocessedRecords = [];

  for (let i = 1; i < inputLines.length; i++) {
    const line = inputLines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 3) continue;

    const prefecture = parts[0];
    const name = parts[1];
    const detailUrl = parts[2];

    // 未処理のものだけを配列に追加
    if (!processedUrls.has(detailUrl)) {
      unprocessedRecords.push({
        originalIndex: i,
        prefecture,
        name,
        detailUrl
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
  const header = '都道府県,名前,詳細URL,ホームページURL';

  try {
    let processed = 0;
    let found = 0;
    let notFound = 0;

    // 未処理のレコードのみを処理
    for (let idx = 0; idx < unprocessedRecords.length; idx++) {
      const record = unprocessedRecords[idx];
      const { originalIndex, prefecture, name, detailUrl } = record;

      console.log(`\n[${idx + 1}/${unprocessedRecords.length}] (元: ${originalIndex}/${inputLines.length - 1}) ${name} を処理中...`);

      try {
        const homepage = await extractHomepage(page, detailUrl);

        if (homepage) {
          console.log(`  ✅ ホームページ発見: ${homepage}`);
          found++;
        } else {
          console.log(`  ⚠️  ホームページが見つかりませんでした`);
          notFound++;
        }

        allData.push({
          prefecture,
          name,
          detailUrl,
          homepage
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
            csvLines.push(`${escapeCSV(data.prefecture)},${escapeCSV(data.name)},${data.detailUrl},${data.homepage}`);
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
          prefecture,
          name,
          detailUrl,
          homepage: ''
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
      csvLines.push(`${escapeCSV(data.prefecture)},${escapeCSV(data.name)},${data.detailUrl},${data.homepage}`);
    });

    fs.writeFileSync(CONFIG.outputFile, csvLines.join('\n'), 'utf-8');

    // 進行中ファイルを削除
    if (fs.existsSync(CONFIG.progressFile)) {
      fs.unlinkSync(CONFIG.progressFile);
    }

    console.log(`\n✅ 完了！ ${CONFIG.outputFile} に保存しました`);
    console.log(`📊 処理件数: ${processed}件`);
    console.log(`📊 ホームページ発見: ${found}件`);
    console.log(`📊 ホームページ未発見: ${notFound}件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await browser.close();
  }
}

main();
