const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://office-izutsu.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const fields = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea, select');
    return Array.from(inputs).map(el => ({
      tag: el.tagName,
      type: el.type || '',
      name: el.name || '',
      id: el.id || '',
      placeholder: el.placeholder || '',
      label: el.closest('label')?.textContent?.trim().substring(0, 50) || ''
    })).filter(f => f.name && f.type !== 'hidden' && f.type !== 'submit');
  });
  
  console.log('=== フィールド一覧 ===');
  fields.forEach(f => {
    console.log(`${f.tag} | type=${f.type} | name="${f.name}" | id="${f.id}" | label="${f.label}"`);
  });
  
  await browser.close();
})();
