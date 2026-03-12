const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://asiasupport.biz/contact/', { waitUntil: 'networkidle2' });

  const checkboxes = await page.evaluate(() => {
    const results = [];

    // input[type=checkbox]を探す
    document.querySelectorAll('input[type="checkbox"]').forEach((el, i) => {
      const label = el.closest('label')?.textContent?.trim() ||
                   document.querySelector('label[for="' + el.id + '"]')?.textContent?.trim() || '';
      results.push({
        index: i,
        type: 'checkbox',
        name: el.name || '(no name)',
        id: el.id || '(no id)',
        label: label.substring(0, 80),
        visible: el.offsetParent !== null,
        disabled: el.disabled,
        checked: el.checked,
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        opacity: window.getComputedStyle(el).opacity,
        width: el.offsetWidth,
        height: el.offsetHeight
      });
    });

    return results;
  });

  console.log('=== チェックボックス ===');
  checkboxes.forEach(cb => {
    console.log('---');
    console.log('name:', cb.name);
    console.log('id:', cb.id);
    console.log('label:', cb.label);
    console.log('visible:', cb.visible, '| disabled:', cb.disabled, '| checked:', cb.checked);
    console.log('display:', cb.display, '| visibility:', cb.visibility, '| opacity:', cb.opacity);
    console.log('size:', cb.width, 'x', cb.height);
  });

  // 送信ボタンも確認
  const buttons = await page.evaluate(() => {
    const btns = [];
    document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach((el, i) => {
      btns.push({
        tag: el.tagName,
        type: el.type,
        text: el.textContent?.trim() || el.value || '',
        visible: el.offsetParent !== null,
        disabled: el.disabled
      });
    });
    return btns;
  });

  console.log('\n=== ボタン ===');
  buttons.forEach(b => {
    console.log(b.tag, '| type:', b.type, '| text:', b.text, '| visible:', b.visible, '| disabled:', b.disabled);
  });

  await browser.close();
})();
