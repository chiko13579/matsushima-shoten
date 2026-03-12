const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const CONFIG = {
  inputFile: '税理士検索_全国リスト.csv',
  outputFile: '税理士検索_営業可能リスト.csv',
  progressFile: '税理士検索_営業可能リスト_進行中.csv',
  excludedFile: '税理士検索_営業禁止リスト.csv',
  delayBetweenPages: 3000,
  resumeFromExisting: true,
  browserRestartInterval: 50,
  saveInterval: 10
};

// 検索エンジンでホームページを探す
async function findHomepage(page, businessName, region) {
  try {
    // 検索クエリを作成（地域名を追加）
    const searchQuery = region
      ? `${businessName} ${region} 税理士`
      : `${businessName} 税理士`;
    console.log(`  🔍 検索: ${searchQuery}`);

    // DuckDuckGoで検索
    await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 検索結果から最初のリンクを取得
    const homepageUrl = await page.evaluate(() => {
      // 検索結果のリンクを取得
      const links = document.querySelectorAll('a[data-testid="result-title-a"]');
      if (links.length > 0) {
        return links[0].href;
      }

      // 別のセレクタを試す
      const altLinks = document.querySelectorAll('.result__a');
      if (altLinks.length > 0) {
        return altLinks[0].href;
      }

      return null;
    });

    if (!homepageUrl) {
      console.log(`  ⚠️  ホームページが見つかりません`);
      return null;
    }

    // 除外すべきドメイン（税理士検索サイトなど）
    const excludedDomains = [
      'zeirishikensaku.jp',
      'zeiri4.com',
      'zeirishi-kensaku.com',
      'nichizeiren.or.jp',
      'meetsmore.com',
      'minnano-zeirishi.jp',
      'yayoi-kk.co.jp',
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'linkedin.com'
    ];

    if (excludedDomains.some(domain => homepageUrl.includes(domain))) {
      console.log(`  ⚠️  除外ドメイン: ${homepageUrl}`);
      return null;
    }

    console.log(`  ✅ ホームページ発見: ${homepageUrl}`);
    return homepageUrl;

  } catch (error) {
    console.log(`  ❌ 検索エラー: ${error.message}`);
    return null;
  }
}

// お問合せページを探す
async function findContactPage(page, baseUrl) {
  try {
    const contactKeywords = [
      'お問い合わせ', 'お問合せ', 'contact', 'Contact', 'CONTACT', 'ご相談', '相談'
    ];

    const links = await page.evaluate((keywords) => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      const contactLinks = [];

      allLinks.forEach(link => {
        const text = link.textContent.trim();
        const href = link.href;

        if (keywords.some(keyword => text.includes(keyword) || href.includes(keyword))) {
          contactLinks.push(href);
        }
      });

      return contactLinks;
    }, contactKeywords);

    if (links.length > 0) {
      return links[0];
    }

    return null;
  } catch (error) {
    console.log(`  ❌ お問合せページ検索エラー: ${error.message}`);
    return null;
  }
}

