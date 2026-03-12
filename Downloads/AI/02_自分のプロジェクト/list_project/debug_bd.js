const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.bdcorp.co.jp/form/contact/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const elements = await page.evaluate(() => {
    const els = document.querySelectorAll('input, textarea, select');
    return Array.from(els).map(el => {
      let label = '';
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) label = labelEl.textContent.trim();
      }
      if (!label) {
        const parent = el.closest('label, .form-group, .field, tr, li, div');
        if (parent) {
          const textNodes = Array.from(parent.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE || n.tagName === 'LABEL' || n.tagName === 'SPAN')
            .map(n => n.textContent.trim())
            .filter(t => t.length > 0);
          label = textNodes.join(' ').substring(0, 100);
        }
      }
      return {
        tagName: el.tagName.toLowerCase(),
        name: el.name || '',
        type: el.type || '',
        id: el.id || '',
        label: label,
        placeholder: el.placeholder || ''
      };
    });
  });

  console.log('=== 株式会社ビー・アンド・ディー フォーム要素一覧 ===\n');
  elements.forEach((el, i) => {
    console.log(`[${i}] ${el.tagName} name="${el.name}" type="${el.type}"`);
    if (el.label) console.log(`    Label: "${el.label}"`);
    if (el.placeholder) console.log(`    Placeholder: ${el.placeholder}`);
  });

  await browser.close();
})();
