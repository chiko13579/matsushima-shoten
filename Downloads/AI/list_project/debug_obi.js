const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage();
  await page.goto('https://obi-office.com/contact/', { waitUntil: 'networkidle2' });
  
  const formInfo = await page.evaluate(() => {
    const results = [];
    
    // Check all radio buttons with their labels
    const radios = document.querySelectorAll('input[type="radio"]');
    radios.forEach(r => {
      const tr = r.closest('tr');
      const th = tr ? tr.querySelector('th') : null;
      const thText = th ? th.textContent.trim() : 'no th';
      
      results.push({
        name: r.name,
        value: r.value,
        thLabel: thText,
        required: r.required,
        // Check for required class in parents
        hasRequiredParent: (() => {
          let parent = r.parentElement;
          for (let i = 0; i < 6 && parent; i++) {
            if (parent.className && parent.className.toLowerCase().includes('required')) return true;
            parent = parent.parentElement;
          }
          return false;
        })()
      });
    });
    
    return results;
  });
  
  console.log(JSON.stringify(formInfo, null, 2));
  await browser.close();
})();