// 営業禁止のテキストをチェック
async function hasNoSalesText(page, url) {
  try {
    const noSalesKeywords = [
      '営業禁止', '営業お断り', '営業はお断り', 'セールス禁止',
      'セールスお断り', '営業電話禁止', '営業メール禁止',
      '営業', '売り込み禁止', '売込み禁止'
    ];

    const pageText = await page.evaluate(() => {
      return document.body.textContent;
    });

    for (const keyword of noSalesKeywords) {
      if (pageText.includes(keyword)) {
        console.log(`  🚫 「${keyword}」を発見 → 除外`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.log(`  ❌ ページチェックエラー: ${error.message}`);
    return false;
  }
}

// CSVを解析
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const parts = lines[i].split(',');
    if (parts.length >= 5) {
      // parts[4]が事業者名（先頭の「・」を削除）
      const businessName = (parts[4] || '').replace(/^・/, '').trim();

      result.push({
        tax_association: parts[0],
        branch: parts[1],
        number: parts[2],
        name_field: parts[3],
        business_name: businessName,
        url: ''
      });
    }
  }

  return result;
}

// CSVとして保存
function saveToCSV(data, filename) {
  const header = '税理士会,支部,番号,氏名,事業者名,ホームページURL\n';
  const rows = data.map(item => {
    return `${escapeCSV(item.tax_association)},${escapeCSV(item.branch)},${escapeCSV(item.number)},${escapeCSV(item.name_field)},${escapeCSV(item.business_name)},${escapeCSV(item.url)}`;
  });

  fs.writeFileSync(filename, header + rows.join('\n'), 'utf-8');
}

function escapeCSV(str) {
  if (!str) return '';
  const strValue = String(str);
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
}

async function main() {
  console.log('🚀 税理士リストから営業可能な事務所を抽出します\n');

  // 入力ファイルを読み込む
  const csvContent = fs.readFileSync(CONFIG.inputFile, 'utf-8');
  const allData = parseCSV(csvContent);

  console.log(`📄 入力ファイル: ${allData.length}件\n`);

  // 既に処理済みのデータを読み込む
  let processedData = [];
  let excludedData = [];
  let startIndex = 0;

  if (CONFIG.resumeFromExisting && fs.existsSync(CONFIG.progressFile)) {
    const progressContent = fs.readFileSync(CONFIG.progressFile, 'utf-8');
    const progressLines = progressContent.split('\n');
    startIndex = progressLines.length - 2; // ヘッダーを除く
    console.log(`📄 進行中ファイルから再開: ${startIndex}件処理済み\n`);
  }

  let browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  for (let i = startIndex; i < allData.length; i++) {
    const item = allData[i];

    console.log(`[${i + 1}/${allData.length}] ${item.business_name} を処理中...`);

    try {
      // 支部名から地域を抽出（例: 札幌中支部 → 札幌）
      const region = item.branch.replace(/[東西南北中]?支部$/, '');

      // ホームページを検索
      const homepageUrl = await findHomepage(page, item.business_name, region);

      if (!homepageUrl) {
        console.log(`  ⚠️  ホームページが見つかりません → スキップ\n`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenPages));
        continue;
      }

      item.url = homepageUrl;

      // ホームページにアクセス
      await page.goto(homepageUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // お問合せページを探す
      console.log(`  📧 お問合せページを探しています...`);
      const contactUrl = await findContactPage(page, homepageUrl);

      if (!contactUrl) {
        console.log(`  ⚠️  お問合せページが見つかりません → リストに追加（営業可能と判断）\n`);
        processedData.push(item);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenPages));
        continue;
      }

      console.log(`  ✅ お問合せページ発見: ${contactUrl}`);

      // お問合せページにアクセス
      await page.goto(contactUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // 営業禁止のテキストをチェック
      const hasNoSales = await hasNoSalesText(page, contactUrl);

      if (hasNoSales) {
        console.log(`  🚫 営業禁止 → 除外リストに追加\n`);
        excludedData.push(item);
      } else {
        console.log(`  ✨ 営業可能 → リストに追加\n`);
        processedData.push(item);
      }

    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      console.log(`  → スキップ\n`);
    }

    await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenPages));

    // 定期保存
    if ((i + 1) % CONFIG.saveInterval === 0) {
      saveToCSV(processedData, CONFIG.progressFile);
      if (excludedData.length > 0) {
        saveToCSV(excludedData, CONFIG.excludedFile);
      }
      console.log(`💾 中間保存: ${i + 1}件処理済み（営業可能: ${processedData.length}件, 営業禁止: ${excludedData.length}件）\n`);
    }

    // ブラウザ再起動
    if ((i + 1) % CONFIG.browserRestartInterval === 0) {
      console.log(`🔄 ブラウザを再起動します...\n`);
      await browser.close();
      browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
    }
  }

  // 最終保存
  saveToCSV(processedData, CONFIG.outputFile);
  if (excludedData.length > 0) {
    saveToCSV(excludedData, CONFIG.excludedFile);
  }

  await browser.close();

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ 完了！');
  console.log(`${'='.repeat(80)}`);
  console.log(`📊 処理件数: ${allData.length}件`);
  console.log(`📊 営業可能: ${processedData.length}件`);
  console.log(`📊 営業禁止: ${excludedData.length}件`);
  console.log(`📄 出力ファイル: ${CONFIG.outputFile}`);
  if (excludedData.length > 0) {
    console.log(`📄 除外リスト: ${CONFIG.excludedFile}`);
  }
}

main();
