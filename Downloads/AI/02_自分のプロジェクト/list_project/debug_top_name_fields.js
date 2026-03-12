const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.top-zeirishi.net/form/top-zeirishinet/inquiry', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await new Promise(r => setTimeout(r, 3000));

  const nameFieldsInfo = await page.evaluate(() => {
    const elements = document.querySelectorAll('input[type="text"]');
    const result = [];

    elements.forEach((element, index) => {
      const name = element.name || '';
      const id = element.id || '';
      const placeholder = element.placeholder || '';

      // すべてのテキストフィールドを表示（最初の15個）
      if (index < 15) {
        // ラベル取得（複数の方法）
        let labels = {
          placeholder: placeholder,
          ariaLabel: element.getAttribute('aria-label') || '',
          prevSibling: '',
          labelFor: '',
          parentLabel: '',
          thLabel: ''
        };

        // 直前の兄弟要素
        let prevSibling = element.previousElementSibling;
        if (prevSibling) {
          labels.prevSibling = `${prevSibling.tagName}: "${prevSibling.textContent.trim().substring(0, 50)}"`;
        }

        // label[for]
        if (element.id) {
          const labelElement = document.querySelector(`label[for="${element.id}"]`);
          if (labelElement) labels.labelFor = labelElement.textContent.trim();
        }

        // 親要素のlabel
        const parentLabel = element.closest('label');
        if (parentLabel) labels.parentLabel = parentLabel.textContent.trim().substring(0, 100);

        // tr > th
        const tr = element.closest('tr');
        if (tr) {
          const th = tr.querySelector('th');
          if (th) labels.thLabel = th.textContent.trim();
        }

        result.push({
          name,
          id,
          labels,
          outerHTML: element.outerHTML.substring(0, 300)
        });
      }
    });

    return result;
  });

  console.log('名前フィールド詳細:');
  console.log(JSON.stringify(nameFieldsInfo, null, 2));

  console.log('\n⏰ 30秒間待機...');
  await new Promise(r => setTimeout(r, 30000));

  await browser.close();
  console.log('\n✅ デバッグ完了！');
})();
