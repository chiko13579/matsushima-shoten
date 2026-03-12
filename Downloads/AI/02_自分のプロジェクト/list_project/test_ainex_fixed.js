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

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://business.form-mailer.jp/fms/4d1a7ba5267478';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 アイネックス税理士法人 - 修正後テスト`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // auto_contact_sender.jsを注入
    await page.addScriptTag({ path: '/Users/saeki/Downloads/img/list_project/auto_contact_sender.js' });

    console.log('📝 フォーム入力中...\n');
    await new Promise(r => setTimeout(r, 15000));

    // 住所フィールドの値を確認
    const addressFields = await page.evaluate(() => {
      const result = {
        prefecture: '',
        city: '',
        block: '',
        building: ''
      };

      const prefectureSelect = document.getElementById('field_4509937_pref');
      if (prefectureSelect) {
        const selectedOption = prefectureSelect.options[prefectureSelect.selectedIndex];
        result.prefecture = selectedOption ? selectedOption.textContent : '';
      }

      const cityInput = document.getElementById('field_4509937_city');
      if (cityInput) result.city = cityInput.value;

      const blockInput = document.getElementById('field_4509937_block');
      if (blockInput) result.block = blockInput.value;

      const buildingInput = document.getElementById('field_4509937_building');
      if (buildingInput) result.building = buildingInput.value;

      return result;
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`住所フィールドの確認:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log(`都道府県: "${addressFields.prefecture}" ${addressFields.prefecture === '愛知県' ? '✅' : '❌ 期待値: 愛知県'}`);
    console.log(`市区町村: "${addressFields.city}" ${addressFields.city === '知多郡武豊町' ? '✅' : '❌ 期待値: 知多郡武豊町'}`);
    console.log(`番地: "${addressFields.block}" ${addressFields.block === '祠峰1-91' ? '✅' : '❌ 期待値: 祠峰1-91'}`);
    console.log(`マンション・ビル名: "${addressFields.building}" ${addressFields.building === '' ? '✅ (空欄)' : `❌ 期待値: 空欄, 実際: ${addressFields.building}`}`);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // フォーム内容を確認
    console.log('⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
  console.log('\n✅ テスト完了！');
})();
