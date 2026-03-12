const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('テスト: https://mylegal.jp/info/contact.html\n');
  await page.goto('https://mylegal.jp/info/contact.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
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

      // ラベル取得（複数方法）
      let label = '';
      let labelMethod = '';

      // Method 1: label[for]
      if (el.id) {
        const lbl = document.querySelector('label[for="' + el.id + '"]');
        if (lbl) {
          label = lbl.textContent.trim();
          labelMethod = 'label[for]';
        }
      }

      // Method 2: closest label
      if (!label) {
        const parent = el.closest('label');
        if (parent) {
          label = parent.textContent.trim();
          labelMethod = 'closest label';
        }
      }

      // Method 3: TR/TH
      if (!label) {
        const tr = el.closest('tr');
        if (tr) {
          const th = tr.querySelector('th');
          if (th) {
            label = th.textContent.trim();
            labelMethod = 'TR/TH';
          }
        }
      }

      // Method 4: DL/DT/DD
      if (!label) {
        const dd = el.closest('dd');
        if (dd && dd.previousElementSibling && dd.previousElementSibling.tagName === 'DT') {
          label = dd.previousElementSibling.textContent.trim();
          labelMethod = 'DL/DT/DD';
        }
      }

      // Method 5: 親要素のテキスト
      if (!label) {
        let parent = el.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
          const text = parent.textContent.trim();
          if (text.length > 0 && text.length < 100) {
            label = text.substring(0, 50);
            labelMethod = `parent[${i}]`;
            break;
          }
          parent = parent.parentElement;
        }
      }

      fields.push({
        name: name,
        id: id,
        type: type,
        placeholder: placeholder,
        label: label.substring(0, 80),
        labelMethod: labelMethod,
        required: required
      });
    });

    return fields;
  });

  console.log('=== フィールド構造 ===\n');
  result.forEach((f, i) => {
    console.log(`[${i+1}] name="${f.name}" id="${f.id}" type="${f.type}"`);
    console.log(`    label: "${f.label}" (via ${f.labelMethod})`);
    console.log(`    required: ${f.required}`);
    console.log('');
  });

  console.log('\n⏰ 30秒間確認できます');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
})();
