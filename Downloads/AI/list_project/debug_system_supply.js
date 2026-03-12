const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.system-supply.net/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const fields = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea, select');
    return Array.from(inputs).map(el => {
      let labelText = '';
      const parent = el.closest('tr, div, p, li, dl, dt, dd');
      if (parent) {
        const label = parent.querySelector('label, th, dt, span.label, .wpcf7-form-control-wrap');
        if (label) labelText = label.textContent.trim().substring(0, 50);
      }
      return {
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        label: labelText,
        placeholder: (el.placeholder || '').substring(0, 30)
      };
    }).filter(f => f.type !== 'hidden' && f.type !== 'submit');
  });
  
  console.log('=== system-supply.net フォームフィールド ===');
  fields.forEach(f => {
    console.log(f.name + ' | type=' + f.type + ' | label="' + f.label + '"');
  });
  
  await browser.close();
})();
