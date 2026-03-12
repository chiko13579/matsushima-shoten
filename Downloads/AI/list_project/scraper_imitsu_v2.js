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
    await new Promise(resolve => setTimeout(resolve, 5000));

    // デバッグ: ページのHTMLを確認
    const html = await page.content();
    console.log('ページ取得完了');

    // スクリーンショットを撮る
    await page.screenshot({ path: 'imitsu_screenshot.png' });
    console.log('スクリーンショット保存: imitsu_screenshot.png');

    // 会社カードのリンクを取得
    const companyLinks = await page.evaluate(() => {
      // すべてのリンクを取得
      const allLinks = Array.from(document.querySelectorAll('a[href*="/co/"]'));
      const uniqueLinks = [];
      const seen = new Set();

      allLinks.forEach(link => {
        const href = link.href;
        if (!seen.has(href) && href.includes('/co/')) {
          seen.add(href);
          // 親要素からテキストを取得
          const card = link.closest('article, div, li');
          const text = card ? card.textContent.substring(0, 100) : link.textContent;
          uniqueLinks.push({
            url: href,
            text: text.trim().replace(/\s+/g, ' ')
          });
        }
      });

      return uniqueLinks;
    });

    console.log(`${companyLinks.length}件の会社リンクを発見`);

    if (companyLinks.length === 0) {
      // 別のセレクタを試す
      const allLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
          href: a.href,
          text: a.textContent.trim().substring(0, 50)
        })).filter(a => a.href.includes('imitsu'));
      });
      console.log('すべてのimitsuリンク:', allLinks.slice(0, 20));
    }

    // 詳細ページにアクセス
    const targetLinks = companyLinks.slice(0, limit);

    for (let i = 0; i < targetLinks.length; i++) {
      const link = targetLinks[i];
      console.log(`\n[${i + 1}/${targetLinks.length}] ${link.url} にアクセス中...`);

      try {
        await page.goto(link.url, {
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

          // 基本情報テーブルから探す
          const rows = document.querySelectorAll('tr, dl, .info-row');
          rows.forEach(row => {
            const text = row.textContent;
            if (text.includes('URL') || text.includes('ホームページ') || text.includes('Webサイト')) {
              const link = row.querySelector('a[href^="http"]');
              if (link && !link.href.includes('imitsu.jp')) {
                websiteUrl = link.href;
              }
            }
          });

          // テーブルで見つからない場合、外部リンクを探す
          if (!websiteUrl) {
            const externalLinks = document.querySelectorAll('a[href^="http"]');
            for (const link of externalLinks) {
              if (!link.href.includes('imitsu.jp') &&
                  !link.href.includes('facebook') &&
                  !link.href.includes('twitter') &&
                  !link.href.includes('instagram') &&
                  !link.href.includes('youtube')) {
                const parent = link.closest('td, dd, .value');
                if (parent) {
                  websiteUrl = link.href;
                  break;
                }
              }
            }
          }

          return { name, websiteUrl };
        });

        results.push({
          会社名: companyInfo.name,
          URL: companyInfo.websiteUrl,
          imitsuURL: link.url
        });

        console.log(`  会社名: ${companyInfo.name}`);
        console.log(`  URL: ${companyInfo.websiteUrl || '見つかりませんでした'}`);

      } catch (err) {
        console.log(`  エラー: ${err.message}`);
      }
    }

  } catch (err) {
    console.error('エラー:', err.message);
  }

  await browser.close();

  console.log('\n--- 結果 ---');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.会社名}`);
    console.log(`   URL: ${r.URL}`);
  });

  return results;
}

scrapeImitsu(5);
