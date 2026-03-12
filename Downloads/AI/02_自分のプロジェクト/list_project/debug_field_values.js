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
  { name: '中川税理士事務所', url: 'https://nakagawa-firm.com/inquiry/' },
  { name: 'アイネックス税理士法人', url: 'https://business.form-mailer.jp/fms/4d1a7ba5267478' },
  { name: '税理士法人SHIP', url: 'https://www.ship-ac.jp/contact' },
  { name: 'ＦＵＮ税理士法人', url: 'https://www.yama-cpa.com/contact/' },
  { name: 'りんく税理士法人', url: 'https://www.taxlink.jp/contact/' },
  { name: '税理士 小林誉光事務所', url: 'https://www.kobayashi-tax-accountant.com/contact/' },
  { name: 'みらい会計税理士法人', url: 'https://www.miraikaikei.or.jp/contact/' }
];

async function testFormWithValues(form) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ${form.name}`);
  console.log(`🔗 ${form.url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(form.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // test_complete_10_forms.js と同じロジックでフォーム入力
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

        // 会社名（貴社、貴殿も含む）
        if (allText.match(/company|会社|法人|屋号|corp|貴社|貴殿/)) {
          return { type: 'company', value: SENDER_INFO.company };
        }

        // メールアドレス
        if (type === 'email' || allText.match(/mail|メール/)) {
          return { type: 'email', value: SENDER_INFO.email };
        }

        // 電話番号
        if (allText.match(/tel1|phone1|電話1/)) return { type: 'tel1', value: SENDER_INFO.tel1 };
        if (allText.match(/tel2|phone2|電話2/)) return { type: 'tel2', value: SENDER_INFO.tel2 };
        if (allText.match(/tel3|phone3|電話3/)) return { type: 'tel3', value: SENDER_INFO.tel3 };
        if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) {
          return { type: 'tel', value: SENDER_INFO.tel };
        }

        // 郵便番号
        if (allText.match(/zip|postal|郵便|〒/)) return { type: 'zip', value: SENDER_INFO.zip };

        // 住所
        if (allText.match(/prefecture|都道府県/)) return { type: 'prefecture', value: SENDER_INFO.prefecture };
        if (allText.match(/address|住所/)) return { type: 'address', value: SENDER_INFO.address };

        // 業種
        if (allText.match(/industry|業種|職種/)) return { type: 'industry', value: SENDER_INFO.industry };

        // お問合せ内容
        if (element.tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) {
          return { type: 'message', value: SENDER_INFO.message };
        }

        // ふりがな（分離）
        if (label.match(/^セイ$|^せい$/) || (allText.match(/kana.*head|head.*kana|last.*kana|lastnamekana|せい.*かな/) && !allText.match(/会社|法人|姓名/))) {
          return { type: 'lastNameKana', value: SENDER_INFO.lastNameKana };
        }
        if (label.match(/^メイ$|^めい$/) || (allText.match(/kana.*body|body.*kana|first.*kana|firstnamekana|めい.*かな/) && !allText.match(/会社|法人|姓名|氏名|お名前/))) {
          return { type: 'firstNameKana', value: SENDER_INFO.firstNameKana };
        }
        if (allText.match(/kana|かな|ふりがな|フリガナ/) && !allText.match(/会社|法人/)) {
          return { type: 'fullNameKana', value: SENDER_INFO.fullNameKana };
        }

        // 姓名（分離）
        if (label.match(/^姓$|^苗字$/) || (allText.match(/lastname|last_name|name.*head|姓(?!.*名)|苗字/) && !allText.match(/会社|法人|かな|kana|ふりがな/))) {
          return { type: 'lastName', value: SENDER_INFO.lastName };
        }
        if (label.match(/^名$/) || (allText.match(/firstname|first_name|name.*body|名(?!.*姓)(?!前)/) && !allText.match(/会社|法人|氏名|お名前|代表|担当|貴社|貴殿|かな|kana|ふりがな/))) {
          return { type: 'firstName', value: SENDER_INFO.firstName };
        }

        // フルネーム（name_last, name_first, name.*head, name.*body, みょうじも除外）
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ/)) {
          return { type: 'fullName', value: SENDER_INFO.fullName };
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

        const fieldInfo = {
          tagName: element.tagName.toLowerCase(),
          type: element.type || 'text',
          name: element.name || '',
          id: element.id || '',
          placeholder: element.placeholder || '',
          label: label
        };

        const detection = detectFieldType(fieldInfo);

        if (detection.type !== 'other' && detection.value && fieldInfo.type !== 'checkbox' && fieldInfo.type !== 'radio' && fieldInfo.tagName !== 'select') {
          element.value = detection.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filledFields.push({
            label: fieldInfo.label || fieldInfo.name || fieldInfo.id,
            detectedType: detection.type,
            filledValue: detection.value
          });
        }
      });

      return filledFields;
    }, SENDER_INFO);

    if (result.length > 0) {
      console.log(`✅ 入力完了: ${result.length}項目\n`);

      // 「法人」「事業所」を含むフィールドで「森田憲治」が入力されているものを探す
      const problematicFields = result.filter(field =>
        (field.label.includes('法人') || field.label.includes('事業所') || field.label.includes('会社')) &&
        field.filledValue === '森田憲治'
      );

      if (problematicFields.length > 0) {
        console.log('⚠️  問題発見！会社名フィールドに個人名が入力されています:\n');
        problematicFields.forEach(field => {
          console.log(`   ❌ ${field.label}: "${field.filledValue}" (検出タイプ: ${field.detectedType})`);
        });
        console.log('');
      }

      result.forEach(field => {
        const icon = field.filledValue === '森田憲治' && (field.label.includes('法人') || field.label.includes('事業所') || field.label.includes('会社')) ? '❌' : '✓';
        console.log(`   ${icon} ${field.label}: ${field.filledValue} (${field.detectedType})`);
      });

      console.log('\n⏰ 10秒間確認できます...');
      await new Promise(r => setTimeout(r, 10000));
    }

    await browser.close();
  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    await browser.close();
  }
}

(async () => {
  for (const form of FORMS_TO_TEST) {
    await testFormWithValues(form);
  }
  console.log('\n✅ デバッグ完了！');
})();
