const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.kobayashi-tax-accountant.com/contact/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await new Promise(r => setTimeout(r, 3000));

  const formFields = await page.evaluate(() => {
    const elements = document.querySelectorAll('input, textarea, select');
    const result = [];

    elements.forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

      let label = '';

      // プレースホルダーやaria-labelを最優先で確認
      if (element.placeholder && element.placeholder.trim()) {
        label = element.placeholder.trim();
      }
      if (!label && element.getAttribute('aria-label')) {
        label = element.getAttribute('aria-label').trim();
      }

      // フィールドの直前の兄弟要素をチェック
      if (!label) {
        let prevSibling = element.previousElementSibling;
        if (prevSibling && (prevSibling.tagName === 'SPAN' || prevSibling.tagName === 'DIV' || prevSibling.tagName === 'LABEL')) {
          const text = prevSibling.textContent.trim();
          if (text && text.length < 20) {
            label = text;
          }
        }
      }

      // 通常のラベル取得
      if (!label && element.id) {
        const labelElement = document.querySelector(`label[for="${element.id}"]`);
        if (labelElement) label = labelElement.textContent.trim();
      }
      if (!label) {
        const parentLabel = element.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }
      if (!label) {
        const tr = element.closest('tr');
        if (tr) {
          const th = tr.querySelector('th');
          if (th) label = th.textContent.trim();
        }
      }
      if (!label) {
        const dd = element.closest('dd');
        if (dd) {
          const prevDt = dd.previousElementSibling;
          if (prevDt && prevDt.tagName === 'DT') {
            label = prevDt.textContent.trim();
          }
        }
      }
      // fieldset > legend パターン
      if (!label) {
        const fieldset = element.closest('fieldset');
        if (fieldset) {
          const legend = fieldset.querySelector('legend');
          if (legend) label = legend.textContent.trim();
        }
      }
      // div/section の最初の要素がラベルの可能性
      if (!label) {
        const parent = element.parentElement;
        if (parent && (parent.tagName === 'DIV' || parent.tagName === 'SECTION')) {
          const firstChild = parent.firstElementChild;
          if (firstChild &&
              !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(firstChild.tagName) &&
              firstChild.textContent.trim().length > 0 &&
              firstChild.textContent.trim().length < 50) {
            label = firstChild.textContent.trim();
          }
        }
      }

      const name = element.name || '';
      const id = element.id || '';
      const tagName = element.tagName;
      const type = element.type || '';
      const className = element.className || '';
      const title = element.getAttribute('title') || '';
      const ariaLabel = element.getAttribute('aria-label') || '';

      // 必須項目の判定
      const isRequired = element.required ||
                        element.hasAttribute('required') ||
                        element.getAttribute('aria-required') === 'true' ||
                        element.getAttribute('aria-invalid') === 'true' ||
                        className.includes('required') ||
                        className.includes('必須') ||
                        className.includes('validate') ||
                        label.includes('*') ||
                        label.includes('＊') ||
                        label.includes('※') ||
                        label.includes('必須') ||
                        label.includes('Required');

      result.push({
        tagName,
        type,
        name,
        id,
        label,
        title,
        ariaLabel,
        isRequired,
        className: className.substring(0, 50),
        outerHTML: element.outerHTML.substring(0, 200)
      });
    });

    return result;
  });

  console.log('全フィールド一覧:');
  console.log(JSON.stringify(formFields, null, 2));

  console.log('\n\nTextareaフィールドのみ:');
  const textareas = formFields.filter(f => f.tagName === 'TEXTAREA');
  console.log(JSON.stringify(textareas, null, 2));

  await browser.close();
})();
