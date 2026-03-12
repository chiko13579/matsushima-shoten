const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.meyco.co.jp/contact/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const elements = await page.evaluate(() => {
    const els = document.querySelectorAll('input[type="text"], textarea');
    return Array.from(els).map(el => {
      let label = '';
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) label = labelEl.textContent.trim();
      }
      if (!label) {
        const parent = el.closest('.mw_wp_form_input, .mwform-input');
        if (parent) {
          const prev = parent.previousElementSibling;
          if (prev) label = prev.textContent.trim();
        }
      }
      if (!label) {
        const wrapper = el.closest('tr, .form-group, div[class*="row"]');
        if (wrapper) {
          const th = wrapper.querySelector('th, label');
          if (th) label = th.textContent.trim();
        }
      }
      return {
        tagName: el.tagName.toLowerCase(),
        name: el.name || '',
        type: el.type || '',
        label: label,
        placeholder: el.placeholder || '',
        visible: el.offsetParent !== null
      };
    });
  });

  console.log('=== meyco株式会社 フォーム詳細 ===\n');
  elements.forEach((el, i) => {
    console.log(`[${i}] ${el.tagName} name="${el.name}" type="${el.type}" visible=${el.visible}`);
    if (el.label) console.log(`    Label: "${el.label}"`);
    console.log(`    Placeholder: "${el.placeholder}"`);
  });

  await browser.close();
})();
