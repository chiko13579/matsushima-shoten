const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('調査中: https://office-hattori.net/contact/\n');
  await page.goto('https://office-hattori.net/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const result = await page.evaluate(() => {
    const fields = [];
    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

      const name = el.name || '';

      // 複数の方法でラベルを取得
      let labelMethods = [];

      // Method 1: label[for]
      if (el.id) {
        const lbl = document.querySelector('label[for="' + el.id + '"]');
        if (lbl) labelMethods.push({ method: 'label[for]', text: lbl.textContent.trim() });
      }

      // Method 2: closest label
      const parentLabel = el.closest('label');
      if (parentLabel) labelMethods.push({ method: 'closest label', text: parentLabel.textContent.trim() });

      // Method 3: DL/DT/DD
      const dd = el.closest('dd');
      if (dd) {
        let sibling = dd.previousElementSibling;
        while (sibling && sibling.tagName !== 'DT') {
          sibling = sibling.previousElementSibling;
        }
        if (sibling && sibling.tagName === 'DT') {
          labelMethods.push({ method: 'DT sibling', text: sibling.textContent.trim() });
        }
      }

      // Method 4: TR/TH
      const tr = el.closest('tr');
      if (tr) {
        const th = tr.querySelector('th');
        if (th) labelMethods.push({ method: 'TH in TR', text: th.textContent.trim() });
      }

      // Method 5: Parent text
      let parent = el.parentElement;
      for (let i = 0; i < 3 && parent; i++) {
        const text = parent.textContent.trim().substring(0, 100);
        if (text.length > 0 && text.length < 100) {
          labelMethods.push({ method: `parent[${i}]`, text: text.substring(0, 50) });
          break;
        }
        parent = parent.parentElement;
      }

      fields.push({
        name: name,
        labelMethods: labelMethods
      });
    });
    return fields;
  });

  console.log('=== ラベル検出方法の比較 ===\n');
  result.forEach((f, i) => {
    console.log(`[${i+1}] name="${f.name}"`);
    f.labelMethods.forEach(lm => {
      console.log(`    ${lm.method}: "${lm.text}"`);
    });
    console.log('');
  });

  await browser.close();
})();
