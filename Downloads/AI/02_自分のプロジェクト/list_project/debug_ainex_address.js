const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://business.form-mailer.jp/fms/4d1a7ba5267478';

  console.log(`\n📋 アイネックス税理士法人 - 住所フィールド調査\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // 住所関連のフィールドを調査
    const fields = await page.evaluate(() => {
      const elements = document.querySelectorAll('input, textarea, select');
      const result = [];

      elements.forEach(el => {
        if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

        let label = '';
        if (el.id) {
          const labelElement = document.querySelector(`label[for="${el.id}"]`);
          if (labelElement) label = labelElement.textContent.trim();
        }
        if (!label) {
          const parentLabel = el.closest('label');
          if (parentLabel) label = parentLabel.textContent.trim();
        }
        if (!label) {
          const tr = el.closest('tr');
          if (tr) {
            const th = tr.querySelector('th');
            if (th) label = th.textContent.trim();
          }
        }

        // 住所、都道府県、市区町村、番地、ビルなどのフィールド
        if ((label && label.match(/住所|都道府県|県|市|区|町|村|番地|ビル|マンション/)) ||
            (el.name && el.name.match(/address|prefecture|city|street|building|mansion/i)) ||
            (el.placeholder && el.placeholder.match(/住所|都道府県|市|区|町|番地|ビル/))) {

          const allText = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${label}`.toLowerCase();

          result.push({
            tagName: el.tagName.toLowerCase(),
            type: el.type || 'text',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            label: label,
            value: el.value || '',
            allText: allText
          });
        }
      });

      return result;
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`住所関連フィールド (${fields.length}個):`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    fields.forEach((field, index) => {
      console.log(`${index + 1}. Label: "${field.label}"`);
      console.log(`   Name: ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Placeholder: ${field.placeholder}`);
      console.log(`   Type: ${field.type} (${field.tagName})`);
      console.log(`   Value: "${field.value}"`);
      console.log(`   AllText: "${field.allText}"`);

      // 検出パターンチェック
      const prefectureMatch = field.allText.match(/prefecture|都道府県/);
      const cityMatch = field.allText.match(/city|市|区|町|村/);
      const addressMatch = field.allText.match(/address|住所|番地/);
      const buildingMatch = field.allText.match(/building|mansion|ビル|マンション/);
      const firstNameMatch = field.allText.match(/firstname|first_name|name.*body|名(?!.*姓)(?!前)/);

      console.log(`   都道府県パターン: ${prefectureMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   市区町村パターン: ${cityMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   住所・番地パターン: ${addressMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   ビル名パターン: ${buildingMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   firstName誤検出: ${firstNameMatch ? '⚠️ YES (問題!)' : '✅ NO'}`);

      console.log('');
    });

    console.log('\n⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
