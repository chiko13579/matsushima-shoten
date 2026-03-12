const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://tax.yoshidakazuhito.net/contact', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const fields = await page.evaluate(() => {
    const elements = document.querySelectorAll('input, textarea, select');
    const result = [];

    elements.forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit') return;

      let label = '';
      if (element.id) {
        const labelElement = document.querySelector(`label[for="${element.id}"]`);
        if (labelElement) label = labelElement.textContent.trim();
      }
      if (!label) {
        const parentLabel = element.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }

      result.push({
        type: element.type,
        name: element.name,
        id: element.id,
        placeholder: element.placeholder || '',
        label: label,
        tagName: element.tagName.toLowerCase()
      });
    });

    return result;
  });

  console.log(JSON.stringify(fields, null, 2));

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
