const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeImitsu(limit = 5) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const results = [];

  try {
    // 東京の会社一覧ページにアクセス
    const searchUrl = 'https://imitsu.jp/ct-hp-design/pr-tokyo/';
    console.log(`${searchUrl} にアクセス中...`);

    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // スクリーンショット
    await page.screenshot({ path: 'imitsu_tokyo.png' });
    console.log('スクリーンショット保存: imitsu_tokyo.png');

    // 会社カードを取得
    const companies = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"], [class*="item"], article');
      const data = [];

      cards.forEach(card => {
        // 会社詳細ページへのリンク
        const links = card.querySelectorAll('a');
        let detailUrl = '';
        let name = '';

        links.forEach(link => {
          if (link.href.includes('/co/')) {
            detailUrl = link.href;
            // リンクテキストまたは近くのタイトル要素から名前を取得
            const titleEl = card.querySelector('h2, h3, [class*="name"], [class*="title"]');
            name = titleEl ? titleEl.textContent.trim() : link.textContent.trim();
          }
        });

        if (detailUrl && name) {
          data.push({ name, detailUrl });
        }
      });

      // 重複を除去
      const unique = [];
      const seen = new Set();
      data.forEach(item => {
        if (!seen.has(item.detailUrl)) {
          seen.add(item.detailUrl);
          unique.push(item);
        }
      });

      return unique;
    });

    console.log(`${companies.length}件の会社を発見`);

    if (companies.length === 0) {
      // デバッグ: ページ構造を確認
      const pageInfo = await page.evaluate(() => {
        const allLinks = Array.from(document.querySelectorAll('a'))
          .filter(a => a.href.includes('/co/'))
          .map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 50) }));
        return allLinks;
      });
      console.log('会社リンク候補:', pageInfo.slice(0, 10));
    }

    // 詳細ページにアクセス
    const targetCompanies = companies.slice(0, limit);

    for (let i = 0; i < targetCompanies.length; i++) {
      const company = targetCompanies[i];
      console.log(`\n[${i + 1}/${targetCompanies.length}] ${company.name} の詳細ページにアクセス中...`);
      console.log(`  URL: ${company.detailUrl}`);

      try {
        await page.goto(company.detailUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // 会社情報を取得
        const companyInfo = await page.evaluate(() => {
          // 会社名
          const h1 = document.querySelector('h1');
          const name = h1 ? h1.textContent.trim() : '';

          // 会社のWebサイトURLを探す
          let websiteUrl = '';

          // 1. 「Webサイト」「ホームページ」などのラベルの近くにあるリンク
          const allText = document.body.innerText;
          const tables = document.querySelectorAll('table');
          tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
              const cells = row.querySelectorAll('th, td');
              cells.forEach((cell, index) => {
                const cellText = cell.textContent.toLowerCase();
                if (cellText.includes('url') || cellText.includes('webサイト') || cellText.includes('ホームページ')) {
                  const nextCell = cells[index + 1];
                  if (nextCell) {
                    const link = nextCell.querySelector('a');
                    if (link && !link.href.includes('imitsu.jp')) {
                      websiteUrl = link.href;
                    }
                  }
                }
              });
            });
          });

          // 2. dl/dt/dd形式
          if (!websiteUrl) {
            const dts = document.querySelectorAll('dt');
            dts.forEach(dt => {
              const dtText = dt.textContent.toLowerCase();
              if (dtText.includes('url') || dtText.includes('webサイト') || dtText.includes('ホームページ')) {
                const dd = dt.nextElementSibling;
                if (dd && dd.tagName === 'DD') {
                  const link = dd.querySelector('a');
                  if (link && !link.href.includes('imitsu.jp')) {
                    websiteUrl = link.href;
                  }
                }
              }
            });
          }

          // 3. 外部リンクボタン
          if (!websiteUrl) {
            const buttons = document.querySelectorAll('a[target="_blank"]');
            buttons.forEach(btn => {
              if (!btn.href.includes('imitsu.jp') &&
                  !btn.href.includes('facebook') &&
                  !btn.href.includes('twitter') &&
                  btn.href.startsWith('http')) {
                const text = btn.textContent.toLowerCase();
                if (text.includes('サイト') || text.includes('ホームページ') || text.includes('公式')) {
                  websiteUrl = btn.href;
                }
              }
            });
          }

          // 4. 最後の手段: 外部リンクを探す
          if (!websiteUrl) {
            const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]'))
              .filter(a => !a.href.includes('imitsu.jp') &&
                         !a.href.includes('facebook') &&
                         !a.href.includes('twitter') &&
                         !a.href.includes('instagram') &&
                         !a.href.includes('youtube') &&
                         !a.href.includes('linkedin'));

            if (externalLinks.length > 0) {
              websiteUrl = externalLinks[0].href;
            }
          }

          return { name, websiteUrl };
        });

        results.push({
          会社名: companyInfo.name || company.name,
          URL: companyInfo.websiteUrl,
          imitsuURL: company.detailUrl
        });

        console.log(`  会社名: ${companyInfo.name || company.name}`);
        console.log(`  ホームページURL: ${companyInfo.websiteUrl || '見つかりませんでした'}`);

      } catch (err) {
        console.log(`  エラー: ${err.message}`);
        results.push({
          会社名: company.name,
          URL: '',
          imitsuURL: company.detailUrl,
          エラー: err.message
        });
      }
    }

  } catch (err) {
    console.error('エラー:', err.message);
  }

  await browser.close();

  console.log('\n========== 結果 ==========');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.会社名}`);
    console.log(`   URL: ${r.URL || 'N/A'}`);
    console.log(`   imitsu: ${r.imitsuURL}`);
    console.log('');
  });

  return results;
}

scrapeImitsu(5);
