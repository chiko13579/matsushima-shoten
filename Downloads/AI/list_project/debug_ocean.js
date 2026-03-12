const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('調査中: https://ocean.jpn.com/contact/\n');
  await page.goto('https://ocean.jpn.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    const fields = [];
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

      const name = element.name || '';
      const id = element.id || '';
      const type = element.type;
      const placeholder = element.placeholder || '';

      // ラベル取得（複数の方法）
      let label = '';
      if (element.id) {
        const lbl = document.querySelector('label[for="' + element.id + '"]');
        if (lbl) label = lbl.textContent.trim();
      }
      if (!label) {
        const parent = element.closest('label');
        if (parent) label = parent.textContent.trim();
      }
      // テーブル構造
      if (!label) {
        const tr = element.closest('tr');
        if (tr) {
          const th = tr.querySelector('th');
          if (th) label = th.textContent.trim();
        }
      }
      // div構造
      if (!label) {
        let parent = element.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
          const spans = parent.querySelectorAll('span, div, p');
          for (const span of spans) {
            const text = span.textContent.trim();
            if (text.length > 0 && text.length < 50 && !span.contains(element)) {
              label = text;
              break;
            }
          }
          if (label) break;
          parent = parent.parentElement;
        }
      }

      // 必須チェック
      let isRequired = element.required ||
        element.getAttribute('aria-required') === 'true' ||
        label.includes('必須') ||
        label.includes('*') ||
        label.includes('※');

      fields.push({
        tagName: element.tagName,
        type: type,
        name: name,
        id: id,
        label: label.substring(0, 60),
        placeholder: placeholder,
        required: isRequired
      });
    });
    return fields;
  });

  console.log('=== ocean.jpn.com フォーム構造 ===\n');
  result.forEach((f, i) => {
    console.log(`[${i+1}] <${f.tagName}> type="${f.type}" name="${f.name}" id="${f.id}"`);
    console.log(`    label: "${f.label}"`);
    console.log(`    placeholder: "${f.placeholder}"`);
    console.log(`    必須: ${f.required ? '✅' : '❌'}`);
    console.log('');
  });

  await browser.close();
})();
