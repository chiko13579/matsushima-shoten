const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Testing: https://trc-tax.com/contact');
  await page.goto('https://trc-tax.com/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    const nameFields = [];
    const elements = document.querySelectorAll('input, textarea');

    elements.forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

      let label = '';
      if (element.id) {
        const labelElement = document.querySelector(`label[for="${element.id}"]`);
        if (labelElement) label = labelElement.textContent.trim();
      }
      if (!label) {
        const parentLabel = element.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }
      if (!label) {
        let parent = element.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const firstChild = parent.firstElementChild;
          if (firstChild && !['INPUT', 'SELECT', 'TEXTAREA'].includes(firstChild.tagName)) {
            const text = firstChild.textContent.trim();
            if (text.length > 0 && text.length < 100) {
              label = text;
              break;
            }
          }
          parent = parent.parentElement;
        }
      }

      const name = (element.name || '').toLowerCase();
      const allText = name + ' ' + (element.id || '') + ' ' + (element.placeholder || '') + ' ' + label;

      if (allText.match(/お名前|氏名|名前|ご氏名/) && !allText.match(/会社|法人|件名/)) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        nameFields.push({
          name: element.name,
          id: element.id,
          label: label,
          type: element.type,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          disabled: element.disabled,
          readOnly: element.readOnly
        });
      }
    });

    return { nameFields, windowWidth: window.innerWidth };
  });

  console.log('\n=== 検出された名前フィールド ===');
  console.log('画面幅:', result.windowWidth);
  console.log('名前フィールド数:', result.nameFields.length);
  result.nameFields.forEach((f, i) => {
    console.log('\n[' + (i + 1) + '] name="' + f.name + '", id="' + f.id + '"');
    console.log('    label: "' + f.label + '"');
    console.log('    位置: x=' + f.x + ', y=' + f.y + ', w=' + f.width + ', h=' + f.height);
    console.log('    style: display=' + f.display + ', visibility=' + f.visibility + ', opacity=' + f.opacity);
    console.log('    disabled=' + f.disabled + ', readOnly=' + f.readOnly);
  });

  console.log('\n30秒待機中...');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
})();
