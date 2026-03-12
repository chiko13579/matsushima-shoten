const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.shinjuku-kensetsu.jp/contact', { waitUntil: 'networkidle2' });

  // テキスト入力フィールドを確認
  const fields = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea').forEach((el, i) => {
      let label = '';
      if (el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl) label = lbl.textContent.trim();
      }
      if (!label) {
        const parent = el.closest('label');
        if (parent) label = parent.textContent.trim().substring(0, 50);
      }
      if (!label && el.parentElement) {
        let p = el.parentElement;
        for (let d = 0; d < 3 && p && !label; d++) {
          const prev = p.previousElementSibling;
          if (prev) {
            const text = prev.textContent.trim();
            if (text.length > 0 && text.length <= 40) label = text;
          }
          p = p.parentElement;
        }
      }
      
      results.push({
        index: i,
        tag: el.tagName,
        name: el.name || '(no name)',
        id: el.id || '(no id)',
        type: el.type || '',
        placeholder: el.placeholder || '',
        label: label.substring(0, 60),
        visible: el.offsetWidth > 0 && el.offsetHeight > 0
      });
    });
    return results;
  });

  console.log('=== テキスト入力フィールド ===');
  fields.forEach(f => {
    console.log(`[${f.index}] ${f.tag} name="${f.name}" type="${f.type}" label="${f.label}" visible=${f.visible}`);
  });

  // select要素を確認
  const selects = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('select').forEach((el, i) => {
      const options = [];
      el.querySelectorAll('option').forEach(opt => {
        options.push({ value: opt.value, text: opt.textContent.trim() });
      });
      
      let label = '';
      if (el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl) label = lbl.textContent.trim();
      }
      if (!label && el.parentElement) {
        let p = el.parentElement;
        for (let d = 0; d < 3 && p && !label; d++) {
          const prev = p.previousElementSibling;
          if (prev) {
            const text = prev.textContent.trim();
            if (text.length > 0 && text.length <= 40) label = text;
          }
          p = p.parentElement;
        }
      }

      results.push({
        index: i,
        name: el.name || '(no name)',
        id: el.id || '(no id)',
        label: label.substring(0, 60),
        options: options
      });
    });
    return results;
  });

  console.log('\n=== SELECT要素 ===');
  selects.forEach(s => {
    console.log(`[${s.index}] name="${s.name}" label="${s.label}"`);
    console.log('  options:', s.options.map(o => `"${o.text}"(${o.value})`).join(', '));
  });

  // checkbox/radio要素を確認
  const checkRadios = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach((el, i) => {
      let label = '';
      if (el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl) label = lbl.textContent.trim();
      }
      if (!label) {
        const parent = el.closest('label');
        if (parent) label = parent.textContent.trim();
      }
      if (!label) label = el.value;

      results.push({
        index: i,
        type: el.type,
        name: el.name || '(no name)',
        id: el.id || '(no id)',
        value: el.value,
        label: label.substring(0, 60)
      });
    });
    return results;
  });

  console.log('\n=== CHECKBOX/RADIO要素 ===');
  checkRadios.forEach(c => {
    console.log(`[${c.index}] ${c.type} name="${c.name}" value="${c.value}" label="${c.label}"`);
  });

  await browser.close();
})();
