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
  { name: '税理士法人山岸会計', url: 'https://www.zyamagishi.jp/form/zeirishihouzin-yamagishi/contact' },
  { name: '糸井会計事務所', url: 'https://v-spirits.com/impression' },
  { name: '森田税理士・社労士事務所', url: 'https://m-zj.com/contact/contact.html' }
];

function detectFieldType(element, SENDER_INFO) {
  const name = (element.name || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const label = (element.label || '').toLowerCase();
  const type = element.type || '';
  const tagName = element.tagName || '';

  const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

  // 優先順位1: 会社名
  if (allText.match(/company|会社|法人|屋号|corp/)) {
    return { type: 'company', value: SENDER_INFO.company };
  }

  // 優先順位2: メールアドレス
  if (type === 'email' || allText.match(/mail|メール/)) {
    return { type: 'email', value: SENDER_INFO.email };
  }

  // 優先順位3: 電話番号（分離）
  if (allText.match(/tel1|phone1|電話1/)) {
    return { type: 'tel1', value: SENDER_INFO.tel1 };
  }
  if (allText.match(/tel2|phone2|電話2/)) {
    return { type: 'tel2', value: SENDER_INFO.tel2 };
  }
  if (allText.match(/tel3|phone3|電話3/)) {
    return { type: 'tel3', value: SENDER_INFO.tel3 };
  }
  if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) {
    return { type: 'tel', value: SENDER_INFO.tel };
  }

  // 優先順位4: 郵便番号（分離）
  if (allText.match(/zip1|postal1|郵便.*1|〒1/)) {
    return { type: 'zip1', value: SENDER_INFO.zip1 };
  }
  if (allText.match(/zip2|postal2|郵便.*2|〒2/)) {
    return { type: 'zip2', value: SENDER_INFO.zip2 };
  }
  if (allText.match(/zip|postal|郵便|〒/)) {
    return { type: 'zip', value: SENDER_INFO.zip };
  }

  // 優先順位5: 住所
  if (allText.match(/address|住所|番地/)) {
    return { type: 'address', value: SENDER_INFO.address };
  }
  if (allText.match(/prefecture|都道府県/)) {
    return { type: 'prefecture', value: SENDER_INFO.prefecture };
  }
  if (allText.match(/city|市区町村/)) {
    return { type: 'city', value: SENDER_INFO.city };
  }

  // 優先順位6: 業種
  if (allText.match(/industry|業種|職種/)) {
    return { type: 'industry', value: SENDER_INFO.industry };
  }

  // 優先順位7: お問合せ種別（selectやradio）
  if ((tagName === 'select' || type === 'radio') &&
      (allText.match(/種別|type|区分|項目|カテゴリ|category|attendance|aggregation/) || name.match(/inquiry|問.*合.*種別/))) {
    return { type: 'inquiryType', value: 'other' };
  }

  // 優先順位8: お問合せ内容
  if (tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) {
    return { type: 'message', value: SENDER_INFO.message };
  }

  // 優先順位8.5: お問合せ方法チェックボックス
  if (type === 'checkbox' && allText.match(/連絡|contact|method|方法/)) {
    return { type: 'contactType', value: true };
  }

  // 優先順位8.6: サービス・希望のチェックボックスグループ
  if (type === 'checkbox' && name.match(/service|希望|サービス/)) {
    return { type: 'serviceType', value: true };
  }

  // 優先順位9: ふりがな（分離）- 名前より先にチェック
  if (allText.match(/kana.*head|head.*kana|last.*kana|せい.*かな|みょうじ.*かな/) && !allText.match(/会社|法人/)) {
    return { type: 'lastNameKana', value: SENDER_INFO.lastNameKana };
  }
  if (allText.match(/kana.*body|body.*kana|first.*kana|めい.*かな/) && !allText.match(/会社|法人|氏名|お名前/)) {
    return { type: 'firstNameKana', value: SENDER_INFO.firstNameKana };
  }
  if (allText.match(/kana|かな|ふりがな|フリガナ/) && !allText.match(/会社|法人/)) {
    return { type: 'fullNameKana', value: SENDER_INFO.fullNameKana };
  }

  // 優先順位10: 姓名（分離）
  if (allText.match(/namehead|head|last.*name|sei|surname|姓|苗字|みょうじ/) && !allText.match(/かな|kana|ふりがな|フリガナ|会社|法人/)) {
    return { type: 'lastName', value: SENDER_INFO.lastName };
  }
  if (allText.match(/namebody|body|first.*name|mei|given|名/) && !allText.match(/かな|kana|ふりがな|フリガナ|会社|法人|氏名|お名前/)) {
    return { type: 'firstName', value: SENDER_INFO.firstName };
  }

  // 優先順位11: 姓名（一括）
  if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/かな|kana|ふりがな|フリガナ|会社|法人|corp/)) {
    return { type: 'fullName', value: SENDER_INFO.fullName };
  }

  // 優先順位12: 同意チェックボックス
  if (type === 'checkbox' && allText.match(/同意|承諾|確認|agree|accept|privacy|policy/)) {
    return { type: 'agreement', value: true };
  }

  return { type: 'other', value: '' };
}

