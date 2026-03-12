const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('調査中: https://www.irohagyosei.jp/contact/\n');
  await page.goto('https://www.irohagyosei.jp/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const result = await page.evaluate(() => {
    const fields = [];
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

      // ラベル取得
      let label = '';
      if (element.id) {
        const labelElement = document.querySelector('label[for="' + element.id + '"]');
        if (labelElement) label = labelElement.textContent.trim();
      }
      if (!label) {
        const parentLabel = element.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }
      if (!label) {
        let parent = element.parentElement;
        while (parent && parent.tagName !== 'BODY') {
          const prevSibling = parent.previousElementSibling;
          if (prevSibling) {
            const text = prevSibling.textContent.trim();
            if (text && text.length < 100) {
              label = text;
              break;
            }
          }
          parent = parent.parentElement;
        }
      }

      const tagName = element.tagName.toLowerCase();
      const type = element.type || '';

      // 修正後の必須検出ロジック
      let isRequired = element.required ||
        element.getAttribute('aria-required') === 'true' ||
        label.includes('必須') ||
        label.includes('*') ||
        label.includes('※');

      // 親要素に「必須」があるかもチェック（最大5階層上まで）
      let parentRequiredInfo = '';
      if (!isRequired) {
        let parent = element.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          // 直接のテキストノードのみチェック（他のフィールドのラベルを拾わないように）
          const directText = Array.from(parent.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && !n.querySelector('input, textarea, select')))
            .map(n => n.textContent || '')
            .join('');
          if (directText.includes('必須')) {
            isRequired = true;
            parentRequiredInfo = `階層${i+1}で発見`;
            break;
          }
          parent = parent.parentElement;
        }
      }

      fields.push({
        tagName: tagName,
        type: type,
        name: element.name || '',
        label: label.substring(0, 50),
        isRequired: isRequired,
        parentRequiredInfo: parentRequiredInfo
      });
    });

    return fields;
  });

  console.log('=== 修正後の必須検出 ===\n');
  result.forEach((f, i) => {
    console.log('[' + (i + 1) + '] ' + f.tagName.toUpperCase() + ' (type=' + f.type + ')');
    console.log('    name: "' + f.name + '"');
    console.log('    label: "' + f.label + '"');
    console.log('    ▶ 必須: ' + (f.isRequired ? '✅ YES' : '❌ NO') + (f.parentRequiredInfo ? ' (' + f.parentRequiredInfo + ')' : ''));
    console.log('');
  });

  await browser.close();
})();
