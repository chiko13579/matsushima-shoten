const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.miraikaikei.or.jp/contact/';

  console.log(`\n📋 みらい会計税理士法人のHTML構造調査\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // name1とname2フィールドのHTML構造を調査
    const fieldHTML = await page.evaluate(() => {
      const result = {};

      const name1 = document.getElementById('name1');
      const name2 = document.getElementById('name2');

      if (name1) {
        // name1の周辺HTML
        let parent = name1.parentElement;
        let html = parent ? parent.outerHTML : '';

        // さらに親要素も確認
        if (parent && parent.parentElement) {
          html = parent.parentElement.outerHTML;
        }

        result.name1 = {
          html: html.substring(0, 500),
          parentText: parent ? parent.textContent.trim().substring(0, 200) : '',
          value: name1.value,
          placeholder: name1.placeholder,
          name: name1.name
        };
      }

      if (name2) {
        // name2の周辺HTML
        let parent = name2.parentElement;
        let html = parent ? parent.outerHTML : '';

        // さらに親要素も確認
        if (parent && parent.parentElement) {
          html = parent.parentElement.outerHTML;
        }

        result.name2 = {
          html: html.substring(0, 500),
          parentText: parent ? parent.textContent.trim().substring(0, 200) : '',
          value: name2.value,
          placeholder: name2.placeholder,
          name: name2.name
        };
      }

      return result;
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`name1 フィールドの HTML構造:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(fieldHTML.name1.html);
    console.log(`\n親要素のテキスト:\n${fieldHTML.name1.parentText}\n`);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`name2 フィールドの HTML構造:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(fieldHTML.name2.html);
    console.log(`\n親要素のテキスト:\n${fieldHTML.name2.parentText}\n`);

    console.log('\n⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
