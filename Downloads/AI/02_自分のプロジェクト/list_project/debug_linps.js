const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://linps.co.jp/contact/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // フォーム要素を全て取得
  const elements = await page.evaluate(() => {
    const els = document.querySelectorAll('input, textarea, select');
    return Array.from(els).map(el => {
      // ラベルを取得
      let label = '';
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) label = labelEl.textContent.trim();
      }
      if (!label && el.closest('label')) {
        label = el.closest('label').textContent.trim();
      }
      // 親要素からラベル取得
      if (!label) {
        let parent = el.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const sibling = parent.previousElementSibling;
          if (sibling && sibling.textContent.length < 50) {
            label = sibling.textContent.trim();
            break;
          }
          parent = parent.parentElement;
        }
      }

      // 位置情報
      const rect = el.getBoundingClientRect();

      return {
        tagName: el.tagName,
        name: el.name,
        type: el.type,
        id: el.id,
        required: el.required,
        placeholder: el.placeholder || '',
        label: label.substring(0, 80),
        y: Math.round(rect.top + window.scrollY),
        visible: rect.width > 0 && rect.height > 0
      };
    });
  });

  console.log('=== 株式会社LINPS フォーム要素一覧 ===\n');
  elements.forEach((el, i) => {
    const visibleMark = el.visible ? '' : ' [非表示]';
    console.log(`[${i}] ${el.tagName} name="${el.name}" type="${el.type}" Y=${el.y}${visibleMark}`);
    if (el.label) {
      console.log(`    Label: ${el.label}`);
    }
    if (el.placeholder) {
      console.log(`    Placeholder: ${el.placeholder}`);
    }
  });

  await browser.close();
})();
