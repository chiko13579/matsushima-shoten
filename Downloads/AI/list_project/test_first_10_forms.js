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

const FORMS_TO_TEST = [
  { name: '税理士 小林誉光事務所', url: 'https://www.kobayashi-tax-accountant.com/contact/' },
  { name: '税理士法人エム・エム・アイ', url: 'https://www.mmisouzoku.com/form/' },
  { name: 'アイネックス税理士法人', url: 'https://www.ainex-tac.com/contact/' },
  { name: '前川秀和税理士事務所', url: 'https://www.hidekazu-tax.com/contact/' },
  { name: 'フューチャーマネジメント税理士事務所', url: 'https://fm-tax.com/contact/' },
  { name: 'みつい税理士事務所', url: 'https://www.office-mitsui.jp/contact/' },
  { name: '税理士法人パートナーズ', url: 'https://www.p-office.gr.jp/contact/' },
  { name: 'みんなの会計事務所', url: 'https://www.minnano-k.com/contact/' },
  { name: 'Y&Partners会計事務所', url: 'https://www.yandpartners.jp/contact/' },
  { name: '山本聡一郎税理士事務所', url: 'https://www.office-yamamoto.gr.jp/contact/' }
];

async function testForm(form, index) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ${index + 1}. ${form.name}`);
  console.log(`🔗 ${form.url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(form.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

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

        if (allText.match(/company|会社|法人|屋号|corp|貴社|貴殿|組織|organization/)) {
          return { type: 'company', value: SENDER_INFO.company };
        }
        if (type === 'email' || allText.match(/mail|メール/)) {
          return { type: 'email', value: SENDER_INFO.email };
        }
        if (name === 'tel1' || name === 'tel1_1' || name === 'phone1') {
          return { type: 'tel1', value: SENDER_INFO.tel1 };
        }
        if (name === 'tel2' || name === 'tel2_1' || name === 'phone2') {
          return { type: 'tel2', value: SENDER_INFO.tel2 };
        }
        if (name === 'tel3' || name === 'tel3_1' || name === 'phone3') {
          return { type: 'tel3', value: SENDER_INFO.tel3 };
        }
        if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) {
          return { type: 'tel', value: SENDER_INFO.tel };
        }
        if (allText.match(/zip1|postal1|郵便1/) || (allText.match(/zip|postal|郵便/) && allText.match(/1|前/))) {
          return { type: 'zip1', value: SENDER_INFO.zip1 };
        }
        if (allText.match(/zip|postal|郵便|〒/)) {
          return { type: 'zip', value: SENDER_INFO.zip };
        }
        if (name === 'state' || name === 'state_1') {
          return { type: 'prefecture', value: SENDER_INFO.prefecture };
        }
        if (name === 'address_1') {
          const addressWithoutPref = SENDER_INFO.address.replace(SENDER_INFO.prefecture, '').trim();
          return { type: 'addressWithoutPref', value: addressWithoutPref };
        }
        if (allText.match(/都道府県|prefecture|pref/)) {
          return { type: 'prefecture', value: SENDER_INFO.prefecture };
        }
        if (allText.match(/市区町村|city/) || (allText.match(/住所/) && allText.match(/1|市|区|町|村/))) {
          return { type: 'city', value: SENDER_INFO.city };
        }
        if (allText.match(/住所|address/) && !allText.match(/mail|メール/)) {
          return { type: 'address', value: SENDER_INFO.address };
        }
        if ((element.tagName === 'textarea' && allText.match(/問.*合|相談|詳細|内容|ご質問|ご相談|message|inquiry/)) ||
            allText.match(/お問.*合.*内容|ご相談.*内容|message.*content|inquiry.*detail/)) {
          return { type: 'message', value: SENDER_INFO.message };
        }
        if (label.match(/^セイ$|^せい$/) || (allText.match(/kana.*head|head.*kana|last.*kana|lastnamekana|せい.*かな/) && !allText.match(/会社|法人|姓名/))) {
          return { type: 'lastNameKana', value: SENDER_INFO.lastNameKana };
        }
        if (label.match(/^メイ$|^めい$/) || (allText.match(/kana.*body|body.*kana|first.*kana|firstnamekana|めい.*かな/) && !allText.match(/会社|法人|姓名|氏名|お名前/))) {
          return { type: 'firstNameKana', value: SENDER_INFO.firstNameKana };
        }
        if (allText.match(/kana|かな|ふりがな|フリガナ/) && !allText.match(/会社|法人|社名|屋号|組織|corp/)) {
          return { type: 'fullNameKana', value: SENDER_INFO.fullNameKana };
        }
        if (placeholder && placeholder.match(/^[ぁ-ん\s　]+$/)) {
          return { type: 'fullNameKana', value: SENDER_INFO.fullNameKana };
        }
        if (label.match(/^姓$|^苗字$/) || (allText.match(/lastname|last_name|name.*head|姓(?!.*名)|苗字/) && !allText.match(/会社|法人|かな|kana|ふりがな/))) {
          return { type: 'lastName', value: SENDER_INFO.lastName };
        }
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|組織|department|部署|部門|所属|division/)) {
          return { type: 'fullName', value: SENDER_INFO.fullName };
        }
        if (type === 'checkbox' && allText.match(/同意|承諾|accept|agree|privacy|個人情報/)) {
          return { type: 'agreement', value: true };
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
        if (!label) {
          const dd = element.closest('dd');
          if (dd) {
            const prevDt = dd.previousElementSibling;
            if (prevDt && prevDt.tagName === 'DT') {
              label = prevDt.textContent.trim();
            }
          }
        }

        element.label = label;
        const detection = detectFieldType(element);

        try {
          if (detection.type === 'prefecture' || detection.type === 'city' || detection.type === 'address' || detection.type === 'addressWithoutPref') {
            if (element.tagName.toLowerCase() === 'select') {
              const options = element.options;
              for (let i = 0; i < options.length; i++) {
                const optionText = options[i].textContent.trim();
                const optionValue = options[i].value;
                if (optionText === detection.value || optionText.includes(detection.value) || optionValue === detection.value) {
                  element.selectedIndex = i;
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                  filledFields.push({ type: detection.type, label: label || element.name, value: detection.value });
                  break;
                }
              }
            } else {
              element.value = detection.value;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              filledFields.push({ type: detection.type, label: label || element.name, value: detection.value });
            }
          }
          else if (detection.type !== 'other' && detection.value && element.type !== 'checkbox' && element.type !== 'radio' && element.tagName.toLowerCase() !== 'select') {
            element.value = detection.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: detection.type, label: label || element.name, value: detection.value });
          }
          else if (element.type === 'checkbox' && detection.type === 'agreement') {
            element.checked = true;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: detection.type, label: label || element.name, value: 'checked' });
          }
        } catch (e) {}
      });

      return { filledCount: filledFields.length, filledFields };
    }, SENDER_INFO);

    console.log(`✅ 入力完了: ${result.filledCount}項目\n`);
    if (result.filledFields.length > 0) {
      result.filledFields.forEach(field => {
        const displayValue = field.value && field.value.length > 30 ? field.value.substring(0, 30) + '...' : field.value;
        console.log(`   - ${field.type}: "${field.label}" → "${displayValue}"`);
      });
    }

    await new Promise(r => setTimeout(r, 2000));
    await browser.close();

    return {
      name: form.name,
      url: form.url,
      status: '成功',
      filled: result.filledCount,
      fields: result.filledFields
    };

  } catch (error) {
    console.error(`❌ エラー: ${error.message}\n`);
    await browser.close();
    return {
      name: form.name,
      url: form.url,
      status: 'エラー',
      filled: 0,
      error: error.message
    };
  }
}

(async () => {
  const results = [];

  for (let i = 0; i < FORMS_TO_TEST.length; i++) {
    const result = await testForm(FORMS_TO_TEST[i], i);
    results.push(result);
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 テスト結果サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   状態: ${result.status} | 入力項目数: ${result.filled}項目`);
    if (result.fields && result.fields.length > 0) {
      console.log(`   入力内容:`);
      result.fields.forEach(field => {
        const displayValue = field.value && field.value.length > 20 ? field.value.substring(0, 20) + '...' : field.value;
        console.log(`      • ${field.type}: "${field.label}" → "${displayValue}"`);
      });
    }
    console.log('');
  });

  const successCount = results.filter(r => r.status === '成功').length;
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ 成功: ${successCount}/${results.length}フォーム (${Math.round(successCount/results.length*100)}%)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
})();
