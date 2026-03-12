const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.system-supply.net/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
  
  // フォーム周辺のHTML構造を取得
  const html = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) {
      return form.innerHTML.substring(0, 3000);
    }
    return 'フォームが見つかりません';
  });
  
  console.log('=== フォームHTML構造 ===');
  console.log(html);
  
  await browser.close();
})();
