const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const FORMS_TO_TEST = [
  { name: 'ミカタ税理士法人', url: 'https://mikata-c.co.jp/contact.html', error: '送信ボタンが見つかりませんでした' },
  { name: '税理士法人福島会計', url: 'https://www.flair-ta.jp/service/flow', error: '送信ボタンが見つかりませんでした' }
];

async function testForm(form) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ${form.name}`);
  console.log(`🔗 ${form.url}`);
  console.log(`❌ 以前のエラー: ${form.error}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(form.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
          required: isRequired
        });
      });

      return result;
    });

    console.log(`📊 フィールド数: ${fields.length}個`);
    const required = fields.filter(f => f.required);
    console.log(`📊 必須フィールド: ${required.length}個`);

    if (required.length > 0) {
      console.log('\n必須フィールド:');
      required.forEach((f, i) => {
        console.log(`   ${i + 1}. [${f.type}] ${f.label}`);
      });
    }

    // ボタンをチェック
    const buttons = await page.evaluate(() => {
      const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.button, a.btn, a[class*="btn"], [role="button"]');
      const result = [];

      allButtons.forEach(button => {
        const text = button.textContent || button.value || '';
        const href = button.href || '';
        result.push({
          tag: button.tagName.toLowerCase(),
          type: button.type || '',
          text: text.trim(),
          href: href,
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
        console.log(`   - [${btn.tag}] "${btn.text}"`);
        if (btn.classes) console.log(`     classes: ${btn.classes}`);
      });
    } else {
      console.log('❌ 送信ボタンが見つかりません\n');
      console.log('全ボタン（最初の10個）:');
      buttons.slice(0, 10).forEach((btn, i) => {
        if (btn.text) {
          console.log(`   ${i + 1}. [${btn.tag}] "${btn.text}"`);
          if (btn.classes) console.log(`      classes: ${btn.classes}`);
        }
      });
    }

    console.log('\n⏰ 20秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 20000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
}

(async () => {
  for (const form of FORMS_TO_TEST) {
    await testForm(form);
  }
  console.log('\n\n✅ 全テスト完了！');
})();
