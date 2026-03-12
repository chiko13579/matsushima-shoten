const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('調査中: https://www.irohagyosei.jp/contact/\n');
  await page.goto('https://www.irohagyosei.jp/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // ページ全体から「必須」の周辺テキストを抽出
  const result = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const requiredElements = [];

    elements.forEach(el => {
      const text = el.textContent || '';
      if (text.includes('必須') && text.length < 200) {
        requiredElements.push({
          tagName: el.tagName,
          className: el.className,
          text: text.substring(0, 150)
        });
      }
    });

    // フォームのラベル構造を詳しく確認
    const formLabels = [];
    const labels = document.querySelectorAll('label, .label, th, dt, .form-label');
    labels.forEach(label => {
      formLabels.push({
        tagName: label.tagName,
        className: label.className,
        text: label.textContent.substring(0, 80),
        hasRequired: label.textContent.includes('必須')
      });
    });

    return { requiredElements: requiredElements.slice(0, 20), formLabels: formLabels.slice(0, 20) };
  });

  console.log('=== 「必須」を含む要素 ===\n');
  result.requiredElements.forEach((el, i) => {
    console.log(`[${i+1}] <${el.tagName}> class="${el.className}"`);
    console.log(`    text: "${el.text}"`);
    console.log('');
  });

  console.log('\n=== フォームラベル ===\n');
  result.formLabels.forEach((el, i) => {
    console.log(`[${i+1}] <${el.tagName}> class="${el.className}"`);
    console.log(`    text: "${el.text}"`);
    console.log(`    必須: ${el.hasRequired ? '✅' : '❌'}`);
    console.log('');
  });

  await browser.close();
})();
