const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.kobayashi-tax-accountant.com/contact/';

  console.log(`\n📋 税理士 小林誉光事務所 - 2つの名前フィールド調査\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // すべての名前関連フィールドを探す
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

        // 名前、なまえ、name を含むフィールドをすべて取得
        if ((label && (label.includes('名前') || label.includes('なまえ') || label.includes('氏名') || label.includes('お名前'))) ||
            (el.name && (el.name.includes('name') || el.name.includes('名前') || el.name.includes('namae'))) ||
            (el.placeholder && (el.placeholder.includes('名前') || el.placeholder.includes('お名前')))) {

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
    console.log(`名前関連フィールド (${fields.length}個):`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    fields.forEach((field, index) => {
      console.log(`${index + 1}. Label: "${field.label}"`);
      console.log(`   Name: ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Placeholder: ${field.placeholder}`);
      console.log(`   Type: ${field.type}`);
      console.log(`   Value: "${field.value}"`);
      console.log(`   AllText: "${field.allText}"`);

      // 姓名判定
      const isLastName = field.allText.match(/lastname|last_name|name.*head|姓(?!.*名)|苗字|みょうじ|せい/);
      const isFirstName = field.allText.match(/firstname|first_name|name.*body|名(?!.*姓)(?!前)|めい/);
      const isFullName = field.allText.match(/name|名前|氏名|お名前|代表者|担当者/);
      const isKana = field.allText.match(/kana|かな|ふりがな|フリガナ/);

      console.log(`   判定: ${isLastName ? '姓' : ''}${isFirstName ? '名' : ''}${isFullName ? 'フルネーム' : ''}${isKana ? '(かな)' : ''}`);
      console.log('');
    });

    console.log('\n⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
