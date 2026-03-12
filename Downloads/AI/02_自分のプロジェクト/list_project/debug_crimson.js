const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('テスト中: https://www.crimson-sapporo.com/contact\n');
  await page.goto('https://www.crimson-sapporo.com/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    const fields = [];
    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

      let label = '';
      if (el.id) {
        const lbl = document.querySelector('label[for="' + el.id + '"]');
        if (lbl) label = lbl.textContent.trim();
      }
      if (!label) {
        const parent = el.closest('label');
        if (parent) label = parent.textContent.trim();
      }

      const type = el.type;
      const labelText = label.toLowerCase();

      // 修正後の判定ロジック
      let detected = 'unknown';
      if (type !== 'radio' && type !== 'checkbox' &&
          (el.tagName === 'TEXTAREA' || labelText.match(/問.*合|相談|詳細|内容/))) {
        detected = 'message ✅';
      } else if (type === 'radio') {
        detected = 'radio (スキップ)';
      } else if (type === 'checkbox') {
        detected = 'checkbox (スキップ)';
      } else if (labelText.match(/法人|会社|社名/)) {
        detected = 'company';
      } else if (labelText.match(/名前|氏名/)) {
        detected = 'fullName';
      } else if (labelText.match(/ふりがな|フリガナ/)) {
        detected = 'fullNameKana';
      } else if (labelText.match(/メール|mail/i)) {
        detected = 'email';
      } else if (labelText.match(/電話|tel/i)) {
        detected = 'tel';
      }

      fields.push({
        tagName: el.tagName,
        type: type,
        label: label.substring(0, 45),
        detected: detected
      });
    });
    return fields;
  });

  console.log('=== フィールド検出（修正後） ===\n');
  result.forEach((f, i) => {
    console.log('[' + (i+1) + '] ' + f.tagName + ' type=' + f.type);
    console.log('    label: "' + f.label + '"');
    console.log('    → 判定: ' + f.detected);
    console.log('');
  });

  await browser.close();
})();
