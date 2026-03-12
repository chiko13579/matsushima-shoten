const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.m-partners.jp/flow/';

  console.log(`\n📋 税理士法人総和のフォームをチェック中...\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フォームフィールドをチェック
    const fields = await page.evaluate(() => {
      const elements = document.querySelectorAll('input, textarea, select');
      const result = [];

      elements.forEach(element => {
        if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') {
          return;
        }

        let label = '';
        if (element.id) {
          const labelElement = document.querySelector(`label[for="${element.id}"]`);
          if (labelElement) label = labelElement.textContent.trim();
        }
        if (!label) {
          const parentLabel = element.closest('label');
          if (parentLabel) label = parentLabel.textContent.trim();
        }

        const isRequired = element.required ||
                          element.getAttribute('aria-required') === 'true' ||
                          label.includes('必須') ||
                          label.includes('*') ||
                          label.includes('※');

        result.push({
          type: element.type || element.tagName.toLowerCase(),
          name: element.name || '',
          label: label || '(ラベルなし)',
          required: isRequired,
          tagName: element.tagName.toLowerCase()
        });
      });

      return result;
    });

    console.log(`📊 フィールド数: ${fields.length}個`);
    const required = fields.filter(f => f.required);
    console.log(`📊 必須フィールド: ${required.length}個\n`);

    if (fields.length > 0) {
      console.log('全フィールド:');
      fields.forEach((f, i) => {
        const req = f.required ? '[必須]' : '';
        console.log(`   ${i + 1}. ${req} [${f.type}] ${f.label} (name: ${f.name})`);
      });
    }

    // ボタンをチェック
    const buttons = await page.evaluate(() => {
      const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.button, a.btn, [role="button"]');
      const result = [];

      allButtons.forEach(button => {
        const text = button.textContent || button.value || '';
        result.push({
          tag: button.tagName.toLowerCase(),
          type: button.type || '',
          text: text.trim(),
          classes: button.className || ''
        });
      });

      return result;
    });

    console.log(`\n📊 ボタン数: ${buttons.length}個`);

    const submitButtons = buttons.filter(b =>
      b.text.match(/送信|submit|確認|登録|apply|問.*合|お問合せ|問い合わせ/i)
    );

    if (submitButtons.length > 0) {
      console.log('✅ 送信ボタン発見:');
      submitButtons.forEach(btn => {
        console.log(`   - [${btn.tag}] "${btn.text}" (classes: ${btn.classes})`);
      });
    } else {
      console.log('❌ 送信ボタンが見つかりません\n');
      console.log('全ボタン:');
      buttons.forEach((btn, i) => {
        console.log(`   ${i + 1}. [${btn.tag}] "${btn.text}" (classes: ${btn.classes})`);
      });
    }

    console.log('\n⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
