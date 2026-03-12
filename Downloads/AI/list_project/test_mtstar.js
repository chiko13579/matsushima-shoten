const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('テスト: https://mtstar-gs.com/contact/\n');
  await page.goto('https://mtstar-gs.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // フォーム構造を調査
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

      // ラベル取得
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

      fields.push({
        name: name,
        id: id,
        type: type,
        placeholder: placeholder,
        label: label.substring(0, 50),
        required: required,
        isTextarea: isTextarea
      });
    });

    return fields;
  });

  console.log('=== フィールド構造 ===\n');
  result.forEach((f, i) => {
    console.log(`[${i+1}] name="${f.name}" type="${f.type}" required=${f.required}`);
    console.log(`    label: "${f.label}"`);
    console.log(`    isTextarea: ${f.isTextarea}`);
    console.log('');
  });

  console.log('\n⏰ 30秒間確認できます');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
})();
