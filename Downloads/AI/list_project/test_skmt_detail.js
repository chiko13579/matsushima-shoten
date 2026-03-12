const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://legal-skmt.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    // check[data][] の周辺HTMLを取得
    const checkboxes = document.querySelectorAll('input[name="check[data][]"]');
    const info = [];

    checkboxes.forEach((cb, i) => {
      let parentHTML = '';
      let parent = cb.parentElement;
      for (let j = 0; j < 5 && parent; j++) {
        const tagInfo = `${parent.tagName}.${parent.className}`;
        const hasRequired = parent.className.includes('required') ||
                           parent.className.includes('Required') ||
                           parent.textContent.includes('必須');
        parentHTML += `\n  [${j}] ${tagInfo} hasRequired=${hasRequired}`;
        parent = parent.parentElement;
      }

      info.push({
        index: i,
        name: cb.name,
        required: cb.required,
        parentChain: parentHTML
      });
    });

    // お問合せ項目のセクション全体を探す
    const allElements = document.querySelectorAll('*');
    let sectionHTML = '';
    allElements.forEach(el => {
      if (el.textContent.includes('お問合せ項目') && el.textContent.length < 200) {
        sectionHTML = el.outerHTML.substring(0, 500);
      }
    });

    return { checkboxInfo: info, sectionHTML };
  });

  console.log('=== checkbox[data][] の親要素チェーン ===\n');
  result.checkboxInfo.forEach(cb => {
    console.log(`Checkbox ${cb.index}: required=${cb.required}`);
    console.log(`Parent chain: ${cb.parentChain}\n`);
  });

  console.log('\n=== お問合せ項目セクション ===');
  console.log(result.sectionHTML);

  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
})();
