const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://curva-web.com/contact/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  const fields = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea, select');
    return Array.from(inputs).map(el => {
      let label = '';
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) label = labelEl.textContent.trim();
      }
      if (!label && el.closest('label')) {
        label = el.closest('label').textContent.trim();
      }
      return {
        tagName: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        label: label
      };
    }).filter(f => f.type !== 'hidden' && f.type !== 'submit');
  });

  console.log('Form fields:');
  fields.forEach(f => {
    console.log(`  ${f.tagName} type=${f.type} name="${f.name}" id="${f.id}" label="${f.label}" placeholder="${f.placeholder}"`);
  });

  await browser.close();
})();
