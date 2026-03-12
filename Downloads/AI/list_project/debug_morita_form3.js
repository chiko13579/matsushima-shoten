const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://m-zj.com/contact/contact.html';

  console.log(`\n📋 森田税理士・社労士事務所のフォーム全フィールド調査\n`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));

    const allFields = await page.evaluate(() => {
      const fields = [];
      const elements = document.querySelectorAll('input, textarea, select');

      elements.forEach((el, index) => {
        if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') {
          return;
        }

        let label = '';
        if (el.id) {
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          if (labelEl) label = labelEl.textContent.trim();
        }
        if (!label) {
          const parentLabel = el.closest('label');
          if (parentLabel) label = parentLabel.textContent.trim();
        }
        if (!label && el.previousElementSibling) {
          const prevText = el.previousElementSibling.textContent.trim();
          if (prevText.length < 100) label = prevText;
        }

        // selectの場合はオプションも取得
        let options = [];
        if (el.tagName.toLowerCase() === 'select') {
          const opts = Array.from(el.options);
          options = opts.map(opt => ({
            value: opt.value,
            text: opt.text.trim()
          }));
        }

        fields.push({
          index: index + 1,
          tagName: el.tagName.toLowerCase(),
          type: el.type || el.tagName.toLowerCase(),
          name: el.name,
          id: el.id,
          label: label,
          placeholder: el.placeholder || '',
          value: el.value || '',
          required: el.required,
          options: options
        });
      });

      return fields;
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`全フィールド (${allFields.length}個):`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    allFields.forEach(field => {
      console.log(`${field.index}. [${field.tagName}/${field.type}] ${field.required ? '必須' : ''}`);
      console.log(`   Name: ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Label: ${field.label || '(なし)'}`);
      if (field.placeholder) console.log(`   Placeholder: ${field.placeholder}`);
      if (field.value) console.log(`   Value: ${field.value}`);

      if (field.options.length > 0) {
        console.log(`   Options (${field.options.length}個):`);
        field.options.forEach((opt, i) => {
          console.log(`     ${i + 1}. "${opt.text}" (value="${opt.value}")`);
        });
      }
      console.log('');
    });

    // ページ全体のテキストで「お問い合わせ内容」を探す
    const pageText = await page.evaluate(() => {
      return document.body.textContent;
    });

    if (pageText.includes('お問い合わせ内容')) {
      console.log('\n✅ ページに「お問い合わせ内容」というテキストが存在します');

      // この周辺のHTML構造を取得
      const structure = await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );

        let node;
        while (node = walker.nextNode()) {
          if (node.textContent.includes('お問い合わせ内容')) {
            const parent = node.parentElement;
            return {
              found: true,
              parentTag: parent.tagName,
              parentClass: parent.className,
              parentHTML: parent.outerHTML.substring(0, 500)
            };
          }
        }
        return { found: false };
      });

      if (structure.found) {
        console.log('\n周辺のHTML構造:');
        console.log(`  親要素: <${structure.parentTag} class="${structure.parentClass}">`);
        console.log(`  HTML:\n${structure.parentHTML}...`);
      }
    }

    console.log('\n\n⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
