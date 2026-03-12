const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('調査中: https://www.irohagyosei.jp/contact/\n');
  await page.goto('https://www.irohagyosei.jp/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const result = await page.evaluate(() => {
    const fields = [];
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

      // 対応するラベル要素を探す
      let labelElement = null;
      if (element.id) {
        labelElement = document.querySelector('label[for="' + element.id + '"]');
      }
      if (!labelElement) {
        labelElement = element.closest('label');
      }

      // ラベルのHTML構造を確認
      let labelHTML = '';
      let labelOuterHTML = '';
      if (labelElement) {
        labelHTML = labelElement.innerHTML.substring(0, 200);
        labelOuterHTML = labelElement.outerHTML.substring(0, 300);
      }

      // 親要素も確認（*マークを探す）
      let parentWithAsterisk = '';
      let parent = element.parentElement;
      for (let i = 0; i < 3 && parent; i++) {
        const html = parent.innerHTML;
        if (html.includes('*') && html.length < 500) {
          parentWithAsterisk = html.substring(0, 200);
          break;
        }
        parent = parent.parentElement;
      }

      fields.push({
        name: element.name || '',
        type: element.type,
        labelHTML: labelHTML,
        labelOuterHTML: labelOuterHTML,
        parentWithAsterisk: parentWithAsterisk
      });
    });

    return fields;
  });

  console.log('=== フォーム構造詳細 ===\n');
  result.forEach((f, i) => {
    console.log(`[${i+1}] ${f.type} name="${f.name}"`);
    console.log(`    labelHTML: "${f.labelHTML}"`);
    if (f.parentWithAsterisk) {
      console.log(`    親要素(*あり): "${f.parentWithAsterisk}"`);
    }
    console.log('');
  });

  await browser.close();
})();
