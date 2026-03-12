const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage();
  await page.goto('https://gyousei-maruyama-office.com/contact/', { waitUntil: 'networkidle2' });
  
  const formInfo = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
    const results = [];
    
    inputs.forEach(i => {
      const tr = i.closest('tr');
      const th = tr ? tr.querySelector('th') : null;
      const label = i.closest('label')?.textContent || 
                    document.querySelector(`label[for="${i.id}"]`)?.textContent || 
                    th?.textContent || '';
      results.push({
        tag: i.tagName,
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder,
        label: label.replace(/\s+/g, ' ').trim().substring(0, 40)
      });
    });
    
    return results;
  });
  
  console.log(JSON.stringify(formInfo, null, 2));
  await browser.close();
})();
