const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://curva-web.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

  const fields = await page.evaluate(() => {
    const result = [];
    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (el.type === 'hidden' || el.type === 'submit') return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;

      // 親要素内のlabelを探す
      let parentLabel = '';
      let parent = el.parentElement;
      for (let i = 0; i < 3 && parent; i++) {
        const labelInParent = parent.querySelector('label');
        if (labelInParent && !labelInParent.contains(el)) {
          parentLabel = labelInParent.textContent.trim();
          break;
        }
        parent = parent.parentElement;
      }

      result.push({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        parentLabel: parentLabel.substring(0, 30)
      });
    });
    return result;
  });

  console.log(JSON.stringify(fields, null, 2));
  await browser.close();
})();
