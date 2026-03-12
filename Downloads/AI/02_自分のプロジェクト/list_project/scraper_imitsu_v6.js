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
    console.log('imitsu.jp にアクセス中...');
    await page.goto('https://imitsu.jp/ct-hp-design/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // ページをスクロールして会社リストを読み込む
    console.log('ページをスクロール中...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // 会社リンクを取得
    const companyLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/supplier/"]'));
      const uniqueLinks = [];
      const seen = new Set();

      links.forEach(link => {
        const href = link.href;
        // supplierのIDを抽出して重複チェック
        const match = href.match(/\/supplier\/(\d+)/);
        if (match && !seen.has(match[1])) {
          seen.add(match[1]);
          uniqueLinks.push({
            url: href.split('#')[0], // ハッシュを除去
            name: link.textContent.trim()
          });
        }
      });

      return uniqueLinks;
    });

    console.log(`${companyLinks.length}件の会社を発見`);

    // 詳細ページにアクセス
    const targetLinks = companyLinks.slice(0, limit);

    for (let i = 0; i < targetLinks.length; i++) {
      const company = targetLinks[i];
      console.log(`\n[${i + 1}/${targetLinks.length}] ${company.name} にアクセス中...`);

      try {
        await page.goto(company.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // 会社情報を取得
        const companyInfo = await page.evaluate(() => {
          // 会社名
          const h1 = document.querySelector('h1');
          const name = h1 ? h1.textContent.trim() : '';

          // ホームページURL
          let websiteUrl = '';

          // 1. 「公式サイト」「ホームページ」などのリンクを探す
          const allLinks = Array.from(document.querySelectorAll('a'));
          for (const link of allLinks) {
            const text = link.textContent.toLowerCase();
            const href = link.href;

            if (!href.includes('imitsu.jp') &&
                href.startsWith('http') &&
                (text.includes('公式') ||
                 text.includes('ホームページ') ||
                 text.includes('webサイト') ||
                 text.includes('会社サイト'))) {
              websiteUrl = href;
              break;
            }
          }

          // 2. 基本情報から探す
          if (!websiteUrl) {
            const infoRows = document.querySelectorAll('tr, dl, .info-item');
            infoRows.forEach(row => {
              const text = row.textContent;
              if (text.includes('URL') || text.includes('ホームページ') || text.includes('Webサイト')) {
                const link = row.querySelector('a[href^="http"]');
                if (link && !link.href.includes('imitsu.jp')) {
                  websiteUrl = link.href;
                }
              }
            });
          }

          // 3. 外部リンク（SNS以外）を探す
          if (!websiteUrl) {
            const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]'))
              .filter(a => !a.href.includes('imitsu.jp') &&
                          !a.href.includes('facebook.com') &&
                          !a.href.includes('twitter.com') &&
                          !a.href.includes('instagram.com') &&
                          !a.href.includes('youtube.com') &&
                          !a.href.includes('linkedin.com') &&
                          !a.href.includes('line.me') &&
                          !a.href.includes('wantedly.com'));

            if (externalLinks.length > 0) {
              websiteUrl = externalLinks[0].href;
            }
          }

          return { name, websiteUrl };
        });

        results.push({
          会社名: companyInfo.name || company.name,
          URL: companyInfo.websiteUrl,
          imitsuURL: company.url
        });

        console.log(`  会社名: ${companyInfo.name || company.name}`);
        console.log(`  URL: ${companyInfo.websiteUrl || '見つかりませんでした'}`);

      } catch (err) {
        console.log(`  エラー: ${err.message}`);
        results.push({
          会社名: company.name,
          URL: '',
          imitsuURL: company.url,
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

  // CSVに保存
  if (results.length > 0) {
    const csv = '会社名,URL,imitsuURL\n' + results.map(r =>
      `"${r.会社名}","${r.URL || ''}","${r.imitsuURL}"`
    ).join('\n');
    fs.writeFileSync('imitsu_test_results.csv', csv);
    console.log('結果を imitsu_test_results.csv に保存しました');
  }

  return results;
}

scrapeImitsu(5);
