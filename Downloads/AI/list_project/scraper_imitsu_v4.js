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
    // 会社一覧ページに直接アクセス（リスト形式のURL）
    const listUrl = 'https://imitsu.jp/list/hp-design/';
    console.log(`${listUrl} にアクセス中...`);

    await page.goto(listUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // モーダルがあれば閉じる
    try {
      const closeButton = await page.$('button[class*="close"], .modal-close, [aria-label="close"]');
      if (closeButton) {
        await closeButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {}

    // スクリーンショット
    await page.screenshot({ path: 'imitsu_list.png' });
    console.log('スクリーンショット保存: imitsu_list.png');

    // 現在のURLを確認
    console.log('現在のURL:', page.url());

    // ページ内のすべてのリンクを確認
    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 80) }))
        .filter(a => a.href.includes('/co/') || a.href.includes('/company/'))
        .slice(0, 30);
    });

    console.log('会社ページリンク候補:', allLinks.length, '件');
    if (allLinks.length > 0) {
      console.log('サンプル:', allLinks.slice(0, 5));
    }

    // 会社リンクがない場合、スクロールしてみる
    if (allLinks.length === 0) {
      console.log('スクロールして追加コンテンツを読み込み中...');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 再度確認
      const linksAfterScroll = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 80) }))
          .filter(a => a.href.includes('/co/') || a.href.includes('/company/'))
          .slice(0, 30);
      });
      console.log('スクロール後の会社リンク:', linksAfterScroll.length, '件');
    }

    // 会社詳細ページへのリンクを取得
    const companyLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/co/"]'));
      const uniqueLinks = [];
      const seen = new Set();

      links.forEach(link => {
        const href = link.href;
        if (!seen.has(href)) {
          seen.add(href);
          uniqueLinks.push({
            url: href,
            name: link.textContent.trim() || '名前不明'
          });
        }
      });

      return uniqueLinks;
    });

    console.log(`${companyLinks.length}件の会社リンクを発見`);

    // 詳細ページにアクセス
    const targetLinks = companyLinks.slice(0, limit);

    for (let i = 0; i < targetLinks.length; i++) {
      const link = targetLinks[i];
      console.log(`\n[${i + 1}/${targetLinks.length}] ${link.name.substring(0, 30)} にアクセス中...`);

      try {
        await page.goto(link.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // 会社情報を取得
        const companyInfo = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          const name = h1 ? h1.textContent.trim() : '';

          let websiteUrl = '';

          // 外部リンクを探す
          const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]'))
            .filter(a => !a.href.includes('imitsu.jp') &&
                        !a.href.includes('facebook.com') &&
                        !a.href.includes('twitter.com') &&
                        !a.href.includes('instagram.com') &&
                        !a.href.includes('youtube.com') &&
                        !a.href.includes('linkedin.com') &&
                        !a.href.includes('line.me'));

          if (externalLinks.length > 0) {
            websiteUrl = externalLinks[0].href;
          }

          return { name, websiteUrl };
        });

        results.push({
          会社名: companyInfo.name || link.name,
          URL: companyInfo.websiteUrl,
          imitsuURL: link.url
        });

        console.log(`  会社名: ${companyInfo.name || link.name}`);
        console.log(`  URL: ${companyInfo.websiteUrl || '見つかりませんでした'}`);

      } catch (err) {
        console.log(`  エラー: ${err.message}`);
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
  });

  return results;
}

scrapeImitsu(5);
