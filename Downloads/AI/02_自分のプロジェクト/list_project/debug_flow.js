const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function debugFlow() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto('https://www.ocean.jpn.com/contact/', { waitUntil: 'networkidle2' });

  const fields = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
    return Array.from(inputs).map((el, i) => {
      let label = '';
      // ラベル取得
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
      // DL/DT/DD構造
      if (!label) {
        const dd = el.closest('dd');
        if (dd) {
          let sibling = dd.previousElementSibling;
          while (sibling && sibling.tagName !== 'DT') {
            sibling = sibling.previousElementSibling;
          }
          if (sibling && sibling.tagName === 'DT') {
            label = sibling.textContent.trim();
          }
        }
      }
      // 親を辿って兄弟要素からラベル取得
      if (!label) {
        let parent = el.parentElement;
        for (let depth = 0; depth < 5 && parent && !label; depth++) {
          let sib = parent.previousElementSibling;
          if (sib) {
            if (['p', 'span', 'div', 'label', 'dt'].includes(sib.tagName.toLowerCase())) {
              if (!sib.querySelector('input, textarea, select')) {
                const text = sib.textContent.trim();
                if (text.length > 0 && text.length <= 25) {
                  label = text;
                  break;
                }
              }
            }
          }
          parent = parent.parentElement;
        }
      }
      return {
        index: i,
        name: el.name || '(no name)',
        id: el.id || '(no id)',
        type: el.type,
        placeholder: el.placeholder || '',
        label: label.substring(0, 50)
      };
    });
  });

  console.log('=== テキスト入力フィールド ===');
  fields.forEach(f => {
    console.log(`[${f.index}] name="${f.name}" id="${f.id}" type="${f.type}" placeholder="${f.placeholder}" label="${f.label}"`);
  });

  await browser.close();
}

debugFlow().catch(console.error);
