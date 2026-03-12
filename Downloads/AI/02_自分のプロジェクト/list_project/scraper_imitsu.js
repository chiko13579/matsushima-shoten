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
    console.log('imitsu.jpにアクセス中...');
    await page.goto('https://imitsu.jp/ct-hp-design/search/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // ページの読み込みを待つ
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 会社一覧を取得
    const companies = await page.evaluate(() => {
      const items = document.querySelectorAll('.company-card, .search-result-item, [class*="company"], [class*="result"]');
      const data = [];

      items.forEach(item => {
        const nameEl = item.querySelector('h2, h3, .company-name, [class*="name"]');
        const linkEl = item.querySelector('a[href*="/company/"], a[href*="/co/"]');

        if (nameEl && linkEl) {
          data.push({
            name: nameEl.textContent.trim(),
            detailUrl: linkEl.href
          });
        }
      });

      return data;
    });

    console.log(`${companies.length}件の会社を発見`);

    // 上限数まで詳細ページにアクセス
    const targetCompanies = companies.slice(0, limit);

    for (let i = 0; i < targetCompanies.length; i++) {
      const company = targetCompanies[i];
      console.log(`\n[${i + 1}/${targetCompanies.length}] ${company.name} の詳細ページにアクセス中...`);

      try {
        await page.goto(company.detailUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // 会社のホームページURLを取得
        const companyInfo = await page.evaluate(() => {
          // 会社名
          const nameEl = document.querySelector('h1, .company-name, [class*="company-name"]');
          const name = nameEl ? nameEl.textContent.trim() : '';

          // ホームページURL（外部リンク）
          const links = Array.from(document.querySelectorAll('a[href]'));
          let websiteUrl = '';

          for (const link of links) {
            const href = link.href;
            const text = link.textContent.toLowerCase();

            // imitsu.jp以外のURLで、ホームページっぽいものを探す
            if (!href.includes('imitsu.jp') &&
                !href.includes('javascript') &&
                !href.includes('mailto:') &&
                !href.includes('tel:') &&
                (href.startsWith('http://') || href.startsWith('https://')) &&
                (text.includes('ホームページ') ||
                 text.includes('公式サイト') ||
                 text.includes('会社サイト') ||
                 text.includes('webサイト') ||
                 text.includes('website') ||
                 link.closest('[class*="website"]') ||
                 link.closest('[class*="homepage"]'))) {
              websiteUrl = href;
              break;
            }
          }

          // 見つからない場合は、基本情報セクションから探す
          if (!websiteUrl) {
            const infoSection = document.querySelector('.basic-info, .company-info, [class*="info"]');
            if (infoSection) {
              const externalLinks = infoSection.querySelectorAll('a[href^="http"]');
              for (const link of externalLinks) {
                if (!link.href.includes('imitsu.jp')) {
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
          imitsuURL: company.detailUrl
        });

        console.log(`  会社名: ${companyInfo.name || company.name}`);
        console.log(`  URL: ${companyInfo.websiteUrl || '見つかりませんでした'}`);

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

  console.log('\n--- 結果 ---');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

// テスト実行（5件）
scrapeImitsu(5);
