const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.system-supply.net/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const fields = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea, select');
    return Array.from(inputs).map(el => {
      // 必須チェック
      const isRequired = el.required || el.hasAttribute('aria-required') || 
        el.className.includes('required') || el.closest('.required') !== null;
      
      // 親要素のテキスト全体を取得
      let parentText = '';
      const row = el.closest('tr, div.form-group, dl, p');
      if (row) {
        parentText = row.textContent.trim().substring(0, 80);
      }
      
      // 必須マーク確認
      const hasRequiredMark = parentText.includes('必須') || parentText.includes('*') || parentText.includes('※');
      
      return {
        name: el.name || '',
        type: el.type || '',
        required: isRequired,
        hasRequiredMark: hasRequiredMark,
        parentText: parentText.replace(/\s+/g, ' ')
      };
    }).filter(f => f.name && f.type !== 'hidden' && f.type !== 'submit');
  });
  
  console.log('=== system-supply.net 必須チェック ===');
  fields.forEach(f => {
    console.log(f.name + ' | required=' + f.required + ' | mark=' + f.hasRequiredMark);
    console.log('   → ' + f.parentText);
  });
  
  await browser.close();
})();
