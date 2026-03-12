const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const CONFIG = {
  inputFile: '全国の広告代理店リスト_imitsu.csv',
  outputFile: '全国の広告代理店リスト_imitsu_お問合せURL追加.csv',
  progressFile: '全国の広告代理店リスト_imitsu_進行中.json',
  delayBetweenRequests: 2000,
  maxRetries: 3,
  browserRestartInterval: 100 // 100件ごとにブラウザを再起動
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
 * CSVをパース
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { header: '', rows: [] };

  const header = lines[0];
  const rows = lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  });

  return { header, rows };
}

/**
 * 既存データの読み込み
 */
function loadExistingData() {
  if (!fs.existsSync(CONFIG.progressFile)) {
    return { processedUrls: new Set(), contactUrls: {} };
  }

  const data = JSON.parse(fs.readFileSync(CONFIG.progressFile, 'utf-8'));
  return {
    processedUrls: new Set(data.processedUrls || []),
    contactUrls: data.contactUrls || {}
  };
}

/**
 * 進捗を保存
 */
function saveProgress(processedUrls, contactUrls) {
  const data = {
    processedUrls: Array.from(processedUrls),
    contactUrls: contactUrls
  };
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * お問合せページのURLを取得（リトライ機能付き）
 */
async function extractContactUrl(page, url, retryCount = 0) {
  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // 少し待機してページが安定するのを待つ
    await new Promise(resolve => setTimeout(resolve, 1500));

    const contactUrl = await page.evaluate(() => {
      const links = document.querySelectorAll('a');

      // お問合せページのキーワード
      const contactKeywords = [
        'お問い合わせ', 'お問合せ', 'お問合わせ',
        'contact', 'Contact', 'CONTACT',
        'コンタクト', 'ご相談', '相談', '無料相談',
        '問い合わせ', '問合せ', 'inquiry', 'Inquiry'
      ];

      // スコアリング方式で最適なリンクを選ぶ
      const candidates = [];

      for (const link of links) {
        const text = link.textContent.trim();
        const href = link.href;

        if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          continue;
        }

        let score = 0;

        // テキストベースのスコアリング
        for (const keyword of contactKeywords) {
          if (text.includes(keyword)) {
            score += 10;
            break;
          }
        }

        // href属性ベースのスコアリング
        const hrefLower = href.toLowerCase();
        for (const keyword of contactKeywords) {
          if (hrefLower.includes(keyword.toLowerCase())) {
            score += 5;
            break;
          }
        }

        // 特定のパスパターン
        if (hrefLower.includes('/contact') || hrefLower.includes('/otoiawase') || 
            hrefLower.includes('/inquiry') || hrefLower.includes('/form')) {
          score += 3;
        }

        if (score > 0) {
          candidates.push({ href, score, text });
        }
      }

      // スコアが高い順にソート
      candidates.sort((a, b) => b.score - a.score);

      // トップページ自体にフォームがあるかも確認
      const forms = document.querySelectorAll('form');
      let hasFormOnTop = false;
      for (const form of forms) {
        const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="search"]), textarea');
        if (inputs.length >= 2) {
          hasFormOnTop = true;
          break;
        }
      }

      if (hasFormOnTop && candidates.length === 0) {
        return url; // トップページにフォームがある場合はトップページを返す
      }

      return candidates.length > 0 ? candidates[0].href : '';
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
  console.log('🚀 お問合せURL取得を開始します\n');

  // 既存データの読み込み
  const { processedUrls, contactUrls } = loadExistingData();
  console.log(`📁 既存データ: ${processedUrls.size}件処理済み\n`);

  // CSVファイルを読み込み
  const csvContent = fs.readFileSync(CONFIG.inputFile, 'utf-8');
  const { header, rows } = parseCSV(csvContent);
  console.log(`📄 CSVファイル読み込み: ${rows.length}件\n`);

  let browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 120000 // タイムアウトを120秒に延長
  });

  let page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  let processed = 0;
  let found = 0;
  let notFound = 0;

  try {
    // 新しいヘッダー（詳細URLを削除、お問合せURLを追加）
    const newHeader = '会社名,サービスURL,お問合せURL';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 3) continue;

      const companyName = row[0];
      const serviceUrl = row[2]; // サービスURLは3番目のカラム

      if (!serviceUrl || serviceUrl.trim() === '') {
        console.log(`[${i + 1}/${rows.length}] ⏭️  スキップ: ${companyName}（サービスURLなし）`);
        continue;
      }

      // 既に処理済みの場合はスキップ
      if (processedUrls.has(serviceUrl)) {
        console.log(`[${i + 1}/${rows.length}] ⏭️  スキップ: ${companyName}（処理済み）`);
        continue;
      }

      console.log(`[${i + 1}/${rows.length}] 🔍 取得中: ${companyName}`);
      console.log(`   サービスURL: ${serviceUrl}`);

      const contactUrl = await extractContactUrl(page, serviceUrl);

      if (contactUrl) {
        console.log(`   ✅ お問合せURL発見: ${contactUrl}`);
        contactUrls[serviceUrl] = contactUrl;
        found++;
      } else {
        console.log(`   ⚠️  お問合せURLが見つかりませんでした`);
        contactUrls[serviceUrl] = '';
        notFound++;
      }

      processed++;
      processedUrls.add(serviceUrl);

      // 50件ごとに進捗を保存
      if (processed % 50 === 0) {
        saveProgress(processedUrls, contactUrls);
        console.log(`\n💾 中間保存: ${processed}件処理済み（発見: ${found}件, 未発見: ${notFound}件）\n`);
      }

      // 100件ごとにブラウザを再起動（メモリリーク対策）
      if (processed % CONFIG.browserRestartInterval === 0) {
        console.log(`\n🔄 ブラウザを再起動します...`);
        try {
          await page.close().catch(() => {});
          await browser.close().catch(() => {});
        } catch (e) {
          // エラーを無視
        }

        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          protocolTimeout: 120000 // タイムアウトを120秒に延長
        });

        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
      }

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests));
    }

    // 最終保存
    saveProgress(processedUrls, contactUrls);

    // 新しいCSVファイルを作成
    const csvLines = [newHeader];
    for (const row of rows) {
      if (row.length < 3) continue;

      const companyName = row[0];
      const serviceUrl = row[2];
      const contactUrl = contactUrls[serviceUrl] || '';

      csvLines.push(`${escapeCSV(companyName)},${serviceUrl},${contactUrl}`);
    }

    fs.writeFileSync(CONFIG.outputFile, csvLines.join('\n'), 'utf-8');

    // 進行中ファイルを削除
    if (fs.existsSync(CONFIG.progressFile)) {
      fs.unlinkSync(CONFIG.progressFile);
    }

    console.log(`\n✅ 完了！ ${CONFIG.outputFile} に保存しました`);
    console.log(`📊 処理件数: ${processed}件`);
    console.log(`📊 お問合せURL発見: ${found}件`);
    console.log(`📊 お問合せURL未発見: ${notFound}件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    saveProgress(processedUrls, contactUrls);
  } finally {
    try {
      await page.close().catch(() => {});
      await browser.close().catch(() => {});
    } catch (e) {
      // エラーを無視
    }
  }
}

main();

