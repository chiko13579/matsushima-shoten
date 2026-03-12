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
  { name: '三輪厚二税理士事務所', url: 'https://www.zeirishi-miwa.co.jp/toiawase.html' },
  { name: '税理士法人 新納会計事務所', url: 'https://www.shinnou.net/form/sinnnou/form01' },
  { name: '笘原拓人税理士事務所', url: 'https://t-taxfirm.com/contact/' },
  { name: '税理士法人コモンズ', url: 'https://e-tax24.jp/form/' },
  { name: '税理士法人ミライト・パートナーズ', url: 'https://www.milight.co.jp/service/' },
  { name: '大沢会計事務所', url: 'https://www.osawakaikei.jp/category/2001265.html' },
  { name: '石田雄二税理士事務所', url: 'https://www.kaikeisanbo.com/contact/' },
  { name: '新橋税理士法人', url: 'https://shinbashitax.tokyo/contact' },
  { name: '白川浩平税理士事務所', url: 'https://shirakawa-office.com/inquiry/' },
  { name: '松尾友平税理士事務所', url: 'https://www.matsuo-tax.com/contact' }
];

async function testForm(form, index) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ${index + 1}/10: ${form.name}`);
  console.log(`🔗 ${form.url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(form.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フィールド数を取得
    const fieldCount = await page.evaluate(() => {
      const elements = document.querySelectorAll('input, textarea, select');
      let count = 0;
      elements.forEach(el => {
        if (el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button') {
          count++;
        }
      });
      return count;
    });

    console.log(`📊 フィールド数: ${fieldCount}個`);

    if (fieldCount === 0) {
      console.log('❌ フォームが見つかりませんでした\n');
      await browser.close();
      return { name: form.name, status: 'フォームなし', filled: 0 };
    }

    // フォーム入力（auto_contact_sender.jsと同じロジック）
    const result = await page.evaluate((SENDER_INFO) => {
      const filledFields = [];
      const elements = document.querySelectorAll('input, textarea, select');
      const processedCheckboxGroups = new Set();
      const processedRadioGroups = new Set();

      // detectFieldType関数
      function detectFieldType(element) {
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const label = (element.label || '').toLowerCase();
        const type = element.type || '';
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

        if ((element.tagName === 'select' || type === 'radio') &&
            (allText.match(/種別|type|区分|項目|カテゴリ|category/) || name.match(/inquiry|問.*合.*種別/))) {
          return { type: 'inquiryType', value: 'other' };
        }

        if (element.tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) {
          return { type: 'message', value: SENDER_INFO.message };
        }

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

        if (allText.match(/namehead|head|last.*name|姓|苗字|みょうじ/) && !allText.match(/かな|kana|ふりがな|フリガナ|会社|法人/)) {
          return { type: 'lastName', value: SENDER_INFO.lastName };
        }
        if (allText.match(/namebody|body|first.*name|名/) && !allText.match(/かな|kana|ふりがな|フリガナ|会社|法人|氏名|お名前/)) {
          return { type: 'firstName', value: SENDER_INFO.firstName };
        }

        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp/)) {
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

        const isRequired = element.required ||
          element.getAttribute('aria-required') === 'true' ||
          label.includes('必須') ||
          label.includes('*') ||
          label.includes('※');

        const fieldInfo = {
          tagName: element.tagName.toLowerCase(),
          type: element.type || 'text',
          name: element.name || '',
          label: label,
          required: isRequired
        };

        const detection = detectFieldType(fieldInfo);

        try {
          // 通常フィールド
          if (detection.type !== 'other' && detection.value &&
              fieldInfo.type !== 'checkbox' && fieldInfo.type !== 'radio' && fieldInfo.tagName !== 'select') {
            element.value = detection.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: detection.type });
          }
          // 同意チェックボックス
          else if (fieldInfo.type === 'checkbox' && detection.type === 'agreement') {
            element.checked = true;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'agreement' });
          }
          // 未検出のチェックボックスグループ
          else if (fieldInfo.type === 'checkbox' && element.name && !processedCheckboxGroups.has(element.name)) {
            const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${element.name}"]`);
            if (checkboxes.length > 1) {
              let isGroupRequired = false;
              let hasInquiryKeywords = false;
              const labels = [];

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
                labels.push(cbLabel);

                if (cbLabel.match(/創業|経営|資金|自計化|節税|贈与|相続|事業承継|助言|改善|対策|設立|システム|金融/)) {
                  hasInquiryKeywords = true;
                }
                if (cb.required || cb.getAttribute('aria-required') === 'true') {
                  isGroupRequired = true;
                }
              });

              // 親要素から必須チェック
              const firstCheckbox = checkboxes[0];
              if (firstCheckbox && firstCheckbox.parentElement) {
                let parent = firstCheckbox.parentElement;
                for (let i = 0; i < 5; i++) {
                  if (!parent) break;
                  const parentText = parent.textContent || '';
                  if (parentText.match(/必須|\*|※/) && parentText.length < 500) {
                    isGroupRequired = true;
                    break;
                  }
                  parent = parent.parentElement;
                }
              }

              if (isGroupRequired || hasInquiryKeywords) {
                processedCheckboxGroups.add(element.name);
                let checked = false;

                for (let i = 0; i < checkboxes.length; i++) {
                  if (labels[i].match(/その他|other|ご意見|要望/i) && !checked) {
                    checkboxes[i].checked = true;
                    checkboxes[i].dispatchEvent(new Event('change', { bubbles: true }));
                    filledFields.push({ type: 'checkbox-group' });
                    checked = true;
                    break;
                  }
                }

                if (!checked && checkboxes[0]) {
                  checkboxes[0].checked = true;
                  checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
                  filledFields.push({ type: 'checkbox-group' });
                }
              }
            }
          }
          // 未検出のラジオボタングループ
          else if (fieldInfo.type === 'radio' && element.name && !processedRadioGroups.has(element.name)) {
            const radios = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
            if (radios.length > 1) {
              let isGroupRequired = false;
              const labels = [];

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
                labels.push(radioLabel);

                if (radio.required || radio.getAttribute('aria-required') === 'true') {
                  isGroupRequired = true;
                }
              });

              // 親要素から必須チェック
              const firstRadio = radios[0];
              if (firstRadio && firstRadio.parentElement) {
                let parent = firstRadio.parentElement;
                for (let i = 0; i < 5; i++) {
                  if (!parent) break;
                  const parentText = parent.textContent || '';
                  if (parentText.match(/必須|\*|※/) && parentText.length < 500) {
                    isGroupRequired = true;
                    break;
                  }
                  parent = parent.parentElement;
                }
              }

              if (isGroupRequired) {
                processedRadioGroups.add(element.name);
                let selectedRadio = null;

                for (let i = 0; i < radios.length; i++) {
                  if (!selectedRadio) selectedRadio = radios[i];
                  if (labels[i].match(/その他|other/i)) {
                    selectedRadio = radios[i];
                    break;
                  }
                }

                if (selectedRadio) {
                  selectedRadio.checked = true;
                  selectedRadio.dispatchEvent(new Event('change', { bubbles: true }));
                  filledFields.push({ type: 'radio-group' });
                }
              }
            }
          }
          // select (inquiryType)
          else if (detection.type === 'inquiryType' && fieldInfo.tagName === 'select') {
            const options = element.options;
            let selectedIndex = -1;
            for (let i = 0; i < options.length; i++) {
              if (options[i].value && !options[i].textContent.match(/選択|select|choose/i)) {
                selectedIndex = i;
                if (options[i].textContent.match(/その他|other/i)) break;
              }
            }
            if (selectedIndex !== -1) {
              element.selectedIndex = selectedIndex;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              filledFields.push({ type: 'inquiryType' });
            }
          }
          // 必須selectボックス
          else if (fieldInfo.required && fieldInfo.tagName === 'select') {
            const options = element.options;
            let selectedIndex = -1;
            for (let i = 0; i < options.length; i++) {
              if (options[i].value && !options[i].textContent.match(/選択|select|choose/i)) {
                selectedIndex = i;
                if (options[i].textContent.match(/その他|other/i)) break;
              }
            }
            if (selectedIndex !== -1) {
              element.selectedIndex = selectedIndex;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              filledFields.push({ type: 'required-select' });
            }
          }
          // 必須テキスト
          else if (fieldInfo.required && (fieldInfo.type === 'text' || fieldInfo.tagName === 'textarea')) {
            element.value = '特になし';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'required-text' });
          }
        } catch (e) {
          // エラーは無視
        }
      });

      return filledFields.length;
    }, SENDER_INFO);

    console.log(`✅ 入力完了: ${result}項目\n`);

    // 10秒待機
    await new Promise(r => setTimeout(r, 10000));

    await browser.close();
    return { name: form.name, status: '成功', filled: result };

  } catch (error) {
    console.error(`❌ エラー: ${error.message}\n`);
    await browser.close();
    return { name: form.name, status: 'エラー', filled: 0, error: error.message };
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

  results.forEach((r, i) => {
    const status = r.status === '成功' ? '✅' : r.status === 'フォームなし' ? '⚠️' : '❌';
    console.log(`${i + 1}. ${status} ${r.name}: ${r.filled}項目入力 (${r.status})`);
  });

  const success = results.filter(r => r.status === '成功').length;
  console.log(`\n成功: ${success}/${results.length}`);
  console.log('\n✅ 全テスト完了！（送信なし）');
})();
