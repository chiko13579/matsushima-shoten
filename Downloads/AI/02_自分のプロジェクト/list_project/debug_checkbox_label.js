const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.top-zeirishi.net/form/top-zeirishinet/inquiry', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await new Promise(r => setTimeout(r, 3000));

  const checkboxInfo = await page.evaluate(() => {
    const elements = document.querySelectorAll('input[type="checkbox"]');
    const result = [];

    elements.forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

      let label = '';

      // label[for]
      if (element.id) {
        const labelElement = document.querySelector(`label[for="${element.id}"]`);
        if (labelElement) label = labelElement.textContent.trim();
      }

      // closest label
      if (!label) {
        const parentLabel = element.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }

      // tr > th（常に取得）
      let thLabel = '';
      const tr = element.closest('tr');
      if (tr) {
        const th = tr.querySelector('th');
        if (th) thLabel = th.textContent.trim();
      }

      // ラベルが空の場合はTHを使用
      if (!label && thLabel) {
        label = thLabel;
      }

      const name = (element.name || '').toLowerCase();
      const id = (element.id || '').toLowerCase();
      const value = (element.value || '');

      // 必須項目の判定
      const isRequired = element.required ||
                        element.hasAttribute('required') ||
                        element.getAttribute('aria-required') === 'true' ||
                        label.includes('*') ||
                        label.includes('＊') ||
                        label.includes('※') ||
                        label.includes('必須') ||
                        label.includes('Required');

      result.push({
        name,
        id,
        value,
        label,
        thLabel,
        isRequired,
        outerHTML: element.outerHTML.substring(0, 200)
      });
    });

    return result;
  });

  console.log('チェックボックス詳細:');
  console.log(JSON.stringify(checkboxInfo, null, 2));

  await browser.close();
})();
