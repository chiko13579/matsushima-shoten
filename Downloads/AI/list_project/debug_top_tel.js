const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.top-zeirishi.net/form/top-zeirishinet/inquiry';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 税理士法人 トップ - 電話番号フィールド調査`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // すべての電話番号関連フィールドを探す
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
        if (!label) {
          const dd = el.closest('dd');
          if (dd) {
            const prevDt = dd.previousElementSibling;
            if (prevDt && prevDt.tagName === 'DT') {
              label = prevDt.textContent.trim();
            }
          }
        }

        // 電話番号関連を全て取得
        const allText = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${label}`.toLowerCase();
        if (allText.match(/tel|phone|電話|携帯/)) {
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

    console.log(`電話番号関連フィールド (${fields.length}個):\n`);

    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.tagName.toUpperCase()}[${field.type}]`);
      console.log(`   Label: "${field.label}"`);
      console.log(`   Name: ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Placeholder: ${field.placeholder}`);
      console.log(`   Value: "${field.value}"`);
      console.log(`   AllText: "${field.allText}"`);

      // 検出パターンチェック
      const isTel1 = field.allText.match(/tel1|phone1|電話1/) || (field.allText.match(/tel|phone|電話/) && field.allText.match(/1|前/));
      const isTel2 = field.allText.match(/tel2|phone2|電話2/) || (field.allText.match(/tel|phone|電話/) && field.allText.match(/2|中/));
      const isTel3 = field.allText.match(/tel3|phone3|電話3/) || (field.allText.match(/tel|phone|電話/) && field.allText.match(/3|後/));
      const isTel = field.type === 'tel' || field.allText.match(/tel|phone|電話|携帯/);

      console.log(`   判定: ${isTel1 ? 'tel1 ' : ''}${isTel2 ? 'tel2 ' : ''}${isTel3 ? 'tel3 ' : ''}${isTel ? 'tel(一般) ' : ''}`);
      console.log('');
    });

    console.log('⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    console.error(error.stack);
  }

  await browser.close();
})();
