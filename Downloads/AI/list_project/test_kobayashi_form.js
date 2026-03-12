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
  street: '祠峰1-91',
  industry: 'マーケティング',
  message: `お世話になっております。
「あなたのおかげデザイン」の森田と申します。

テスト送信です。`
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.kobayashi-tax-accountant.com/contact/';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 税理士 小林誉光事務所 - フォーム入力テスト`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // auto_contact_sender.jsを注入して実行
    await page.addScriptTag({ path: '/Users/saeki/Downloads/img/list_project/auto_contact_sender.js' });

    console.log('📝 フォーム入力中...\n');
    await new Promise(r => setTimeout(r, 5000));

    // お名前フィールドの値を確認
    const nameField = await page.evaluate(() => {
      const nameInput = document.querySelector('input[name="namae"]');
      if (nameInput) {
        return {
          name: nameInput.name,
          value: nameInput.value,
          placeholder: nameInput.placeholder
        };
      }
      return null;
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`お名前フィールドの確認:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    if (nameField) {
      console.log(`Name: ${nameField.name}`);
      console.log(`Placeholder: ${nameField.placeholder}`);
      console.log(`Value: "${nameField.value}"`);

      if (nameField.value === '森田憲治') {
        console.log(`\n✅ 成功！お名前フィールドに正しく入力されました`);
      } else if (nameField.value === '') {
        console.log(`\n❌ 失敗！お名前フィールドが空です`);
      } else {
        console.log(`\n⚠️  警告！お名前フィールドに予期しない値: ${nameField.value}`);
      }
    } else {
      console.log(`❌ お名前フィールドが見つかりません`);
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 全フィールドの入力状況を確認
    const allFields = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
      const result = [];
      inputs.forEach(input => {
        if (input.value && input.value.trim() !== '') {
          result.push({
            name: input.name || input.id,
            value: input.value.length > 30 ? input.value.substring(0, 30) + '...' : input.value
          });
        }
      });
      return result;
    });

    console.log(`入力されたフィールド (${allFields.length}個):\n`);
    allFields.forEach((field, i) => {
      console.log(`${i + 1}. ${field.name}: "${field.value}"`);
    });

    console.log('\n⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
  console.log('\n✅ テスト完了！');
})();
