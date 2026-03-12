const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.top-zeirishi.net/form/top-zeirishinet/inquiry';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 税理士法人 トップ - 住所フィールド調査`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // すべての住所関連フィールドを探す
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

        // 住所関連を全て取得
        const allText = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${label}`.toLowerCase();
        if (allText.match(/住所|address|都道府県|prefecture|市区町村|city|町村|番地|street|建物|building|ビル|マンション/)) {
          result.push({
            tagName: el.tagName.toLowerCase(),
            type: el.type || 'text',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            label: label,
            value: el.value || '',
            allText: allText,
            // selectの場合はオプションも取得
            options: el.tagName.toLowerCase() === 'select' ? Array.from(el.options).map(opt => opt.text) : []
          });
        }
      });

      return result;
    });

    console.log(`住所関連フィールド (${fields.length}個):\n`);

    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.tagName.toUpperCase()}${field.type ? `[${field.type}]` : ''}`);
      console.log(`   Label: "${field.label}"`);
      console.log(`   Name: ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Placeholder: ${field.placeholder}`);
      console.log(`   Value: "${field.value}"`);
      console.log(`   AllText: "${field.allText}"`);

      if (field.options.length > 0) {
        console.log(`   Options (最初の5個): ${field.options.slice(0, 5).join(', ')}`);
      }

      // 検出パターンチェック
      const isPrefecture = field.allText.match(/都道府県|prefecture|pref/);
      const isCity = field.allText.match(/市区町村|city|区|市|town/);
      const isStreet = field.allText.match(/番地|street|丁目|町|番/);
      const isBuilding = field.allText.match(/建物|building|ビル|マンション|mansion/);
      const isAddress = field.allText.match(/住所|address/) && !field.allText.match(/都道府県|市区町村|番地|建物/);

      console.log(`   判定: ${isPrefecture ? '都道府県 ' : ''}${isCity ? '市区町村 ' : ''}${isStreet ? '番地 ' : ''}${isBuilding ? '建物 ' : ''}${isAddress ? '住所(一般) ' : ''}`);
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
