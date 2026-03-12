const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('テスト: https://kayaharajimusyo.com/contact.html\n');
  await page.goto('https://kayaharajimusyo.com/contact.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
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
        label: label.substring(0, 50)
      });
    });

    // 送信ボタンを探す
    const buttons = [];
    document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach(el => {
      buttons.push({
        tag: el.tagName,
        type: el.type || '',
        text: (el.textContent || el.value || '').trim().substring(0, 30)
      });
    });

    return { fields, buttons };
  });

  console.log('=== フィールド構造 ===\n');
  result.fields.forEach((f, i) => {
    console.log(`[${i+1}] name="${f.name}" id="${f.id}" type="${f.type}"`);
    console.log(`    label: "${f.label}"`);
    console.log(`    placeholder: "${f.placeholder}"`);
    console.log('');
  });

  console.log('=== ボタン ===\n');
  result.buttons.forEach((b, i) => {
    console.log(`[${i+1}] ${b.tag} type="${b.type}" text="${b.text}"`);
  });

  console.log('\n⏰ 30秒間確認できます');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
})();
