const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.y-ao.net/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const fields = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea, select');
    return Array.from(inputs).map(el => {
      // Get parent/sibling label text
      let labelText = '';
      const parent = el.closest('tr, div, p, li');
      if (parent) {
        const th = parent.querySelector('th');
        if (th) labelText = th.textContent.trim().substring(0, 30);
      }
      return {
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        label: labelText
      };
    }).filter(f => f.name && f.type !== 'hidden' && f.type !== 'submit');
  });
  
  console.log('=== フィールド一覧 ===');
  fields.forEach(f => {
    console.log(`${f.tag} | type="${f.type}" | name="${f.name}" | label="${f.label}"`);
  });
  
  await browser.close();
})();
