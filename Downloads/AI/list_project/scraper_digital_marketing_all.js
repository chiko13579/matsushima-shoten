const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const CONFIG = {
  // 検索キーワードリスト
  searchKeywords: [
    'Web制作会社',
    '広告代理店',
    'SEO会社',
    'デジタルマーケティング会社',
    'SNSマーケティング',
    'SNS運用代行',
    'コンテンツマーケティング',
    'Webコンサルティング',
    'ECサイト制作',
  ],

  // 入出力ファイル
  citiesFile: '全国の市.txt',
  outputFile: '全国のデジタルマーケティング会社リスト.csv',
  progressFile: '全国のデジタルマーケティング会社リスト_進行中.csv',

  // 検索設定
  maxScrolls: 5,              // 各キーワードのスクロール回数（少なめ）

  // 待機時間
  delayBetweenCities: 3000,
  delayBetweenKeywords: 2000,
  delayBetweenScrolls: 1500,

  // 再開設定
  resumeFromExisting: true,

  // ブラウザ設定
  browserRestartInterval: 20,
  saveInterval: 3
};

// 除外するドメイン
const EXCLUDED_DOMAINS = [
  'duckduckgo.com',
  'google.com', 'google.co.jp',
  'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
  'wikipedia.org', 'amazon.co.jp', 'rakuten.co.jp',
  'rikunabi.com', 'mynavi.jp', 'doda.jp', 'indeed.com', 'bizreach.jp',
  'type.jp', 'en-japan.com', 'wantedly.com', 'green-japan.com',
  'imitsu.jp', 'comparebiz.net', 'meetsmore.com',
  'note.com', 'qiita.com', 'hatena.ne.jp', 'ameblo.jp',
  'biz.ne.jp', 'boxil.jp', 'ferret-plus.com', 'liskul.com',
  'lancers.jp', 'crowdworks.jp', 'coconala.com'
];

function escapeCSV(str) {
  if (!str) return '';
  const strValue = String(str);
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
}

function loadCities() {
  const content = fs.readFileSync(CONFIG.citiesFile, 'utf-8');
  return content.split('\n').map(line => line.trim()).filter(line => line);
}

