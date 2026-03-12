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
    // メインページにアクセス
    console.log('imitsu.jp にアクセス中...');
    await page.goto('https://imitsu.jp/ct-hp-design/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 「発注先を探す」メニューをクリック
    console.log('「発注先を探す」メニューを探しています...');

    // メニューをホバー/クリック
    const menuButton = await page.$('text=発注先を探す');
    if (menuButton) {
      await menuButton.hover();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // スクリーンショット
    await page.screenshot({ path: 'imitsu_menu.png' });

    // ページをスクロールして会社リストを探す
    console.log('ページをスクロール中...');
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await page.screenshot({ path: 'imitsu_scrolled.png' });
    console.log('スクリーンショット保存: imitsu_scrolled.png');

    // すべてのリンクを確認
    const pageContent = await page.evaluate(() => {
      // 会社関連のリンクを探す
      const links = Array.from(document.querySelectorAll('a'));
      const companyLinks = links.filter(a => {
        const href = a.href || '';
        return href.includes('/co/') ||
               href.includes('/company/') ||
               href.includes('会社') ||
               a.textContent.includes('株式会社');
      }).map(a => ({
        href: a.href,
        text: a.textContent.trim().substring(0, 100)
      }));

      // ページ内のテキストで「会社」を含むセクションを探す
      const sections = Array.from(document.querySelectorAll('section, div, article'))
        .filter(el => el.textContent.includes('株式会社'))
        .slice(0, 5)
        .map(el => el.textContent.substring(0, 200));

      return { companyLinks, sections };
    });

    console.log('会社リンク:', pageContent.companyLinks.length, '件');
    if (pageContent.companyLinks.length > 0) {
      console.log('サンプル:', pageContent.companyLinks.slice(0, 3));
    }

    console.log('会社名を含むセクション:', pageContent.sections.length, '件');

    // 「制作事例を見る」タブを試す
    console.log('\n「制作事例を見る」タブを探しています...');
    const caseTab = await page.$('text=制作事例を見る');
    if (caseTab) {
      await caseTab.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      await page.screenshot({ path: 'imitsu_cases.png' });
      console.log('スクリーンショット保存: imitsu_cases.png');
    }

    // 別のURL構造を試す
    console.log('\n会社一覧ページを直接試行...');
    const testUrls = [
      'https://imitsu.jp/ct-hp-design/companies/',
      'https://imitsu.jp/companies/hp-design/',
      'https://imitsu.jp/ct-hp-design/list/',
      'https://imitsu.jp/sr/hp-design/',
    ];

    for (const url of testUrls) {
      console.log(`  試行: ${url}`);
      try {
        const response = await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 10000
        });
        if (response && response.status() === 200) {
          const currentUrl = page.url();
          console.log(`    -> ${currentUrl}`);
          if (!currentUrl.includes('ct-hp-design')) {
            await page.screenshot({ path: `imitsu_test_${testUrls.indexOf(url)}.png` });

            // 会社リンクを確認
            const links = await page.evaluate(() => {
              return Array.from(document.querySelectorAll('a[href*="/co/"]'))
                .map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 50) }))
                .slice(0, 10);
            });
            if (links.length > 0) {
              console.log('    会社リンク発見:', links.length, '件');
              break;
            }
          }
        }
      } catch (e) {
        console.log(`    エラー: ${e.message.substring(0, 50)}`);
      }
    }

  } catch (err) {
    console.error('エラー:', err.message);
  }

  await browser.close();
  return results;
}

scrapeImitsu(5);