async function testForm(form) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ${form.name}`);
  console.log(`🔗 ${form.url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(form.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フォームフィールドをチェック
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

        const isRequired = element.required ||
                          element.getAttribute('aria-required') === 'true' ||
                          label.includes('必須') ||
                          label.includes('*') ||
                          label.includes('※');

        result.push({
          type: element.type || element.tagName.toLowerCase(),
          tagName: element.tagName.toLowerCase(),
          name: element.name || '',
          id: element.id || '',
          placeholder: element.placeholder || '',
          label: label,
          required: isRequired
        });
      });

      return result;
    });

    console.log(`📊 フィールド数: ${allFields.length}個`);
    const required = allFields.filter(f => f.required);
    console.log(`📊 必須フィールド: ${required.length}個`);

    if (required.length > 0) {
      console.log('\n必須フィールド:');
      required.forEach((f, i) => {
        console.log(`   ${i + 1}. [${f.type}] ${f.label} (name: ${f.name})`);
      });
    }

    // フォーム入力テスト
    console.log('\n📝 フォーム入力テスト開始...\n');

    const filledCount = await page.evaluate((allFields, SENDER_INFO) => {
      let filled = 0;

      // detectFieldType関数を定義
      function detectFieldType(element, SENDER_INFO) {
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const label = (element.label || '').toLowerCase();
        const type = element.type || '';
        const tagName = element.tagName || '';

        const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

        if (allText.match(/company|会社|法人|屋号|corp/)) return { type: 'company', value: SENDER_INFO.company };
        if (type === 'email' || allText.match(/mail|メール/)) return { type: 'email', value: SENDER_INFO.email };
        if (allText.match(/tel1|phone1|電話1/)) return { type: 'tel1', value: SENDER_INFO.tel1 };
        if (allText.match(/tel2|phone2|電話2/)) return { type: 'tel2', value: SENDER_INFO.tel2 };
        if (allText.match(/tel3|phone3|電話3/)) return { type: 'tel3', value: SENDER_INFO.tel3 };
        if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) return { type: 'tel', value: SENDER_INFO.tel };
        if (allText.match(/zip1|postal1|郵便.*1|〒1/)) return { type: 'zip1', value: SENDER_INFO.zip1 };
        if (allText.match(/zip2|postal2|郵便.*2|〒2/)) return { type: 'zip2', value: SENDER_INFO.zip2 };
        if (allText.match(/zip|postal|郵便|〒/)) return { type: 'zip', value: SENDER_INFO.zip };
        if (allText.match(/address|住所|番地/)) return { type: 'address', value: SENDER_INFO.address };
        if (allText.match(/prefecture|都道府県/)) return { type: 'prefecture', value: SENDER_INFO.prefecture };
        if (allText.match(/city|市区町村/)) return { type: 'city', value: SENDER_INFO.city };
        if (allText.match(/industry|業種|職種/)) return { type: 'industry', value: SENDER_INFO.industry };
        if ((tagName === 'select' || type === 'radio') &&
            (allText.match(/種別|type|区分|項目|カテゴリ|category|attendance|aggregation/) || name.match(/inquiry|問.*合.*種別/))) {
          return { type: 'inquiryType', value: 'other' };
        }
        if (tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) {
          return { type: 'message', value: SENDER_INFO.message };
        }
        if (type === 'checkbox' && allText.match(/連絡|contact|method|方法/)) return { type: 'contactType', value: true };
        if (type === 'checkbox' && name.match(/service|希望|サービス/)) return { type: 'serviceType', value: true };
        if (allText.match(/kana.*head|head.*kana|last.*kana|せい.*かな|みょうじ.*かな/) && !allText.match(/会社|法人/)) {
          return { type: 'lastNameKana', value: SENDER_INFO.lastNameKana };
        }
        if (allText.match(/kana.*body|body.*kana|first.*kana|めい.*かな/) && !allText.match(/会社|法人|氏名|お名前/)) {
          return { type: 'firstNameKana', value: SENDER_INFO.firstNameKana };
        }
        if (allText.match(/kana|かな|ふりがな|フリガナ/) && !allText.match(/会社|法人/)) {
          return { type: 'fullNameKana', value: SENDER_INFO.fullNameKana };
        }
        if (allText.match(/namehead|head|last.*name|sei|surname|姓|苗字|みょうじ/) && !allText.match(/かな|kana|ふりがな|フリガナ|会社|法人/)) {
          return { type: 'lastName', value: SENDER_INFO.lastName };
        }
        if (allText.match(/namebody|body|first.*name|mei|given|名/) && !allText.match(/かな|kana|ふりがな|フリガナ|会社|法人|氏名|お名前/)) {
          return { type: 'firstName', value: SENDER_INFO.firstName };
        }
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/かな|kana|ふりがな|フリガナ|会社|法人|corp/)) {
          return { type: 'fullName', value: SENDER_INFO.fullName };
        }
        if (type === 'checkbox' && allText.match(/同意|承諾|確認|agree|accept|privacy|policy/)) {
          return { type: 'agreement', value: true };
        }

        return { type: 'other', value: '' };
      }

      const elements = document.querySelectorAll('input, textarea, select');
      const processedCheckboxGroups = new Set();
      const processedRadioGroups = new Set();

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

        const fieldInfo = {
          tagName: element.tagName.toLowerCase(),
          type: element.type || 'text',
          name: element.name || '',
          id: element.id || '',
          placeholder: element.placeholder || '',
          label: label,
          required: isRequired
        };

        const detection = detectFieldType(fieldInfo, SENDER_INFO);

        // 通常のフィールド
        if (detection.type !== 'other' && detection.value &&
            fieldInfo.type !== 'checkbox' && fieldInfo.type !== 'radio' && fieldInfo.tagName !== 'select') {
          element.value = detection.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          const preview = typeof detection.value === 'string' && detection.value.length > 30
            ? detection.value.substring(0, 30) + '...'
            : detection.value;
          console.log(`   ✓ [${detection.type}] ${fieldInfo.label || fieldInfo.name}: ${preview}`);
          filled++;
        }
        // 同意チェックボックス
        else if (fieldInfo.type === 'checkbox' && detection.type === 'agreement') {
          element.checked = true;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`   ✓ [agreement] ${fieldInfo.label}`);
          filled++;
        }
        // その他のチェックボックス（contactType, serviceType）
        else if (fieldInfo.type === 'checkbox' && (detection.type === 'contactType' || detection.type === 'serviceType')) {
          const groupKey = `${detection.type}-${element.name}`;
          if (!processedCheckboxGroups.has(groupKey)) {
            processedCheckboxGroups.add(groupKey);

            const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${element.name}"]`);
            let checked = false;
            let firstCheckbox = null;
            let firstLabel = '';

            checkboxes.forEach(cb => {
              let cbLabel = '';
              if (cb.id) {
                const labelElement = document.querySelector(`label[for="${cb.id}"]`);
                if (labelElement) cbLabel = labelElement.textContent.trim();
              }
              if (!cbLabel) {
                const parentLabel = cb.closest('label');
                if (parentLabel) cbLabel = parentLabel.textContent.trim();
              }

              if (!firstCheckbox) {
                firstCheckbox = cb;
                firstLabel = cbLabel;
              }

              if (cbLabel.match(/その他|other/i) && !checked) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`   ✓ [${detection.type}] ${cbLabel}`);
                filled++;
                checked = true;
              }
            });

            if (!checked && firstCheckbox) {
              firstCheckbox.checked = true;
              firstCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
              console.log(`   ✓ [${detection.type}] ${firstLabel || '最初の選択肢'}`);
              filled++;
            }
          }
        }
        // お問合せ種別のselect
        else if (fieldInfo.tagName === 'select' && detection.type === 'inquiryType') {
          const options = Array.from(element.options);
          let selected = false;

          for (const option of options) {
            if (option.value && option.text.match(/その他|other/i)) {
              element.value = option.value;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              console.log(`   ✓ [inquiryType] ${fieldInfo.label}: ${option.text}`);
              filled++;
              selected = true;
              break;
            }
          }

          if (!selected && options.length > 1) {
            const firstValidOption = options.find(opt => opt.value);
            if (firstValidOption) {
              element.value = firstValidOption.value;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              console.log(`   ✓ [inquiryType] ${fieldInfo.label}: ${firstValidOption.text}`);
              filled++;
            }
          }
        }
        // 検出できなかった必須フィールドのデフォルト値入力
        else if (fieldInfo.required) {
          if (fieldInfo.type === 'text' || fieldInfo.tagName === 'textarea') {
            element.value = '特になし';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`   ✓ [default] ${fieldInfo.label || fieldInfo.name}: 特になし`);
            filled++;
          }
          else if (fieldInfo.tagName === 'select') {
            const options = Array.from(element.options);
            let selected = false;

            for (const option of options) {
              if (option.value && option.text.match(/その他|other/i)) {
                element.value = option.value;
                element.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`   ✓ [default-select] ${fieldInfo.label}: ${option.text}`);
                filled++;
                selected = true;
                break;
              }
            }

            if (!selected && options.length > 1) {
              const firstValidOption = options.find(opt => opt.value);
              if (firstValidOption) {
                element.value = firstValidOption.value;
                element.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`   ✓ [default-select] ${fieldInfo.label}: ${firstValidOption.text}`);
                filled++;
              }
            }
          }
          else if (fieldInfo.type === 'radio') {
            const groupKey = `radio-${element.name}`;
            if (!processedRadioGroups.has(groupKey)) {
              processedRadioGroups.add(groupKey);

              const radios = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
              let checked = false;
              let firstRadio = null;
              let firstLabel = '';

              radios.forEach(radio => {
                let radioLabel = '';
                if (radio.id) {
                  const labelElement = document.querySelector(`label[for="${radio.id}"]`);
                  if (labelElement) radioLabel = labelElement.textContent.trim();
                }
                if (!radioLabel) {
                  const parentLabel = radio.closest('label');
                  if (parentLabel) radioLabel = parentLabel.textContent.trim();
                }

                if (!firstRadio) {
                  firstRadio = radio;
                  firstLabel = radioLabel;
                }

                if (radioLabel.match(/その他|other/i) && !checked) {
                  radio.checked = true;
                  radio.dispatchEvent(new Event('change', { bubbles: true }));
                  console.log(`   ✓ [default-radio] ${radioLabel}`);
                  filled++;
                  checked = true;
                }
              });

              if (!checked && firstRadio) {
                firstRadio.checked = true;
                firstRadio.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`   ✓ [default-radio] ${firstLabel || '最初の選択肢'}`);
                filled++;
              }
            }
          }
        }
      });

      return filled;
    }, allFields, SENDER_INFO);

    console.log(`\n✅ 入力完了: ${filledCount}項目`);

    console.log('\n⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

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
