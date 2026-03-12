const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.zyamagishi.jp/form/zeirishihouzin-yamagishi/contact';

  console.log(`\n📋 税理士法人山岸会計のフォーム調査\n`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));

    // チェックボックスを探す
    const checkboxes = await page.evaluate(() => {
      const cbs = document.querySelectorAll('input[type="checkbox"]');
      const result = [];

      cbs.forEach((cb, index) => {
        let label = '';
        if (cb.id) {
          const labelEl = document.querySelector(`label[for="${cb.id}"]`);
          if (labelEl) label = labelEl.textContent.trim();
        }
        if (!label && cb.nextElementSibling) {
          label = cb.nextElementSibling.textContent.trim();
        }
        if (!label && cb.parentElement) {
          label = cb.parentElement.textContent.trim().substring(0, 100);
        }

        result.push({
          index: index + 1,
          name: cb.name,
          id: cb.id,
          value: cb.value,
          label: label,
          required: cb.required
        });
      });

      return result;
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`チェックボックス (${checkboxes.length}個):`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    checkboxes.forEach(cb => {
      console.log(`${cb.index}. [${cb.required ? '必須' : '任意'}]`);
      console.log(`   Name: ${cb.name}`);
      console.log(`   ID: ${cb.id}`);
      console.log(`   Value: ${cb.value}`);
      console.log(`   Label: ${cb.label}`);
      console.log('');
    });

    // 「お問い合わせ内容」「相談内容」「業務内容」などのキーワードを含むチェックボックスを探す
    const inquiryCheckboxes = checkboxes.filter(cb =>
      cb.label.includes('創業') ||
      cb.label.includes('経営助言') ||
      cb.label.includes('資金繰り') ||
      cb.label.includes('自計化') ||
      cb.label.includes('経営改善') ||
      cb.label.includes('節税') ||
      cb.label.includes('贈与') ||
      cb.label.includes('その他')
    );

    if (inquiryCheckboxes.length > 0) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✅ お問い合わせ内容に関するチェックボックス発見！`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      inquiryCheckboxes.forEach(cb => {
        console.log(`  ${cb.index}. ${cb.label}`);
        console.log(`      name="${cb.name}"`);
      });

      // 同じnameでグループ化
      const names = [...new Set(inquiryCheckboxes.map(cb => cb.name))];
      console.log(`\n  Name属性: ${names.join(', ')}`);
    }

    console.log('\n\n⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
