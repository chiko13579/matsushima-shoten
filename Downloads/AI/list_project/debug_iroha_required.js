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

      // 必須検出ロジック（auto_contact_sender.jsと同じ）
      let required = element.required;
      if (!required && element.getAttribute('aria-required') === 'true') {
        required = true;
      }
      if (!required && label.match(/必須|\*|※/)) {
        required = true;
      }

      // 親要素のテキストも確認
      let parentText = '';
      let parentWithRequired = null;
      let parent = element.parentElement;
      for (let i = 0; i < 5 && parent; i++) {
        const text = parent.textContent || '';
        if (text.includes('必須')) {
          parentWithRequired = parent;
          parentText = text.substring(0, 100);
          break;
        }
        parent = parent.parentElement;
      }

      fields.push({
        tagName: tagName,
        type: type,
        name: element.name || '',
        label: label.substring(0, 50),
        required: required,
        elementRequired: element.required,
        ariaRequired: element.getAttribute('aria-required'),
        labelHasRequired: !!label.match(/必須|\*|※/),
        parentHasRequired: !!parentWithRequired,
        parentText: parentText
      });
    });

    return fields;
  });

  console.log('=== 必須検出の詳細 ===\n');
  result.forEach((f, i) => {
    console.log('[' + (i + 1) + '] ' + f.tagName.toUpperCase() + ' (type=' + f.type + ')');
    console.log('    name: "' + f.name + '"');
    console.log('    label: "' + f.label + '"');
    console.log('    --- 必須検出 ---');
    console.log('    element.required: ' + f.elementRequired);
    console.log('    aria-required: ' + f.ariaRequired);
    console.log('    ラベルに必須: ' + f.labelHasRequired);
    console.log('    親要素に必須: ' + f.parentHasRequired);
    if (f.parentHasRequired) {
      console.log('    親テキスト: "' + f.parentText + '"');
    }
    console.log('    ▶ 最終判定: ' + (f.required ? '必須 ✅' : '任意 ❌'));
    console.log('');
  });

  await browser.close();
})();
