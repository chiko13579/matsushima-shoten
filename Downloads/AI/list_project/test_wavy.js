const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('テスト: https://www.wavy-kigyou.com/contact/\n');
  await page.goto('https://www.wavy-kigyou.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // フォーム構造を調査
  const result = await page.evaluate(() => {
    const fields = [];
    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (el.type === 'hidden') return;

      const name = el.name || '';
      const id = el.id || '';
      const type = el.type || el.tagName.toLowerCase();
      const required = el.required || false;
      const isSelect = el.tagName === 'SELECT';

      // selectの場合、optionを取得
      let options = [];
      if (isSelect) {
        Array.from(el.options).slice(0, 5).forEach(opt => {
          options.push({ value: opt.value, text: opt.text.substring(0, 20) });
        });
      }

      // ラベル取得
      let label = '';
      if (el.id) {
        const lbl = document.querySelector('label[for="' + el.id + '"]');
        if (lbl) label = lbl.textContent.trim();
      }
      if (!label) {
        let parent = el.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
          const text = parent.textContent.trim();
          if (text.length > 0 && text.length < 100) {
            label = text.substring(0, 50);
            break;
          }
          parent = parent.parentElement;
        }
      }

      fields.push({
        name: name,
        id: id,
        type: type,
        label: label.substring(0, 40),
        required: required,
        isSelect: isSelect,
        options: options
      });
    });

    return fields;
  });

  console.log('=== フィールド構造 ===\n');
  result.forEach((f, i) => {
    console.log(`[${i+1}] name="${f.name}" type="${f.type}" required=${f.required}`);
    console.log(`    label: "${f.label}"`);
    if (f.isSelect && f.options.length > 0) {
      console.log(`    options: ${JSON.stringify(f.options)}`);
    }
    console.log('');
  });

  console.log('\n⏰ 30秒間確認できます');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
})();
