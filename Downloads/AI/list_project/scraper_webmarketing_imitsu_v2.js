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
    const lines = existing.split('\n').slice(1);
    lines.forEach(line => {
      const match = line.match(/"([^"]*)"$/);
      if (match) {
        existingUrls.add(match[1]);
      }
    });
    console.log(`既存の結果: ${existingUrls.size}件`);
  }

  try {
    console.log('imitsu.jp にアクセス中...');
    await page.goto(baseUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 全ページから会社リンクを収集（ページネーションをクリックで移動）
    let allCompanyLinks = [];
    let allSeenIds = new Set();
    let pageNum = 1;
    let maxPages = 30; // 570件 ÷ 20件 ≒ 29ページ

    while (pageNum <= maxPages) {
      console.log(`\nページ ${pageNum} を処理中...`);

      // ページをスクロールして全ての会社を読み込む
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await new Promise(resolve => setTimeout(resolve, 300));
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
            // 会社名を取得（リンクテキストまたは親要素から）
            let name = link.textContent.trim().replace(/\n/g, ' ').substring(0, 100);
            if (!name || name.length < 2) {
              const parent = link.closest('div, article, section');
              if (parent) {
                const h3 = parent.querySelector('h3, h2, .company-name');
                if (h3) name = h3.textContent.trim();
              }
            }
            uniqueLinks.push({
              url: href.split('#')[0],
              name: name,
              supplierId: match[1]
            });
          }
        });

        return uniqueLinks;
      });

      console.log(`  ${companyLinks.length}件の会社を発見`);

      // 新規の会社のみ追加
      let newCount = 0;
      companyLinks.forEach(company => {
        if (!allSeenIds.has(company.supplierId)) {
          allSeenIds.add(company.supplierId);
          allCompanyLinks.push(company);
          newCount++;
        }
      });
      console.log(`  新規: ${newCount}件 (累計: ${allCompanyLinks.length}件)`);

      // 新規が0件なら、もうこれ以上ない
      if (newCount === 0 && pageNum > 1) {
        console.log('  新規会社がなくなりました。終了します。');
        break;
      }

      // 次のページへ移動
      pageNum++;
      if (pageNum <= maxPages) {
        // 「次へ」ボタンまたはページ番号をクリック
        const hasNextPage = await page.evaluate((targetPage) => {
          // ページネーションリンクを探す
          const paginationLinks = document.querySelectorAll('a[href*="page="], nav a, .pagination a');
          for (const link of paginationLinks) {
            if (link.href.includes(`page=${targetPage}`) || link.textContent.trim() === String(targetPage)) {
              link.click();
              return true;
            }
          }
          // 「次へ」ボタンを探す
          const nextButtons = document.querySelectorAll('a, button');
          for (const btn of nextButtons) {
            const text = btn.textContent.toLowerCase();
            if (text.includes('次') || text.includes('next') || text.includes('>') || text.includes('›')) {
              btn.click();
              return true;
            }
          }
          return false;
        }, pageNum);

        if (hasNextPage) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          // ページ遷移を待つ
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        } else {
          console.log('  次のページが見つかりません。終了します。');
          break;
        }
      }
    }

    console.log(`\n合計: ${allCompanyLinks.length}件のユニークな会社を発見`);

    // 既にスクレイピング済みの会社をスキップ
    const toScrape = allCompanyLinks.filter(c => !existingUrls.has(c.url));
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
          const h1 = document.querySelector('h1');
          const name = h1 ? h1.textContent.trim() : '';

          let websiteUrl = '';

          // 外部リンクボタンを探す
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

          return { name, websiteUrl };
        });

        results.push({
          会社名: companyInfo.name || company.name,
          URL: companyInfo.websiteUrl,
          imitsuURL: company.url
        });

        console.log(`  ✓ ${companyInfo.name || company.name}`);
        console.log(`    URL: ${companyInfo.websiteUrl || '見つかりませんでした'}`);

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

      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    }

  } catch (err) {
    console.error('エラー:', err.message);
  }

  await browser.close();

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
