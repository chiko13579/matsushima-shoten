const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function debugFormFields() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto('https://www.yuigonsyo.biz/contact/', { waitUntil: 'networkidle2' });

  const fields = await page.evaluate(() => {
    const results = [];

    // すべてのフォーム要素を取得
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(el => {
      if (el.type === 'hidden' || el.type === 'submit') return;

      const info = {
        tag: el.tagName.toLowerCase(),
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        required: el.required || el.getAttribute('aria-required') === 'true',
        label: '',
        value: el.value || ''
      };

      // ラベルを取得
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) {
          info.label = labelEl.textContent.trim();
        }
      }
      if (!info.label && el.closest('label')) {
        info.label = el.closest('label').textContent.trim();
      }

      results.push(info);
    });

    return results;
  });

  console.log('=== フォームフィールド一覧 ===');
  fields.forEach((f, i) => {
    console.log(`\n[${i + 1}] ${f.tag}[${f.type}]`);
    console.log(`    name: ${f.name}`);
    console.log(`    id: ${f.id}`);
    console.log(`    required: ${f.required}`);
    console.log(`    label: ${f.label}`);
  });

  // subject[] チェックボックスの詳細
  const subjectCheckboxes = await page.evaluate(() => {
    const cbs = document.querySelectorAll('input[name="subject[]"]');
    return Array.from(cbs).map(cb => ({
      id: cb.id,
      value: cb.value,
      checked: cb.checked,
      label: cb.closest('label')?.textContent.trim() || document.querySelector(`label[for="${cb.id}"]`)?.textContent.trim() || ''
    }));
  });

  console.log('\n=== subject[] チェックボックス詳細 ===');
  subjectCheckboxes.forEach((cb, i) => {
    console.log(`  [${i + 1}] id=${cb.id}, value=${cb.value}, label=${cb.label}`);
  });

  await browser.close();
}

debugFormFields().catch(console.error);
