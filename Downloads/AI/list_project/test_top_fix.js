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

  const url = 'https://www.top-zeirishi.net/form/top-zeirishinet/inquiry';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 税理士法人 トップ - 住所フィールド修正テスト`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フォーム入力
    const result = await page.evaluate((SENDER_INFO) => {
      const filledFields = [];
      const elements = document.querySelectorAll('input, textarea, select');

      function detectFieldType(element) {
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const label = element.label || '';
        const type = element.type || '';
        const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

        // 住所（name属性による特定パターンを優先検出）
        if (name === 'state' || name === 'state_1') {
          return { type: 'prefecture', value: SENDER_INFO.prefecture };
        }
        if (name === 'address_1') {
          const addressWithoutPref = SENDER_INFO.address.replace(SENDER_INFO.prefecture, '').trim();
          return { type: 'addressWithoutPref', value: addressWithoutPref };
        }
        if (name === 'building' || name === 'building_1') {
          return { type: 'building', value: SENDER_INFO.building || '' };
        }

        // フルネーム
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|組織|department|部署|部門|所属|division/)) {
          return { type: 'fullName', value: SENDER_INFO.fullName };
        }

        // メール
        if (type === 'email' || allText.match(/mail|メール/)) {
          return { type: 'email', value: SENDER_INFO.email };
        }

        // 電話番号（name属性による特定パターンを優先検出）
        if (name === 'tel1' || name === 'tel1_1' || name === 'phone1') {
          return { type: 'tel1', value: SENDER_INFO.tel1 };
        }
        if (name === 'tel2' || name === 'tel2_1' || name === 'phone2') {
          return { type: 'tel2', value: SENDER_INFO.tel2 };
        }
        if (name === 'tel3' || name === 'tel3_1' || name === 'phone3') {
          return { type: 'tel3', value: SENDER_INFO.tel3 };
        }

        // 電話（一般的なパターン）
        if (type === 'tel' || allText.match(/tel|電話|phone/)) {
          return { type: 'tel', value: SENDER_INFO.tel };
        }

        // 問い合わせ内容
        if (element.tagName.toLowerCase() === 'textarea' || allText.match(/問い合わせ|お問合せ|ご相談|内容|message|詳細|comment/)) {
          return { type: 'message', value: SENDER_INFO.message };
        }

        return { type: 'other', value: '' };
      }

      elements.forEach(element => {
        if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

        let label = '';
        if (element.id) {
          const labelElement = document.querySelector(`label[for="${element.id}"]`);
          if (labelElement) label = labelElement.textContent.trim();
        }
        if (!label) {
          const parentLabel = element.closest('label');
          if (parentLabel) label = parentLabel.textContent.trim();
        }
        if (!label) {
          const tr = element.closest('tr');
          if (tr) {
            const th = tr.querySelector('th');
            if (th) label = th.textContent.trim();
          }
        }

        element.label = label;
        const detection = detectFieldType(element);

        if (detection.type !== 'other' && detection.value !== undefined) {
          if (element.tagName.toLowerCase() === 'select') {
            // SELECTフィールド
            const options = element.options;
            for (let i = 0; i < options.length; i++) {
              const optionText = options[i].textContent.trim();
              const optionValue = options[i].value;
              if (optionText === detection.value || optionText.includes(detection.value) || optionValue === detection.value) {
                element.selectedIndex = i;
                element.dispatchEvent(new Event('change', { bubbles: true }));
                filledFields.push({
                  name: element.name,
                  label: label,
                  value: optionText,
                  detectionType: detection.type
                });
                break;
              }
            }
          } else if (detection.value) {
            // INPUT/TEXTAREAフィールド
            element.value = detection.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({
              name: element.name,
              label: label,
              value: detection.value,
              detectionType: detection.type
            });
          }
        }
      });

      return { filledFields };
    }, SENDER_INFO);

    console.log(`✅ 入力完了: ${result.filledFields.length}項目\n`);

    console.log(`入力されたフィールド:`);
    result.filledFields.forEach(field => {
      const displayName = field.label || field.name;
      console.log(`   ${field.detectionType}: "${displayName}" → "${field.value}"`);
    });

    // 住所フィールドの値を確認
    const addressValues = await page.evaluate(() => {
      const state = document.querySelector('select[name="state_1"]');
      const address = document.querySelector('input[name="address_1"]');
      const building = document.querySelector('input[name="building_1"]');

      return {
        prefecture: state ? state.options[state.selectedIndex]?.textContent.trim() : null,
        address: address ? address.value : null,
        building: building ? building.value : null
      };
    });

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`住所フィールドの確認:`);
    console.log(`   都道府県: "${addressValues.prefecture}"`);
    console.log(`   住所: "${addressValues.address}"`);
    console.log(`   建物: "${addressValues.building}"`);

    if (addressValues.prefecture === '愛知県' &&
        addressValues.address === '知多郡武豊町祠峰1-91') {
      console.log(`\n✅ 成功！住所フィールドが正しく入力されました`);
    } else {
      console.log(`\n❌ 失敗！住所フィールドの値が正しくありません`);
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log('⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    console.error(error.stack);
  }

  await browser.close();
  console.log('\n✅ テスト完了！');
})();
