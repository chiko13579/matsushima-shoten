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
      const id = el.id || '';
      const placeholder = el.placeholder || '';

      // ラベル取得
      let label = '';
      if (el.id) {
        const lbl = document.querySelector('label[for="' + el.id + '"]');
        if (lbl) label = lbl.textContent.trim();
      }
      if (!label) {
        const parent = el.closest('label');
        if (parent) label = parent.textContent.trim();
      }
      // テーブル/DL構造
      if (!label) {
        const tr = el.closest('tr');
        if (tr) {
          const th = tr.querySelector('th');
          if (th) label = th.textContent.trim();
        }
      }
      if (!label) {
        const dd = el.closest('dd');
        if (dd && dd.previousElementSibling && dd.previousElementSibling.tagName === 'DT') {
          label = dd.previousElementSibling.textContent.trim();
        }
      }

      // フリガナ検出テスト
      const labelText = label.toLowerCase();
      let detected = 'unknown';

      if (labelText.match(/ふりがな|フリガナ/)) {
        detected = '✅ fullNameKana';
      } else if (labelText.match(/名前|氏名/)) {
        detected = 'fullName';
      } else if (labelText.match(/会社|法人/)) {
        detected = 'company';
      } else if (labelText.match(/メール/)) {
        detected = 'email';
      } else if (labelText.match(/電話/)) {
        detected = 'tel';
      }

      fields.push({
        name: name,
        id: id,
        label: label.substring(0, 50),
        labelText: labelText.substring(0, 50),
        detected: detected
      });
    });
    return fields;
  });

  console.log('=== フィールド構造 ===\n');
  result.forEach((f, i) => {
    console.log(`[${i+1}] name="${f.name}" id="${f.id}"`);
    console.log(`    label: "${f.label}"`);
    console.log(`    labelText: "${f.labelText}"`);
    console.log(`    → 検出: ${f.detected}`);
    console.log('');
  });

  await browser.close();
})();
