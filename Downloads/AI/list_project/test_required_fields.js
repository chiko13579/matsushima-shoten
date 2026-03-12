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
  zip: '470-2303',
  zip1: '470',
  zip2: '2303',
  address: '愛知県知多郡武豊町祠峰1-91',
  prefecture: '愛知県',
  city: '知多郡武豊町',
  message: `お世話になっております。
「あなたのおかげデザイン」の森田と申します。

テスト送信です。`
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.smc-g.co.jp/contact';

  console.log(`\n📋 フォームをチェック中: ${url}\n`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // 全フィールドの情報を取得
  const allFields = await page.evaluate(() => {
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

      // 必須チェック: required属性、aria-required、ラベル内の「必須」
      const isRequired = element.required ||
                        element.getAttribute('aria-required') === 'true' ||
                        label.includes('必須') ||
                        label.includes('*');

      result.push({
        type: element.type || element.tagName.toLowerCase(),
        name: element.name || '',
        id: element.id || '',
        placeholder: element.placeholder || '',
        label: label,
        required: isRequired,
        value: element.value || ''
      });
    });

    return result;
  });

  console.log('全フィールド一覧:\n');
  allFields.forEach((field, i) => {
    const requiredMark = field.required ? '[必須]' : '';
    console.log(`${i + 1}. ${requiredMark} ${field.label || field.name || field.placeholder}`);
    console.log(`   Type: ${field.type}`);
    console.log(`   Name: ${field.name}`);
    console.log(`   ID: ${field.id}`);
    if (field.value) console.log(`   Current Value: ${field.value}`);
    console.log('');
  });

  const requiredFields = allFields.filter(f => f.required);
  console.log(`\n📊 必須フィールド: ${requiredFields.length}個`);
  requiredFields.forEach(field => {
    console.log(`   - ${field.label || field.name} (${field.type})`);
  });

  console.log('\n\n⏰ 30秒間フォームを確認できます...');
  await new Promise(r => setTimeout(r, 30000));

  await browser.close();
})();
