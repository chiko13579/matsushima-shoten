const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const SENDER_INFO = {
  lastName: '森田',
  firstName: '憲治',
  fullName: '森田憲治',
  lastNameKana: 'もりた',
  firstNameKana: 'けんじ',
  fullNameKana: 'もりたけんじ',
  company: 'あなたのおかげ',
  email: 'info@anatano-okage.com',
  tel: '090-9174-9043',
  tel1: '090',
  tel2: '9174',
  tel3: '9043',
  zip: '470-2303',
  zip1: '470',
  zip2: '2303',
  address: '愛知県知多郡武豊町祠峰1-91',
  prefecture: '愛知県',
  city: '知多郡武豊町',
  industry: 'マーケティング',
  message: `お世話になっております。
「あなたのおかげデザイン」の森田と申します。

テスト送信です。`
};

const FORMS_TO_TEST = [
  { name: 'SMC税理士法人', url: 'https://www.smc-g.co.jp/contact' },
  { name: '税理士法人総和', url: 'https://www.m-partners.jp/flow/' },
  { name: '税理士法人 末松会計事務所', url: 'https://sue-tax.com/contact/' }
];

async function analyzeForm(name, url) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ${name}`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

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
        console.log(`   ${i + 1}. [${f.type}] ${f.label} (name: ${f.name})`);
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
          text: text.trim()
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
      });
    } else {
      console.log('❌ 送信ボタンが見つかりません');
      console.log('\n全ボタン:');
      buttons.slice(0, 5).forEach(btn => {
        console.log(`   - [${btn.tag}] "${btn.text}"`);
      });
    }

    console.log('\n✅ 分析完了');

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
}

(async () => {
  for (const form of FORMS_TO_TEST) {
    await analyzeForm(form.name, form.url);
  }
})();
