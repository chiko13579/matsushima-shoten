const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeImitsuWebMarketing() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const results = [];
  const baseUrl = 'https://imitsu.jp/ct-hp-design/bu-web-marketing/';
  const outputFile = 'Webマーケティング会社リスト_imitsu.csv';

  // 既存の結果を読み込む（再開用）
  let existingUrls = new Set();
  if (fs.existsSync(outputFile)) {
    const existing = fs.readFileSync(outputFile, 'utf-8');
    const lines = existing.split('\n').slice(1); // ヘッダーをスキップ
    lines.forEach(line => {
      const match = line.match(/"([^"]*)"$/);
      if (match) {
        existingUrls.add(match[1]);
      }
    });
    console.log(`既存の結果: ${existingUrls.size}件`);
  }

  try {
    // 全ページから会社リンクを収集
    let allCompanyLinks = [];
    let allSeenIds = new Set();
    let pageNum = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const pageUrl = pageNum === 1 ? baseUrl : `${baseUrl}?page=${pageNum}`;
      console.log(`\nページ ${pageNum} にアクセス中... ${pageUrl}`);

      await page.goto(pageUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // ページをスクロールして全ての会社を読み込む
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 会社リンクを取得
      const companyLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/supplier/"]'));
        const uniqueLinks = [];
        const seen = new Set();

        links.forEach(link => {
          const href = link.href;
          const match = href.match(/\/supplier\/(\d+)/);
          if (match && !seen.has(match[1])) {
            seen.add(match[1]);
            uniqueLinks.push({
              url: href.split('#')[0],
              name: link.textContent.trim().replace(/\n/g, ' ').substring(0, 100),
              supplierId: match[1]
            });
          }
        });

        return uniqueLinks;
      });

      console.log(`  ${companyLinks.length}件の会社を発見`);

      // allSeenIdsを使ってページ間の重複を除去
      companyLinks.forEach(company => {
        if (!allSeenIds.has(company.supplierId)) {
          allSeenIds.add(company.supplierId);
          allCompanyLinks.push(company);
        }
      });

      // 20件ずつ表示なので、570件÷20 = 29ページ
      // 会社が見つからなければ終了
      if (companyLinks.length === 0) {
        hasNextPage = false;
      } else if (pageNum >= 30) {
        hasNextPage = false;
      } else {
        pageNum++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n合計: ${allCompanyLinks.length}件のユニークな会社を発見`);

    const uniqueCompanies = allCompanyLinks;

    // 既にスクレイピング済みの会社をスキップ
    const toScrape = uniqueCompanies.filter(c => !existingUrls.has(c.url));
    console.log(`新規スクレイピング対象: ${toScrape.length}件`);

    // 各会社の詳細ページからホームページURLを取得
    for (let i = 0; i < toScrape.length; i++) {
      const company = toScrape[i];
      console.log(`\n[${i + 1}/${toScrape.length}] ${company.name.substring(0, 30)}... にアクセス中...`);

      try {
        await page.goto(company.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 1500));

        // 会社情報を取得
        const companyInfo = await page.evaluate(() => {
          // 会社名
          const h1 = document.querySelector('h1');
          const name = h1 ? h1.textContent.trim() : '';

          // ホームページURL
          let websiteUrl = '';

          // 1. 外部リンクボタンを探す
          const externalBtns = document.querySelectorAll('a[target="_blank"]');
          for (const btn of externalBtns) {
            const href = btn.href;
            if (href &&
                !href.includes('imitsu.jp') &&
                !href.includes('facebook.com') &&
                !href.includes('twitter.com') &&
                !href.includes('instagram.com') &&
                !href.includes('youtube.com') &&
                !href.includes('linkedin.com') &&
                !href.includes('line.me') &&
                !href.includes('wantedly.com') &&
                !href.includes('google.com') &&
                href.startsWith('http')) {
              websiteUrl = href;
              break;
            }
          }

          // 2. 「公式サイト」「ホームページ」などのリンクを探す
          if (!websiteUrl) {
            const allLinks = Array.from(document.querySelectorAll('a'));
            for (const link of allLinks) {
              const text = link.textContent.toLowerCase();
              const href = link.href;

              if (href &&
                  !href.includes('imitsu.jp') &&
                  href.startsWith('http') &&
                  (text.includes('公式') ||
                   text.includes('ホームページ') ||
                   text.includes('webサイト') ||
                   text.includes('会社サイト') ||
                   text.includes('サイトを見る'))) {
                websiteUrl = href;
                break;
              }
            }
          }

          // 3. 基本情報テーブルから探す
          if (!websiteUrl) {
            const infoRows = document.querySelectorAll('tr, dl, dt, dd, .info-item, th, td');
            for (const row of infoRows) {
              const text = row.textContent;
              if (text.includes('URL') || text.includes('ホームページ') || text.includes('Webサイト') || text.includes('公式サイト')) {
                const link = row.querySelector('a[href^="http"]');
                if (link && !link.href.includes('imitsu.jp')) {
                  websiteUrl = link.href;
                  break;
                }
              }
            }
          }

          return { name, websiteUrl };
        });

        results.push({
          会社名: companyInfo.name || company.name,
          URL: companyInfo.websiteUrl,
          imitsuURL: company.url
        });

        console.log(`  ✓ ${companyInfo.name || company.name}`);
        console.log(`    URL: ${companyInfo.websiteUrl || '見つかりませんでした'}`);

        // 10件ごとに中間保存
        if (results.length % 10 === 0) {
          saveResults(results, outputFile, existingUrls.size > 0);
          console.log(`\n--- ${results.length}件を保存 ---\n`);
        }

      } catch (err) {
        console.log(`  ✗ エラー: ${err.message}`);
        results.push({
          会社名: company.name,
          URL: '',
          imitsuURL: company.url,
          エラー: err.message
        });
      }

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    }

  } catch (err) {
    console.error('エラー:', err.message);
  }

  await browser.close();

  // 最終保存
  saveResults(results, outputFile, existingUrls.size > 0);

  console.log('\n========== 完了 ==========');
  console.log(`取得件数: ${results.length}件`);
  console.log(`URL取得成功: ${results.filter(r => r.URL).length}件`);
  console.log(`結果を ${outputFile} に保存しました`);

  return results;
}

function saveResults(results, outputFile, append = false) {
  if (results.length === 0) return;

  const csv = results.map(r =>
    `"${(r.会社名 || '').replace(/"/g, '""')}","${r.URL || ''}","${r.imitsuURL}"`
  ).join('\n');

  if (append && fs.existsSync(outputFile)) {
    fs.appendFileSync(outputFile, '\n' + csv);
  } else {
    const header = '会社名,URL,imitsuURL\n';
    fs.writeFileSync(outputFile, header + csv);
  }
}

scrapeImitsuWebMarketing();
