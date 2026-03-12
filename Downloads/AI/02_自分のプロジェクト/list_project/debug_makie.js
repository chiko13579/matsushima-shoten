const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.makie-office.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const fields = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea, select');
    return Array.from(inputs).map(el => {
      let labelText = '';
      const parent = el.closest('tr, div, p, li, dl, dt, dd');
      if (parent) {
        const label = parent.querySelector('label, th, dt, .label');
        if (label) labelText = label.textContent.trim().substring(0, 40);
      }
      // Also check for placeholder
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
    console.log(`${f.tag} | type="${f.type}" | name="${f.name}" | label="${f.label}" | placeholder="${f.placeholder}"`);
  });
  
  await browser.close();
})();
