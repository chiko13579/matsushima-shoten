const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://kitais.jp/contact', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    const els = document.querySelectorAll('input[type="text"]');
    return Array.from(els).map(el => {
      const name = el.name;
      // companyName / yourName の判定テスト
      const isCompanyName = name === 'companyName';
      const isYourName = name === 'yourName';
      return { name, isCompanyName, isYourName };
    });
  });

  console.log('=== フィールド判定テスト ===');
  result.forEach((r, i) => console.log(`[${i}] name="${r.name}" companyName=${r.isCompanyName} yourName=${r.isYourName}`));

  await browser.close();
})();
