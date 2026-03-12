const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.office-muneoka.com/contact.html', { waitUntil: 'networkidle2' });

  const fields = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea').forEach((el, i) => {
      // ラベル取得
      let label = '';
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) label = labelEl.textContent.trim();
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
        for (let depth = 0; depth < 5 && parent && !label; depth++) {
          let sib = parent.previousElementSibling;
          if (sib) {
            const text = sib.textContent.trim();
            if (text.length > 0 && text.length <= 40) {
              label = text;
              break;
            }
          }
          parent = parent.parentElement;
        }
      }

      const rect = el.getBoundingClientRect();
      results.push({
        index: i,
        name: el.name || '(no name)',
        id: el.id || '(no id)',
        type: el.type,
        placeholder: el.placeholder || '',
        label: label.substring(0, 60),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    });
    return results;
  });

  console.log('=== お名前/フリガナ関連フィールド ===');
  fields.forEach(f => {
    const isNameRelated = f.label.match(/名前|お名前|氏名|姓|名|フリガナ|ふりがな/);
    if (isNameRelated) {
      console.log(`[${f.index}] name="${f.name}" id="${f.id}" type="${f.type}"`);
      console.log(`    label="${f.label}"`);
      console.log(`    位置: x=${f.x}, y=${f.y}, width=${f.width}, height=${f.height}`);
      console.log('');
    }
  });

  console.log('=== 全フィールド ===');
  fields.forEach(f => {
    console.log(`[${f.index}] name="${f.name}" label="${f.label}" x=${f.x} y=${f.y} w=${f.width}`);
  });

  await browser.close();
})();
