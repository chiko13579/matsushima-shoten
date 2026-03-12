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
  { name: '小野孝義税理士事務所', url: 'https://www.onotax.jp/good#page_contact' },
  { name: 'アイネックス税理士法人', url: 'https://business.form-mailer.jp/fms/4d1a7ba5267478' },
  { name: '税理士法人SHIP', url: 'https://www.ship-ac.jp/contact' },
  { name: 'ＦＵＮ税理士法人', url: 'https://www.yama-cpa.com/contact/' },
  { name: 'いなほ会計', url: 'https://www.inahokaikei.com/inquiry/' },
  { name: '濱田会計事務所', url: 'https://www.mikagecpa.com/archives/news/9314/' },
  { name: 'りんく税理士法人', url: 'https://www.taxlink.jp/contact/' },
  { name: '税理士 小林誉光事務所', url: 'https://www.kobayashi-tax-accountant.com/contact/' },
  { name: 'みらい会計税理士法人', url: 'https://www.miraikaikei.or.jp/contact/' }
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

    // 営業禁止チェック
    const pageText = await page.evaluate(() => document.body.innerText || '');
    const noSalesPatterns = [
      /営業.*ご遠慮/,
      /営業.*お断り/,
      /営業.*禁止/,
      /営業.*NG/,
      /営業.*ng/,
      /営業.*遠慮/,
      /セールス.*お断り/,
      /セールス.*禁止/,
      /セールス.*NG/
    ];

    for (const pattern of noSalesPatterns) {
      if (pattern.test(pageText)) {
        console.log(`⚠️  営業お断り検出: ${pattern.source}`);
        console.log(`❌ スキップしました\n`);
        await browser.close();
        return { name: form.name, status: '営業お断り', filled: 0, pattern: pattern.source };
      }
    }

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

    // auto_contact_sender.jsの最新ロジックでフォーム入力
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

        // 会社名（貴社、貴殿、組織も含む）
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
        if (allText.match(/zip|postal|郵便|〒/)) return { type: 'zip', value: SENDER_INFO.zip };

        // 住所（name属性による特定パターンを優先検出）
        if (name === 'state' || name === 'state_1') {
          return { type: 'prefecture', value: SENDER_INFO.prefecture };
        }
        if (name === 'address_1') {
          // 都道府県を除いた住所（市区町村+番地）
          const addressWithoutPref = SENDER_INFO.address.replace(SENDER_INFO.prefecture, '').trim();
          return { type: 'addressWithoutPref', value: addressWithoutPref };
        }
        if (name === 'building' || name === 'building_1') {
          return { type: 'building', value: SENDER_INFO.building || '' };
        }

        // 住所
        if (allText.match(/prefecture|都道府県/)) return { type: 'prefecture', value: SENDER_INFO.prefecture };
        if (allText.match(/address|住所/)) return { type: 'address', value: SENDER_INFO.address };

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

        // お問合せ内容（textareaかつキーワードマッチ、または明確なキーワード）
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

        // フルネーム（name_last, name_first, name.*head, name.*body, みょうじ、組織、部署も除外）
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
        // テーブル構造の場合、tr内のth要素からラベルを取得
        if (!label) {
          const tr = element.closest('tr');
          if (tr) {
            const th = tr.querySelector('th');
            if (th) label = th.textContent.trim();
          }
        }
        // dt/dd構造の場合、dd内の要素の前のdt要素からラベルを取得
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
          // チェックボックスグループ（未検出・必須）
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

                if (cbLabel.match(/創業|経営|資金|自計化|節税|贈与|相続|事業承継/)) hasInquiryKeywords = true;
                if (cb.required || cb.getAttribute('aria-required') === 'true') isGroupRequired = true;
              });

              // 親要素から必須チェック
              if (checkboxes[0] && checkboxes[0].parentElement) {
                let parent = checkboxes[0].parentElement;
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
          // ラジオボタングループ（未検出・必須）
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

                if (radio.required || radio.getAttribute('aria-required') === 'true') isGroupRequired = true;
              });

              // 親要素から必須チェック
              if (radios[0] && radios[0].parentElement) {
                let parent = radios[0].parentElement;
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
          // select (prefecture/address/addressWithoutPref)
          else if ((detection.type === 'prefecture' || detection.type === 'address' || detection.type === 'addressWithoutPref') && fieldInfo.tagName === 'select') {
            const options = element.options;
            for (let i = 0; i < options.length; i++) {
              const optionText = options[i].textContent.trim();
              const optionValue = options[i].value;
              if (optionText === detection.value || optionText.includes(detection.value) || optionValue === detection.value) {
                element.selectedIndex = i;
                element.dispatchEvent(new Event('change', { bubbles: true }));
                filledFields.push({ type: detection.type });
                break;
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
          // 必須select
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
    const status =
      r.status === '成功' ? '✅' :
      r.status === '営業お断り' ? '⚠️' :
      r.status === 'フォームなし' ? '⚠️' : '❌';
    console.log(`${i + 1}. ${status} ${r.name}: ${r.filled}項目入力 (${r.status})`);
    if (r.pattern) console.log(`   パターン: ${r.pattern}`);
  });

  const success = results.filter(r => r.status === '成功').length;
  const blocked = results.filter(r => r.status === '営業お断り').length;
  console.log(`\n成功: ${success}/${results.length}`);
  console.log(`営業お断りでスキップ: ${blocked}/${results.length}`);
  console.log('\n✅ 全テスト完了！（送信なし）');
})();
