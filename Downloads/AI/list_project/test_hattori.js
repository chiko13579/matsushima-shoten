const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('テスト: https://www.hattori-office.jp/contact\n');
  await page.goto('https://www.hattori-office.jp/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    const fields = [];
    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (el.type === 'hidden') return;

      const name = el.name || '';
      const id = el.id || '';
      const type = el.type || el.tagName.toLowerCase();
      const placeholder = el.placeholder || '';
      const required = el.required || false;
      const isTextarea = el.tagName === 'TEXTAREA';

      let label = '';
      if (el.id) {
        const lbl = document.querySelector('label[for="' + el.id + '"]');
        if (lbl) label = lbl.textContent.trim();
      }
      if (!label) {
        const tr = el.closest('tr');
        if (tr) {
          const th = tr.querySelector('th');
          if (th) label = th.textContent.trim();
        }
      }
      if (!label) {
        let parent = el.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
          const text = parent.textContent.trim();
          if (text.length > 0 && text.length < 50) {
            label = text.substring(0, 40);
            break;
          }
          parent = parent.parentElement;
        }
      }

      fields.push({
        name, id, type, placeholder, label: label.substring(0, 50),
        required, isTextarea,
        has紹介: label.includes('紹介')
      });
    });
    return fields;
  });

  console.log('=== フィールド構造 ===\n');
  result.forEach((f, i) => {
    const mark = f.has紹介 ? '⚠️ 紹介者フィールド（入力しない）' : '';
    console.log(`[${i+1}] name="${f.name}" type="${f.type}" ${mark}`);
    console.log(`    label: "${f.label}"`);
    console.log(`    required: ${f.required}`);
    console.log('');
  });

  console.log('\n⏰ 15秒間確認できます');
  await new Promise(r => setTimeout(r, 15000));
  await browser.close();
})();
