const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.miraikaikei.or.jp/contact/';

  console.log(`\n📋 みらい会計税理士法人のフルHTML構造調査\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フォーム全体のHTMLを取得
    const formInfo = await page.evaluate(() => {
      const result = {};

      const name1 = document.getElementById('name1');
      const name2 = document.getElementById('name2');

      if (name1) {
        // 最も近いtr要素を探す
        let tr = name1.closest('tr');
        if (tr) {
          // tr内のth要素を探す
          const th = tr.querySelector('th');
          result.name1Label = th ? th.textContent.trim() : 'th not found';
          result.name1HTML = tr.outerHTML.substring(0, 1000);
        } else {
          // trがない場合、前の兄弟要素を探す
          let current = name1.parentElement;
          let level = 0;
          while (current && level < 10) {
            const prevSibling = current.previousElementSibling;
            if (prevSibling) {
              result.name1Label = prevSibling.textContent.trim().substring(0, 200);
              result.name1HTML = current.outerHTML.substring(0, 1000);
              break;
            }
            current = current.parentElement;
            level++;
          }
        }
      }

      if (name2) {
        // 最も近いtr要素を探す
        let tr = name2.closest('tr');
        if (tr) {
          // tr内のth要素を探す
          const th = tr.querySelector('th');
          result.name2Label = th ? th.textContent.trim() : 'th not found';
          result.name2HTML = tr.outerHTML.substring(0, 1000);
        } else {
          // trがない場合、前の兄弟要素を探す
          let current = name2.parentElement;
          let level = 0;
          while (current && level < 10) {
            const prevSibling = current.previousElementSibling;
            if (prevSibling) {
              result.name2Label = prevSibling.textContent.trim().substring(0, 200);
              result.name2HTML = current.outerHTML.substring(0, 1000);
              break;
            }
            current = current.parentElement;
            level++;
          }
        }
      }

      return result;
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`name1 フィールド:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`ラベル: "${formInfo.name1Label}"\n`);
    console.log(`HTML:\n${formInfo.name1HTML}\n`);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`name2 フィールド:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`ラベル: "${formInfo.name2Label}"\n`);
    console.log(`HTML:\n${formInfo.name2HTML}\n`);

    // ラベルに基づいて判定
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`判定結果:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const name1IsCompany = formInfo.name1Label && formInfo.name1Label.match(/法人|事業|会社|屋号/);
    const name2IsPerson = formInfo.name2Label && formInfo.name2Label.match(/担当|氏名|お名前|代表/);

    console.log(`name1: ${name1IsCompany ? '✅ 会社名フィールド' : '❌ 個人名フィールド'}`);
    console.log(`name2: ${name2IsPerson ? '✅ 個人名フィールド' : '❌ 会社名フィールド'}\n`);

    console.log('\n⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
