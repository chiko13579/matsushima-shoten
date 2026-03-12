const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function debugFieldOrder() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto('https://www.yuigonsyo.biz/contact/', { waitUntil: 'networkidle2' });

  const results = await page.evaluate(() => {
    const results = [];
    const elements = Array.from(document.querySelectorAll('input, textarea, select'));

    elements.forEach((el, index) => {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

      const name = el.name || '';
      const type = el.type || 'text';

      // チェックボックスのみ詳細出力
      if (type === 'checkbox') {
        let label = '';
        if (el.closest('label')) {
          label = el.closest('label').textContent.trim();
        }
        results.push({
          index,
          tag: el.tagName.toLowerCase(),
          type,
          name,
          label: label.substring(0, 20)
        });
      }
    });

    return results;
  });

  console.log('=== チェックボックスの処理順序 ===');
  results.forEach(r => {
    console.log(`[${r.index}] ${r.type} name="${r.name}" label="${r.label}"`);
  });

  await browser.close();
}

debugFieldOrder().catch(console.error);
