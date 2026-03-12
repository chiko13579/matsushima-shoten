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
  { name: '税理士法人ベリーベスト', url: 'https://vs-group.jp/tax/lp/column/contact/' },
  { name: 'ゆびすい税理士法人', url: 'https://www.yubisui.co.jp/contact/' },
  { name: '税理士法人チェスター', url: 'https://chester-tax.com/contact.html' },
  { name: 'AGS税理士法人', url: 'https://www.ags-tax.or.jp/contact/' },
  { name: '辻・本郷税理士法人', url: 'https://www.ht-tax.or.jp/contact/' },
  { name: '税理士法人レガシィ', url: 'https://www.legacy.ne.jp/contact/' },
  { name: '税理士法人山田&パートナーズ', url: 'https://www.yamada-partners.jp/contact/' },
  { name: '税理士法人東京シティ税理士事務所', url: 'https://www.tokyocity.co.jp/contact/' },
  { name: '税理士法人優和', url: 'https://www.yuwa.or.jp/contact/' },
  { name: '税理士法人ネイチャー', url: 'https://nature-r.or.jp/contact/' }
];

async function testForm(form, index) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ${index + 21}. ${form.name}`);
  console.log(`🔗 ${form.url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(form.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フォーム入力（最新のロジック）
    const result = await page.evaluate((SENDER_INFO) => {
      const filledFields = [];
      const elements = document.querySelectorAll('input, textarea, select');
      const processedCheckboxGroups = new Set();
      const processedRadioGroups = new Set();

      function detectFieldType(element) {
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const label = element.label || '';
        const type = element.type || '';
        const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

        // 会社名
        if (allText.match(/company|会社|法人|屋号|corp|貴社|貴殿|組織|organization/)) {
          return { type: 'company', value: SENDER_INFO.company };
        }

        // メールアドレス
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

        // 電話番号（一般的なパターン）
        if (allText.match(/tel1|phone1|電話1/)) return { type: 'tel1', value: SENDER_INFO.tel1 };
        if (allText.match(/tel2|phone2|電話2/)) return { type: 'tel2', value: SENDER_INFO.tel2 };
        if (allText.match(/tel3|phone3|電話3/)) return { type: 'tel3', value: SENDER_INFO.tel3 };
        if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) {
          return { type: 'tel', value: SENDER_INFO.tel };
        }

        // 郵便番号
        if (allText.match(/zip1|postal1|郵便1/) || (allText.match(/zip|postal|郵便/) && allText.match(/1|前/))) {
          return { type: 'zip1', value: SENDER_INFO.zip1 };
        }
        if (allText.match(/zip2|postal2|郵便2/) || (allText.match(/zip|postal|郵便/) && allText.match(/2|後/))) {
          return { type: 'zip2', value: SENDER_INFO.zip2 };
        }
        if (allText.match(/zip|postal|郵便|〒/)) {
          return { type: 'zip', value: SENDER_INFO.zip };
        }

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

        // 住所（都道府県、市区町村、番地）
        if (allText.match(/都道府県|prefecture|pref/)) {
          return { type: 'prefecture', value: SENDER_INFO.prefecture };
        }
        if (allText.match(/市区町村|city/) || (allText.match(/住所/) && allText.match(/1|市|区|町|村/))) {
          return { type: 'city', value: SENDER_INFO.city };
        }
        if (allText.match(/番地|町名|street|block/) || (allText.match(/住所/) && allText.match(/2|3|詳細/))) {
          return { type: 'street', value: SENDER_INFO.street };
        }
        if (allText.match(/住所|address/) && !allText.match(/mail|メール/)) {
          return { type: 'address', value: SENDER_INFO.address };
        }

        // 業種
        if (allText.match(/industry|業種|職種/)) return { type: 'industry', value: SENDER_INFO.industry };

        // お問合せ種別
        if ((element.tagName === 'select' || type === 'radio') &&
            (allText.match(/種別|type|区分|項目|カテゴリ/) || name.match(/inquiry/))) {
          return { type: 'inquiryType', value: 'other' };
        }

        // 弊社を知ったきっかけ
        if (allText.match(/きっかけ|know.*about|heard.*about|how.*hear|how.*find|referral/)) {
          return { type: 'referralSource', value: '検索' };
        }

        // お問合せ内容
        if ((element.tagName === 'textarea' && allText.match(/問.*合|相談|詳細|内容|ご質問|ご相談|message|inquiry/)) ||
            allText.match(/お問.*合.*内容|ご相談.*内容|message.*content|inquiry.*detail/)) {
          return { type: 'message', value: SENDER_INFO.message };
        }

        // サービスチェックボックス
        if (type === 'checkbox' && name.match(/service|希望|サービス/)) {
          return { type: 'serviceType', value: true };
        }

        // ふりがな（分離）
        if (label.match(/^セイ$|^せい$/) || (allText.match(/kana.*head|head.*kana|last.*kana|lastnamekana|せい.*かな/) && !allText.match(/会社|法人|姓名/))) {
          return { type: 'lastNameKana', value: SENDER_INFO.lastNameKana };
        }
        if (label.match(/^メイ$|^めい$/) || (allText.match(/kana.*body|body.*kana|first.*kana|firstnamekana|めい.*かな/) && !allText.match(/会社|法人|姓名|氏名|お名前/))) {
          return { type: 'firstNameKana', value: SENDER_INFO.firstNameKana };
        }
        if (allText.match(/kana|かな|ふりがな|フリガナ/) && !allText.match(/会社|法人|社名|屋号|組織|corp/)) {
          return { type: 'fullNameKana', value: SENDER_INFO.fullNameKana };
        }

        // placeholderが全てひらがな → ふりがな
        if (placeholder && placeholder.match(/^[ぁ-ん\s　]+$/)) {
          return { type: 'fullNameKana', value: SENDER_INFO.fullNameKana };
        }

        // 姓名（分離）
        if (label.match(/^姓$|^苗字$/) || (allText.match(/lastname|last_name|name.*head|姓(?!.*名)|苗字/) && !allText.match(/会社|法人|かな|kana|ふりがな/))) {
          return { type: 'lastName', value: SENDER_INFO.lastName };
        }
        if (label.match(/^名$/) || (allText.match(/firstname|first_name|name.*body|body.*name|name.*first|first.*name|名(?!.*姓)(?!前)/) && !allText.match(/会社|法人|氏名|お名前|代表|担当|貴社|貴殿|ビル|マンション|building|mansion|かな|kana|ふりがな/))) {
          return { type: 'firstName', value: SENDER_INFO.firstName };
        }

        // フルネーム（部署も除外）
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|組織|department|部署|部門|所属|division/)) {
          return { type: 'fullName', value: SENDER_INFO.fullName };
        }

        // 同意チェックボックス
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

        const isRequired = element.required ||
          element.getAttribute('aria-required') === 'true' ||
          label.includes('必須') ||
          label.includes('*') ||
          label.includes('※');

        const fieldInfo = {
          tagName: element.tagName.toLowerCase(),
          type: element.type || 'text',
          name: element.name || '',
          id: element.id || '',
          placeholder: element.placeholder || '',
          label: label,
          required: isRequired
        };

        element.label = label;
        const detection = detectFieldType(fieldInfo);

        try {
          // 住所フィールド処理
          if (detection.type === 'prefecture' || detection.type === 'city' || detection.type === 'street' || detection.type === 'address' || detection.type === 'addressWithoutPref') {
            if (fieldInfo.tagName === 'select') {
              const options = element.options;
              for (let i = 0; i < options.length; i++) {
                const optionText = options[i].textContent.trim();
                const optionValue = options[i].value;
                if (optionText === detection.value || optionText.includes(detection.value) || optionValue === detection.value) {
                  element.selectedIndex = i;
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                  filledFields.push({ type: detection.type, label: label || element.name });
                  break;
                }
              }
            } else {
              element.value = detection.value;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              filledFields.push({ type: detection.type, label: label || element.name });
            }
          }
          // 通常フィールド
          else if (detection.type !== 'other' && detection.value &&
              fieldInfo.type !== 'checkbox' && fieldInfo.type !== 'radio' && fieldInfo.tagName !== 'select') {
            element.value = detection.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: detection.type, label: label || element.name });
          }
          // 同意チェックボックス
          else if (fieldInfo.type === 'checkbox' && detection.type === 'agreement') {
            element.checked = true;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: detection.type, label: label || element.name });
          }
        } catch (e) {
          // エラーは無視
        }
      });

      return { filledCount: filledFields.length, filledFields };
    }, SENDER_INFO);

    console.log(`✅ 入力完了: ${result.filledCount}項目`);
    if (result.filledFields.length > 0) {
      result.filledFields.forEach(field => {
        console.log(`   - ${field.type}: ${field.label}`);
      });
    }
    console.log('');

    console.log('⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));
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
  console.log('📊 テスト結果サマリー (21-30)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach((result, index) => {
    console.log(`${index + 21}. ${result.name}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   状態: ${result.status}`);
    console.log(`   入力項目数: ${result.filled}項目`);
    if (result.fields && result.fields.length > 0) {
      console.log(`   入力内容:`);
      result.fields.forEach(field => {
        console.log(`      - ${field.type}: ${field.label}`);
      });
    }
    console.log('');
  });

  const successCount = results.filter(r => r.status === '成功').length;
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`成功: ${successCount}/${results.length}フォーム (${Math.round(successCount/results.length*100)}%)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
})();
