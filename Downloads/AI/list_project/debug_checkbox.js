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

  const checkboxes = await page.evaluate(() => {
    const elements = document.querySelectorAll('input[type="checkbox"]');
    const result = [];

    elements.forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

      let label = '';
      if (element.id) {
        const labelElement = document.querySelector(`label[for="${element.id}"]`);
        if (labelElement) label = labelElement.textContent.trim();
      }
      if (!label) {
        const parentLabel = element.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }
      if (!label) {
        const tr = element.closest('tr');
        if (tr) {
          const th = tr.querySelector('th');
          if (th) label = th.textContent.trim();
        }
      }
      if (!label) {
        const dd = element.closest('dd');
        if (dd) {
          const prevDt = dd.previousElementSibling;
          if (prevDt && prevDt.tagName === 'DT') {
            label = prevDt.textContent.trim();
          }
        }
      }

      // fieldset > legendも確認
      let parentLabel = '';
      let hasFieldset = false;
      const fieldset = element.closest('fieldset');
      if (fieldset) {
        hasFieldset = true;
        const legend = fieldset.querySelector('legend');
        if (legend) parentLabel = legend.textContent.trim();
      }

      // 親要素の構造を確認
      let parentStructure = '';
      let current = element.parentElement;
      for (let i = 0; i < 3 && current; i++) {
        parentStructure += current.tagName;
        if (current.className) parentStructure += '.' + current.className;
        if (i < 2 && current.parentElement) parentStructure += ' > ';
        current = current.parentElement;
      }

      const name = (element.name || '').toLowerCase();
      const id = (element.id || '').toLowerCase();
      const value = (element.value || '');

      result.push({
        name,
        id,
        value,
        label,
        parentLabel,
        hasFieldset,
        parentStructure,
        outerHTML: element.outerHTML.substring(0, 200)
      });
    });

    return result;
  });

  console.log('チェックボックス一覧:');
  console.log(JSON.stringify(checkboxes, null, 2));

  await browser.close();
})();
