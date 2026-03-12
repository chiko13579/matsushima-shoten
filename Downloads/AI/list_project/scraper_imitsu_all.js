const puppeteer = require('puppeteer');
const fs = require('fs');

// 設定
const BASE_URL = 'https://imitsu.jp/ct-hp-design/search/';
const OUTPUT_FILE = 'imitsu_hp制作会社リスト_全件.csv';
const PROGRESS_FILE = 'imitsu_progress.json';
const ITEMS_PER_PAGE = 20;
const TOTAL_ITEMS = 10841;
const TOTAL_PAGES = Math.ceil(TOTAL_ITEMS / ITEMS_PER_PAGE); // 543ページ

async function scrapeImitsu() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 進捗を読み込み（再開用）
  let startPage = 1;
  let allCompanies = new Map();

  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      startPage = progress.lastPage + 1;
      progress.companies.forEach(c => allCompanies.set(c.supplierId, c));
      console.log(`前回の進捗から再開: ${startPage}ページ目から (${allCompanies.size}件取得済み)`);
    } catch (e) {
      console.log('新規開始');
    }
  }

  try {
    // Step 1: 検索結果ページを巡回して会社リンクを収集
    console.log(`\n========================================`);
    console.log(`Step 1: 会社リンクを収集中...`);
    console.log(`総ページ数: ${TOTAL_PAGES}ページ`);
    console.log(`========================================\n`);

    for (let pageNum = startPage; pageNum <= TOTAL_PAGES; pageNum++) {
      const url = `${BASE_URL}?page=${pageNum}`;

      if (pageNum % 10 === 1 || pageNum === startPage) {
        console.log(`[${pageNum}/${TOTAL_PAGES}ページ] 処理中... (累計: ${allCompanies.size}件)`);
      }

      try {
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2500));

        // 会社リンクを取得
        const companies = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/supplier/"]'));
          const data = [];
          const seen = new Set();

          links.forEach(link => {
            const href = link.href;
            const match = href.match(/\/supplier\/(\d+)/);
            if (match && !seen.has(match[1])) {
              seen.add(match[1]);
              data.push({
                supplierId: match[1],
                url: href.split('#')[0],
                name: link.textContent.trim()
              });
            }
          });

          return data;
        });

        // 新規の会社を追加
        companies.forEach(c => {
          if (!allCompanies.has(c.supplierId)) {
            allCompanies.set(c.supplierId, c);
          }
        });

        // 定期的に進捗を保存
        if (pageNum % 20 === 0) {
          saveProgress(pageNum, allCompanies);
          console.log(`  [${pageNum}ページ完了] 累計: ${allCompanies.size}件 - 進捗保存`);
        }

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (err) {
        console.log(`  ページ${pageNum}でエラー: ${err.message.substring(0, 50)}`);
        // エラー時は少し待ってリトライ
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log(`\n========================================`);
    console.log(`Step 1完了: ${allCompanies.size}件の会社を発見`);
    console.log(`Step 2: 各会社のURLを取得中...`);
    console.log(`========================================\n`);

    // Step 2: 各会社の詳細ページからURLを取得
    const companies = Array.from(allCompanies.values());
    const results = [];

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];

      if ((i + 1) % 100 === 0 || i === 0) {
        console.log(`[${i + 1}/${companies.length}] 詳細ページ処理中...`);
      }

      try {
        await page.goto(company.url, {
          waitUntil: 'networkidle2',
          timeout: 20000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const info = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          const name = h1 ? h1.textContent.trim() : '';

          let websiteUrl = '';
          const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]'))
            .filter(a => !a.href.includes('imitsu.jp') &&
                        !a.href.includes('facebook.com') &&
                        !a.href.includes('twitter.com') &&
                        !a.href.includes('instagram.com') &&
                        !a.href.includes('youtube.com') &&
                        !a.href.includes('linkedin.com') &&
                        !a.href.includes('line.me') &&
                        !a.href.includes('wantedly.com') &&
                        !a.href.includes('note.com'));

          if (externalLinks.length > 0) {
            websiteUrl = externalLinks[0].href;
          }

          return { name, websiteUrl };
        });

        results.push({
          会社名: info.name || company.name,
          URL: info.websiteUrl,
          お問合せURL: '',
          送信済み: ''
        });

      } catch (err) {
        results.push({
          会社名: company.name,
          URL: '',
          お問合せURL: '',
          送信済み: ''
        });
      }

      // 定期的に保存
      if ((i + 1) % 200 === 0) {
        saveResults(results);
        console.log(`  ${i + 1}件処理完了、途中保存`);
      }

      // レート制限
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 最終保存
    saveResults(results);
    console.log(`\n完了！${results.length}件を ${OUTPUT_FILE} に保存しました`);

    // 進捗ファイルを削除
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
    }

  } catch (err) {
    console.error('エラー:', err.message);
  }

  await browser.close();
}

function saveProgress(lastPage, companies) {
  const data = {
    lastPage,
    companies: Array.from(companies.values())
  };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data));
}

function saveResults(results) {
  const csv = '会社名,URL,お問合せURL,送信済み\n' + results.map(r =>
    `"${(r.会社名 || '').replace(/"/g, '""')}","${r.URL || ''}","${r.お問合せURL || ''}","${r.送信済み || ''}"`
  ).join('\n');

  fs.writeFileSync(OUTPUT_FILE, csv);
}

// 実行
scrapeImitsu();
