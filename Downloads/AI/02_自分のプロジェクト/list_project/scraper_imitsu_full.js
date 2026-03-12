const puppeteer = require('puppeteer');
const fs = require('fs');

// 都道府県リスト
const prefectures = [
  'hokkaido', 'aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima',
  'ibaraki', 'tochigi', 'gumma', 'saitama', 'chiba', 'tokyo', 'kanagawa',
  'niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano',
  'gifu', 'shizuoka', 'aichi', 'mie',
  'shiga', 'kyoto', 'osaka', 'hyogo', 'nara', 'wakayama',
  'tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi',
  'tokushima', 'kagawa', 'ehime', 'kochi',
  'fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa'
];

async function scrapeImitsu() {
  const browser = await puppeteer.launch({
    headless: true,  // 画面表示なし
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const allCompanies = new Map(); // URLをキーにして重複を防ぐ
  const results = [];

  try {
    for (let p = 0; p < prefectures.length; p++) {
      const pref = prefectures[p];
      const url = `https://imitsu.jp/ct-hp-design/pr-${pref}/`;

      console.log(`\n[${p + 1}/${prefectures.length}] ${pref} を処理中...`);

      try {
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // ページをスクロールして全ての会社を読み込む
        let previousHeight = 0;
        let scrollAttempts = 0;
        const maxScrollAttempts = 30;

        while (scrollAttempts < maxScrollAttempts) {
          await page.evaluate(() => window.scrollBy(0, 800));
          await new Promise(resolve => setTimeout(resolve, 500));

          const currentHeight = await page.evaluate(() => document.body.scrollHeight);
          if (currentHeight === previousHeight) {
            scrollAttempts++;
            if (scrollAttempts >= 3) break; // 3回連続で高さが変わらなければ終了
          } else {
            scrollAttempts = 0;
          }
          previousHeight = currentHeight;
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
                supplierId: match[1],
                url: href.split('#')[0],
                name: link.textContent.trim()
              });
            }
          });

          return uniqueLinks;
        });

        console.log(`  ${companyLinks.length}件の会社を発見`);

        // 新規の会社のみ追加
        let newCount = 0;
        for (const company of companyLinks) {
          if (!allCompanies.has(company.supplierId)) {
            allCompanies.set(company.supplierId, company);
            newCount++;
          }
        }
        console.log(`  新規: ${newCount}件 (累計: ${allCompanies.size}件)`);

      } catch (err) {
        console.log(`  エラー: ${err.message}`);
      }
    }

    console.log(`\n========================================`);
    console.log(`合計 ${allCompanies.size}件の会社を発見`);
    console.log(`各会社の詳細ページからURLを取得中...`);
    console.log(`========================================\n`);

    // 各会社の詳細ページにアクセスしてURLを取得
    const companies = Array.from(allCompanies.values());

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];

      if ((i + 1) % 10 === 0 || i === 0) {
        console.log(`[${i + 1}/${companies.length}] 処理中...`);
      }

      try {
        await page.goto(company.url, {
          waitUntil: 'networkidle2',
          timeout: 20000
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        const companyInfo = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          const name = h1 ? h1.textContent.trim() : '';

          let websiteUrl = '';

          // 外部リンクを探す（SNS以外）
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
          会社名: companyInfo.name || company.name,
          URL: companyInfo.websiteUrl,
          お問合せURL: '',
          送信済み: ''
        });

      } catch (err) {
        // エラーでも会社名は追加
        results.push({
          会社名: company.name,
          URL: '',
          お問合せURL: '',
          送信済み: ''
        });
      }

      // 進捗を定期的に保存
      if ((i + 1) % 50 === 0) {
        saveResults(results);
        console.log(`  ${i + 1}件処理完了、途中保存しました`);
      }
    }

  } catch (err) {
    console.error('エラー:', err.message);
  }

  await browser.close();

  // 最終保存
  saveResults(results);
  console.log(`\n完了！${results.length}件を保存しました`);

  return results;
}

function saveResults(results) {
  const csv = '会社名,URL,お問合せURL,送信済み\n' + results.map(r =>
    `"${(r.会社名 || '').replace(/"/g, '""')}","${r.URL || ''}","${r.お問合せURL || ''}","${r.送信済み || ''}"`
  ).join('\n');

  fs.writeFileSync('imitsu_hp制作会社リスト.csv', csv);
}

// 実行
scrapeImitsu();
