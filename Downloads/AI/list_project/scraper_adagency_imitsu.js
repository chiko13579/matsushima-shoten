const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const CONFIG = {
  baseUrl: 'https://imitsu.jp/ct-net-adagency/search/',
  outputFile: '全国の広告代理店リスト_imitsu.csv',
  progressFile: '全国の広告代理店リスト_imitsu_進行中.csv',
  delayBetweenPages: 2000,
  delayBetweenDetails: 1500,
  resumeFromExisting: true,
  browserRestartInterval: 200 // 200件ごとにブラウザを再起動
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
    // URLは2番目のカラム（詳細URL）
    const match = line.match(/^[^,]*,([^,]+)/);
    if (match) {
      processedUrls.add(match[1]);
    }
  });

  console.log(`📁 既存ファイルから${dataLines.length}件を読み込み`);
  return { processedUrls, lines };
}

/**
 * 総ページ数を取得
 */
async function getTotalPages(page) {
  try {
    await page.goto(CONFIG.baseUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const totalPages = await page.evaluate(() => {
      // ページネーションリンクから最大ページ番号を取得
      const pageLinks = document.querySelectorAll('a[href*="?pn="]');
      let maxPage = 1;

      pageLinks.forEach(link => {
        const href = link.href;
        const match = href.match(/[?&]pn=(\d+)/);
        if (match) {
          const pageNum = parseInt(match[1], 10);
          if (pageNum > maxPage) {
            maxPage = pageNum;
          }
        }
      });

      // 現在のページ番号表示からも取得を試みる
      const currentPageText = document.body.innerText;
      const pageMatch = currentPageText.match(/(\d+)\s*\/\s*(\d+)/);
      if (pageMatch) {
        const total = parseInt(pageMatch[2], 10);
        if (total > maxPage) {
          maxPage = total;
        }
      }

      return maxPage;
    });

    return totalPages || 1;
  } catch (error) {
    console.error(`  ❌ 総ページ数取得エラー: ${error.message}`);
    return 1;
  }
}

/**
 * 検索結果ページから広告代理店のリンクを取得
 */
async function scrapeListPage(page, pageNum) {
  try {
    const url = pageNum === 1 ?
      CONFIG.baseUrl :
      `${CONFIG.baseUrl}?pn=${pageNum}`;

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('body', { timeout: 10000 });

    // 少し待機してコンテンツが読み込まれるのを待つ
    await new Promise(resolve => setTimeout(resolve, 2000));

    const results = await page.evaluate(() => {
      const items = [];

      // h3タグ内のリンクを全て取得（広告代理店用のセレクタ）
      const links = document.querySelectorAll('h3 a[href*="/ct-net-adagency/"]');

      links.forEach(link => {
        const href = link.href;
        const name = link.textContent.trim();

        // #service-xxxxx を削除してクリーンなURLにする
        const cleanUrl = href.split('#')[0];

        if (name && cleanUrl) {
          items.push({
            name: name,
            url: cleanUrl
          });
        }
      });

      return items;
    });

    return results;
  } catch (error) {
    console.error(`  ❌ ページ取得エラー: ${error.message}`);
    return [];
  }
}

/**
 * 詳細ページからサービスURLを取得
 */
async function scrapeDetailPage(page, url) {
  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('body', { timeout: 10000 });

    const details = await page.evaluate(() => {
      let serviceUrl = '';

      // サービスURLを探す
      const allText = document.body.innerText;
      const serviceUrlMatch = allText.match(/サービスURL\s*[:：]\s*(https?:\/\/[^\s]+)/);
      if (serviceUrlMatch) {
        serviceUrl = serviceUrlMatch[1].trim();
      } else {
        // テーブル形式で探す
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('th, td');
            if (cells.length >= 2) {
              const label = cells[0].textContent.trim();
              const value = cells[1].textContent.trim();

              if (label.includes('サービスURL')) {
                serviceUrl = value;
              }
            }
          });
        });
      }

      // dlリストからも探す
      if (!serviceUrl) {
        const dls = document.querySelectorAll('dl');
        dls.forEach(dl => {
          const dts = dl.querySelectorAll('dt');
          const dds = dl.querySelectorAll('dd');

          dts.forEach((dt, index) => {
            const label = dt.textContent.trim();
            const value = dds[index] ? dds[index].textContent.trim() : '';

            if (label.includes('サービスURL')) {
              serviceUrl = value;
            }
          });
        });
      }

      return { serviceUrl };
    });

    return details;
  } catch (error) {
    console.error(`  ❌ 詳細ページ取得エラー: ${error.message}`);
    return { serviceUrl: '' };
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 広告代理店リスト取得を開始します（imitsu.jp）\n');

  // 既存データの読み込み
  const { processedUrls, lines } = CONFIG.resumeFromExisting ?
    loadExistingData() :
    { processedUrls: new Set(), lines: [] };

  let browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const allData = [];
  const header = '会社名,詳細URL,サービスURL';

  try {
    // 総ページ数を取得
    console.log('📄 総ページ数を取得中...');
    const totalPages = await getTotalPages(page);
    console.log(`  ✓ 総ページ数: ${totalPages}ページ\n`);

    let processed = 0;
    let found = 0;
    let notFound = 0;

    // 各ページを巡回
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      console.log(`\n📄 ページ ${pageNum}/${totalPages} を処理中...`);

      const listItems = await scrapeListPage(page, pageNum);
      console.log(`  ✓ ${listItems.length}件の広告代理店を発見`);

      // 各広告代理店の詳細を取得
      for (const item of listItems) {
        // 既に処理済みの場合はスキップ
        if (processedUrls.has(item.url)) {
          console.log(`  ⏭️  スキップ: ${item.name}（処理済み）`);
          continue;
        }

        console.log(`  🔍 詳細取得中: ${item.name}`);

        const details = await scrapeDetailPage(page, item.url);

        if (details.serviceUrl) {
          console.log(`    ✅ サービスURL発見: ${details.serviceUrl}`);
          found++;
        } else {
          console.log(`    ⚠️  サービスURLが見つかりませんでした`);
          notFound++;
        }

        allData.push({
          name: item.name,
          detailUrl: item.url,
          serviceUrl: details.serviceUrl || ''
        });

        processed++;
        processedUrls.add(item.url);

        // 50件ごとに保存
        if (processed % 50 === 0) {
          const csvLines = [header];

          // 既存データを追加
          if (lines.length > 0) {
            csvLines.push(...lines.slice(1));
          }

          // 新規データを追加
          allData.forEach(data => {
            csvLines.push(`${escapeCSV(data.name)},${data.detailUrl},${data.serviceUrl}`);
          });

          fs.writeFileSync(CONFIG.progressFile, csvLines.join('\n'), 'utf-8');
          console.log(`\n💾 中間保存: ${processed}件処理済み（サービスURL発見: ${found}件, 未発見: ${notFound}件）\n`);
        }

        // 200件ごとにブラウザを再起動（メモリリーク対策）
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
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenDetails));
      }

      // ページ間の待機
      if (pageNum < totalPages) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenPages));
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
      csvLines.push(`${escapeCSV(data.name)},${data.detailUrl},${data.serviceUrl}`);
    });

    fs.writeFileSync(CONFIG.outputFile, csvLines.join('\n'), 'utf-8');

    // 進行中ファイルを削除
    if (fs.existsSync(CONFIG.progressFile)) {
      fs.unlinkSync(CONFIG.progressFile);
    }

    console.log(`\n✅ 完了！ ${CONFIG.outputFile} に保存しました`);
    console.log(`📊 処理件数: ${processed}件`);
    console.log(`📊 サービスURL発見: ${found}件`);
    console.log(`📊 サービスURL未発見: ${notFound}件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await browser.close();
  }
}

main();

