const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.sharoushi-net.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const fields = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea, select');
    return Array.from(inputs).map(el => {
      let labelText = '';
      const parent = el.closest('tr, div, p, li, dl, dt, dd, label');
      if (parent) {
        const label = parent.querySelector('label, th, dt, .label, span');
        if (label) labelText = label.textContent.trim().substring(0, 50);
      }
      // Also try previous sibling or parent text
      if (!labelText && el.previousElementSibling) {
        labelText = el.previousElementSibling.textContent?.trim().substring(0, 50) || '';
      }
      const placeholder = el.placeholder || '';
      return {
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        label: labelText,
        placeholder: placeholder.substring(0, 30)
      };
    }).filter(f => f.name && f.type !== 'hidden' && f.type !== 'submit');
  });
  
  console.log('=== フィールド一覧 ===');
  fields.forEach(f => {
    console.log(`name="${f.name}" | type="${f.type}" | label="${f.label}" | placeholder="${f.placeholder}"`);
  });
  
  await browser.close();
})();
