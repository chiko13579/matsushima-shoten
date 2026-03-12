const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Testing: https://www.toshikaikei.biz/call/');
  await page.goto('https://www.toshikaikei.biz/call/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    const allFields = [];
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

      let label = '';
      // 方法1: label[for]
      if (element.id) {
        const labelElement = document.querySelector(`label[for="${element.id}"]`);
        if (labelElement) label = labelElement.textContent.trim();
      }
      // 方法2: 親label
      if (!label) {
        const parentLabel = element.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }
      // 方法3: 親要素のテキスト
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
      // 方法4: 前の兄弟要素
      if (!label) {
        let sibling = element.previousElementSibling;
        for (let i = 0; i < 3 && sibling; i++) {
          const text = sibling.textContent.trim();
          if (text.length > 0 && text.length < 100) {
            label = text;
            break;
          }
          sibling = sibling.previousElementSibling;
        }
      }
      // 方法5: 親のdt要素
      if (!label) {
        const dd = element.closest('dd');
        if (dd) {
          const dt = dd.previousElementSibling;
          if (dt && dt.tagName === 'DT') {
            label = dt.textContent.trim();
          }
        }
      }
      // 方法6: 親のth要素
      if (!label) {
        const td = element.closest('td');
        if (td) {
          const th = td.previousElementSibling;
          if (th && th.tagName === 'TH') {
            label = th.textContent.trim();
          }
        }
      }

      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      allFields.push({
        tagName: element.tagName,
        type: element.type,
        name: element.name,
        id: element.id,
        placeholder: element.placeholder,
        label: label,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        disabled: element.disabled,
        readOnly: element.readOnly,
        required: element.required || element.closest('.required') !== null || label.includes('必須')
      });
    });

    // チェックボックスも確認
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const checkboxInfo = [];
    checkboxes.forEach(cb => {
      let label = '';
      if (cb.id) {
        const labelEl = document.querySelector(`label[for="${cb.id}"]`);
        if (labelEl) label = labelEl.textContent.trim();
      }
      if (!label) {
        const parentLabel = cb.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }
      checkboxInfo.push({
        name: cb.name,
        id: cb.id,
        label: label,
        checked: cb.checked
      });
    });

    // 同意ボタンも確認
    const buttons = document.querySelectorAll('button, input[type="submit"], a.button, .btn, [class*="agree"], [class*="submit"]');
    const buttonInfo = [];
    buttons.forEach(btn => {
      buttonInfo.push({
        tagName: btn.tagName,
        text: btn.textContent.trim().substring(0, 50),
        type: btn.type,
        className: btn.className
      });
    });

    return { allFields, checkboxes: checkboxInfo, buttons: buttonInfo };
  });

  console.log('\n=== 全フィールド一覧 ===');
  result.allFields.forEach((f, i) => {
    const visible = f.width > 0 && f.height > 0 && f.display !== 'none' && f.visibility !== 'hidden';
    console.log(`\n[${i + 1}] ${f.tagName} type="${f.type}" name="${f.name}"`);
    console.log(`    label: "${f.label}"`);
    console.log(`    placeholder: "${f.placeholder}"`);
    console.log(`    位置: x=${f.x}, y=${f.y}, w=${f.width}, h=${f.height}`);
    console.log(`    visible=${visible}, required=${f.required}`);
  });

  console.log('\n=== チェックボックス ===');
  result.checkboxes.forEach((cb, i) => {
    console.log(`[${i + 1}] name="${cb.name}" label="${cb.label}" checked=${cb.checked}`);
  });

  console.log('\n=== ボタン ===');
  result.buttons.forEach((btn, i) => {
    console.log(`[${i + 1}] ${btn.tagName} text="${btn.text}" class="${btn.className}"`);
  });

  console.log('\n60秒待機中...');
  await new Promise(r => setTimeout(r, 60000));
  await browser.close();
})();