function loadExistingData() {
  if (!fs.existsSync(CONFIG.progressFile)) {
    return { processedCities: new Set(), results: [], seenDomains: new Set() };
  }

  const content = fs.readFileSync(CONFIG.progressFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const dataLines = lines.slice(1);

  const processedCities = new Set();
  const results = [];
  const seenDomains = new Set();

  dataLines.forEach(line => {
    const match = line.match(/^([^,]+),/);
    if (match) {
      processedCities.add(match[1]);
      results.push(line);

      // URLからドメインを抽出して重複チェック用に保存
      const urlMatch = line.match(/,(https?:\/\/[^,]+)/);
      if (urlMatch) {
        const domain = getDomain(urlMatch[1]);
        seenDomains.add(domain);
      }
    }
  });

  console.log(`📁 既存ファイルから${processedCities.size}市分のデータを読み込み`);
  console.log(`📁 既存ドメイン数: ${seenDomains.size}件`);
  return { processedCities, results, seenDomains };
}

function saveResults(results, filename) {
  const header = '市名,会社名,URL,検索キーワード';
  const content = [header, ...results].join('\n');
  fs.writeFileSync(filename, content, 'utf-8');
}

function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isExcludedDomain(url) {
  const domain = getDomain(url);
  return EXCLUDED_DOMAINS.some(excluded => domain.includes(excluded));
}

async function searchWithKeyword(page, city, keyword, seenDomains) {
  const searchQuery = `${keyword} ${city}`;

  try {
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&kl=jp-jp`;
    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const results = [];

    for (let scroll = 0; scroll < CONFIG.maxScrolls; scroll++) {
      const pageResults = await page.evaluate(() => {
        const items = [];
        const selectors = [
          'article[data-testid="result"]',
          '.result',
          '[data-result="web"]',
          'div.nrn-react-div'
        ];

        for (const selector of selectors) {
          const results = document.querySelectorAll(selector);
          if (results.length > 0) {
            results.forEach(result => {
              const linkElement = result.querySelector('a[href^="http"]:not([href*="duckduckgo.com"])') ||
                                 result.querySelector('a[data-testid="result-title-a"]') ||
                                 result.querySelector('h2 a');

              if (linkElement) {
                const url = linkElement.href;
                const title = linkElement.textContent.trim() ||
                             (result.querySelector('h2') ? result.querySelector('h2').textContent.trim() : '');

                if (url && title && url.startsWith('http') && !url.includes('duckduckgo.com')) {
                  items.push({ title, url });
                }
              }
            });
            break;
          }
        }
        return items;
      });

      for (const result of pageResults) {
        const domain = getDomain(result.url);
        if (!seenDomains.has(domain) && !isExcludedDomain(result.url)) {
          seenDomains.add(domain);
          results.push({
            city,
            title: result.title,
            url: result.url,
            keyword
          });
        }
      }

      // スクロール
      await page.evaluate(() => {
        const moreButton = document.querySelector('button[id="more-results"]') ||
                          document.querySelector('a.result--more');
        if (moreButton) {
          moreButton.click();
        } else {
          window.scrollTo(0, document.body.scrollHeight);
        }
      });

      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenScrolls));
    }

    return results;

  } catch (error) {
    console.error(`    ❌ ${keyword}検索エラー: ${error.message}`);
    return [];
  }
}

async function searchCity(page, city, seenDomains) {
  console.log(`\n🔍 ${city} を検索中...`);

  const allResults = [];

  for (const keyword of CONFIG.searchKeywords) {
    process.stdout.write(`  📝 ${keyword}... `);

    const keywordResults = await searchWithKeyword(page, city, keyword, seenDomains);
    allResults.push(...keywordResults);

    console.log(`${keywordResults.length}件`);

    await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenKeywords));
  }

  return allResults;
}

async function main() {
  console.log('🚀 デジタルマーケティング会社検索を開始します\n');
  console.log(`📝 検索キーワード: ${CONFIG.searchKeywords.length}種類`);
  CONFIG.searchKeywords.forEach(kw => console.log(`   - ${kw}`));
  console.log();

  const cities = loadCities();
  console.log(`📍 対象市数: ${cities.length}市\n`);

  const { processedCities, results, seenDomains } = CONFIG.resumeFromExisting
    ? loadExistingData()
    : { processedCities: new Set(), results: [], seenDomains: new Set() };

  let browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ja']
  });

  let page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9' });

  let processedCount = 0;
  let totalCompanies = results.length;

  try {
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];

      if (processedCities.has(city)) {
        continue;
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`[${i + 1}/${cities.length}] ${city}`);
      console.log(`${'='.repeat(60)}`);

      const cityResults = await searchCity(page, city, seenDomains);

      for (const result of cityResults) {
        results.push(`${escapeCSV(result.city)},${escapeCSV(result.title)},${escapeCSV(result.url)},${escapeCSV(result.keyword)}`);
      }

      processedCities.add(city);
      processedCount++;
      totalCompanies += cityResults.length;

      console.log(`✅ ${city}: ${cityResults.length}件取得（累計: ${totalCompanies}件）`);

      if (processedCount % CONFIG.saveInterval === 0) {
        saveResults(results, CONFIG.progressFile);
        console.log(`\n💾 中間保存: ${processedCount}市処理済み`);
      }

      if (processedCount % CONFIG.browserRestartInterval === 0 && i < cities.length - 1) {
        console.log(`\n🔄 ブラウザを再起動します...`);
        await page.close();
        await browser.close();

        browser = await puppeteer.launch({
          headless: false,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ja']
        });

        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9' });
      }

      if (i < cities.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenCities));
      }
    }

    saveResults(results, CONFIG.outputFile);

    if (fs.existsSync(CONFIG.progressFile)) {
      fs.unlinkSync(CONFIG.progressFile);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ 完了！');
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 処理市数: ${processedCount}市`);
    console.log(`📊 取得会社数: ${totalCompanies}件`);
    console.log(`📊 ユニークドメイン数: ${seenDomains.size}件`);
    console.log(`📄 出力ファイル: ${CONFIG.outputFile}`);

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    saveResults(results, CONFIG.progressFile);
    console.log(`💾 進行中データを保存しました: ${CONFIG.progressFile}`);

  } finally {
    await browser.close();
  }
}

main();
