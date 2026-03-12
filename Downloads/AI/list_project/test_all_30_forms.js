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
  // 1-10
  { name: '税理士 小林誉光事務所', url: 'https://www.kobayashi-tax-accountant.com/contact/' },
  { name: '税理士法人エム・エム・アイ', url: 'https://www.mmisouzoku.com/form/' },
  { name: 'アイネックス税理士法人', url: 'https://www.ainex-tac.com/contact/' },
  { name: '前川秀和税理士事務所', url: 'https://www.hidekazu-tax.com/contact/' },
  { name: 'フューチャーマネジメント税理士事務所', url: 'https://fm-tax.com/contact/' },
  { name: 'みつい税理士事務所', url: 'https://www.office-mitsui.jp/contact/' },
  { name: '税理士法人パートナーズ', url: 'https://www.p-office.gr.jp/contact/' },
  { name: 'みんなの会計事務所', url: 'https://www.minnano-k.com/contact/' },
  { name: 'Y&Partners会計事務所', url: 'https://www.yandpartners.jp/contact/' },
  { name: '山本聡一郎税理士事務所', url: 'https://www.office-yamamoto.gr.jp/contact/' },

  // 11-20
  { name: '税理士法人テラス', url: 'https://trc-tax.com/contact' },
  { name: '税理士法人 トップ', url: 'https://www.top-zeirishi.net/form/top-zeirishinet/inquiry' },
  { name: 'PlusA税理士法人', url: 'https://plusa-inc.jp/contact/' },
  { name: 'P&H税理士事務所', url: 'https://takatsuki-sogyo.com/page-31' },
  { name: '吉田一仁税理士事務所', url: 'https://tax.yoshidakazuhito.net/contact' },
  { name: '税理士法人山下会計事務所', url: 'https://www.heart-y.com/contact/' },
  { name: 'ソルト総合会計事務所', url: 'https://salt-cpa.com/contact/' },
  { name: 'ミカタ税理士法人', url: 'https://mikata-c.co.jp/contact.html' },
  { name: 'ビジョナリー会計事務所', url: 'https://www.yamamoto-tax.jp/form/' },
  { name: '税理士法人総和', url: 'https://www.m-partners.jp/flow/' },

  // 21-30
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
  console.log(`📋 ${index + 1}. ${form.name}`);
  console.log(`🔗 ${form.url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(form.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const result = await page.evaluate((SENDER_INFO) => {
      const filledFields = [];
      const zipFields = []; // 郵便番号フィールドを一時保存
      const nameFieldGroups = {}; // 名前フィールドグループを一時保存
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
        if (allText.match(/tel1|phone1|電話1/)) return { type: 'tel1', value: SENDER_INFO.tel1 };
        if (allText.match(/tel2|phone2|電話2/)) return { type: 'tel2', value: SENDER_INFO.tel2 };
        if (allText.match(/tel3|phone3|電話3/)) return { type: 'tel3', value: SENDER_INFO.tel3 };
        if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) {
          return { type: 'tel', value: SENDER_INFO.tel };
        }
        // 郵便番号（name属性による特定パターンを優先検出）
        if (name.match(/frontzipcode|zip_1|zip1|postal_1|postal1/)) {
          return { type: 'zip1', value: SENDER_INFO.zip1 };
        }
        if (name.match(/backzipcode|zip_2|zip2|postal_2|postal2/)) {
          return { type: 'zip2', value: SENDER_INFO.zip2 };
        }
        // 郵便番号（一般的なパターン、バリエーション追加）
        if (allText.match(/zip1|postal1|郵便1|〒1/) || (allText.match(/zip|postal|郵便|〒/) && allText.match(/1|前|上/))) {
          return { type: 'zip1', value: SENDER_INFO.zip1 };
        }
        if (allText.match(/zip2|postal2|郵便2|〒2/) || (allText.match(/zip|postal|郵便|〒/) && allText.match(/2|後|下/))) {
          return { type: 'zip2', value: SENDER_INFO.zip2 };
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
        if (name === 'building' || name === 'building_1') {
          return { type: 'building', value: SENDER_INFO.building || '' };
        }
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
        if (allText.match(/industry|業種|職種/)) return { type: 'industry', value: SENDER_INFO.industry };
        if ((element.tagName === 'select' || type === 'radio') &&
            (allText.match(/種別|type|区分|項目|カテゴリ/) || name.match(/inquiry/))) {
          return { type: 'inquiryType', value: 'other' };
        }
        if (allText.match(/きっかけ|know.*about|heard.*about|how.*hear|how.*find|referral/)) {
          return { type: 'referralSource', value: '検索' };
        }
        // 問い合わせ内容 - ただしチェックボックスは除外
        if (((element.tagName === 'textarea' && allText.match(/問.*合|相談|詳細|内容|ご質問|ご相談|message|inquiry/)) ||
            allText.match(/お問.*合.*内容|ご相談.*内容|message.*content|inquiry.*detail/)) && type !== 'checkbox' && type !== 'radio') {
          return { type: 'message', value: SENDER_INFO.message };
        }
        if (type === 'checkbox' && name.match(/service|希望|サービス/)) {
          return { type: 'serviceType', value: true };
        }
        // ふりがな（日本語優先、バリエーション追加）
        if (allText.match(/kana|かな|ふりがな|フリガナ/) && !allText.match(/会社|法人|社名|屋号|組織|corp/)) {
          return { type: 'nameKanaGroup', value: SENDER_INFO.fullNameKana }; // グループとして扱う
        }
        if (placeholder && placeholder.match(/^[ぁ-ん\s　]+$/)) {
          return { type: 'nameKanaGroup', value: SENDER_INFO.fullNameKana }; // グループとして扱う
        }

        // 氏名（日本語優先、バリエーション追加）
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|組織|department|部署|部門|所属|division/)) {
          return { type: 'nameGroup', value: SENDER_INFO.fullName }; // グループとして扱う
        }
        if (type === 'checkbox' && allText.match(/同意|承諾|accept|agree|privacy|個人情報/)) {
          return { type: 'agreement', value: true };
        }

        return { type: 'other', value: '' };
      }

      elements.forEach(element => {
        if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

        let label = '';

        // プレースホルダーやaria-labelを最優先で確認
        if (element.placeholder && element.placeholder.trim()) {
          label = element.placeholder.trim();
        }
        if (!label && element.getAttribute('aria-label')) {
          label = element.getAttribute('aria-label').trim();
        }

        // フィールドの直前の兄弟要素をチェック（「姓」「名」などのテキスト）
        if (!label) {
          let prevSibling = element.previousElementSibling;
          if (prevSibling && (prevSibling.tagName === 'SPAN' || prevSibling.tagName === 'DIV' || prevSibling.tagName === 'LABEL')) {
            const text = prevSibling.textContent.trim();
            if (text && text.length < 20) {  // 短いテキストのみ（ラベルとして妥当）
              label = text;
            }
          }
        }

        // 通常のラベル取得
        if (!label && element.id) {
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

        // 必須項目の判定
        const isRequired = element.required ||
                          element.hasAttribute('required') ||
                          element.getAttribute('aria-required') === 'true' ||
                          label.includes('*') ||
                          label.includes('＊') ||
                          label.includes('※') ||
                          label.includes('必須') ||
                          label.includes('Required');

        element.isRequired = isRequired;
        const detection = detectFieldType(element);

        // 郵便番号フィールドは後で位置情報を使って判定するため、一旦保存
        if (detection.type === 'zip' || detection.type === 'zip1' || detection.type === 'zip2') {
          zipFields.push({ element, detection, label });
          return;
        }

        // 名前フィールドグループは後で数を判定するため、一旦保存
        if (detection.type === 'nameGroup') {
          const groupKey = label || 'name'; // ラベルでグループ化
          if (!nameFieldGroups[groupKey]) nameFieldGroups[groupKey] = [];
          nameFieldGroups[groupKey].push({ element, detection, label, fieldType: 'name' });
          return;
        }

        // ふりがなフィールドグループは後で数を判定するため、一旦保存
        if (detection.type === 'nameKanaGroup') {
          const groupKey = label || 'kana'; // ラベルでグループ化
          if (!nameFieldGroups[groupKey]) nameFieldGroups[groupKey] = [];
          nameFieldGroups[groupKey].push({ element, detection, label, fieldType: 'kana' });
          return;
        }

        try {
          if (detection.type === 'prefecture' || detection.type === 'city' || detection.type === 'street' || detection.type === 'address' || detection.type === 'addressWithoutPref') {
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
          // 必須のselectボックス（未マッチの場合）
          else if (detection.type === 'other' && element.isRequired && element.tagName.toLowerCase() === 'select') {
            const options = element.options;
            let selectedIndex = -1;
            let foundOther = false;

            // 「その他」を優先的に探す
            for (let i = 0; i < options.length; i++) {
              const optionText = options[i].textContent.trim();
              const optionValue = options[i].value;

              // 空の選択肢や「選択してください」系はスキップ
              if (!optionValue || optionText.match(/選択|select|choose|--/i)) continue;

              // 有効な選択肢を記憶（まだ記憶していない場合のみ）
              if (selectedIndex === -1 && !foundOther) selectedIndex = i;

              // 「その他」が含まれていたら優先（部分一致）
              if (optionText.includes('その他') || optionText.toLowerCase().includes('other')) {
                selectedIndex = i;
                foundOther = true;
                break;
              }
            }

            if (selectedIndex !== -1) {
              element.selectedIndex = selectedIndex;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              const selectedText = options[selectedIndex].textContent.trim();
              filledFields.push({ type: 'required-select', label: label || element.name, value: selectedText });
            }
          }
          // 必須のチェックボックスグループ（未マッチの場合、「その他」を優先的にチェック）
          else if (detection.type === 'other' && element.isRequired && element.type === 'checkbox') {
            const checkboxName = element.name;
            const checkboxGroup = document.querySelectorAll(`input[type="checkbox"][name="${checkboxName}"]`);

            // このグループで既にチェック済みか確認
            let alreadyChecked = false;
            checkboxGroup.forEach(cb => {
              if (cb.checked) alreadyChecked = true;
            });

            // 複数のチェックボックスがある必須グループでは「その他」を選択
            if (!alreadyChecked && checkboxGroup.length > 1) {
              let selectedCheckbox = null;
              let foundOther = false;

              // 「その他」を優先的に探す
              checkboxGroup.forEach(cb => {
                const cbLabel = cb.label || '';
                const cbId = cb.id || '';
                const cbValue = cb.value || '';
                const allText = `${cbLabel} ${cbId} ${cbValue}`;

                // 最初の有効な選択肢を記憶（まだ記憶していない場合のみ）
                if (!selectedCheckbox && !foundOther) selectedCheckbox = cb;

                // 「その他」が含まれていたら優先（部分一致）
                if (allText.includes('その他') || allText.toLowerCase().includes('other')) {
                  selectedCheckbox = cb;
                  foundOther = true;
                  return;
                }
              });

              if (selectedCheckbox) {
                selectedCheckbox.checked = true;
                selectedCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                const cbLabel = selectedCheckbox.label || selectedCheckbox.value || 'checked';
                filledFields.push({ type: 'required-checkbox', label: label || checkboxName, value: cbLabel });
              }
            }
          }
          // 必須のラジオボタン（未マッチの場合）
          else if (detection.type === 'other' && element.isRequired && element.type === 'radio') {
            const radioName = element.name;
            const radioGroup = document.querySelectorAll(`input[type="radio"][name="${radioName}"]`);

            // このグループで既にチェック済みか確認
            let alreadyChecked = false;
            radioGroup.forEach(radio => {
              if (radio.checked) alreadyChecked = true;
            });

            // まだチェックされていない場合
            if (!alreadyChecked) {
              let selectedRadio = null;
              let foundOther = false;

              // 「その他」を優先的に探す
              radioGroup.forEach(radio => {
                const radioLabel = radio.label || '';
                const radioId = radio.id || '';
                const radioValue = radio.value || '';
                const allText = `${radioLabel} ${radioId} ${radioValue}`;

                // 最初の有効な選択肢を記憶（まだ記憶していない場合のみ）
                if (!selectedRadio && !foundOther) selectedRadio = radio;

                // 「その他」が含まれていたら優先（部分一致）
                if (allText.includes('その他') || allText.toLowerCase().includes('other')) {
                  selectedRadio = radio;
                  foundOther = true;
                  return;
                }
              });

              if (selectedRadio) {
                selectedRadio.checked = true;
                selectedRadio.dispatchEvent(new Event('change', { bubbles: true }));
                filledFields.push({ type: 'required-radio', label: label || radioName, value: selectedRadio.value || 'checked' });
              }
            }
          }
        } catch (e) {}
      });

      // 郵便番号フィールドを位置情報（x座標）で判定して入力
      if (zipFields.length > 0) {
        // 位置情報を取得してソート
        const zipFieldsWithPosition = zipFields.map(field => {
          const rect = field.element.getBoundingClientRect();
          return { ...field, x: rect.x };
        }).sort((a, b) => a.x - b.x); // x座標でソート（左→右）

        // 2つ以上ある場合、左側をzip1、右側をzip2として扱う
        if (zipFieldsWithPosition.length >= 2) {
          // 左側（最初）をzip1
          const leftField = zipFieldsWithPosition[0];
          leftField.element.value = SENDER_INFO.zip1;
          leftField.element.dispatchEvent(new Event('input', { bubbles: true }));
          leftField.element.dispatchEvent(new Event('change', { bubbles: true }));
          filledFields.push({ type: 'zip1', label: leftField.label || leftField.element.name, value: SENDER_INFO.zip1 });

          // 右側（2番目）をzip2
          const rightField = zipFieldsWithPosition[1];
          rightField.element.value = SENDER_INFO.zip2;
          rightField.element.dispatchEvent(new Event('input', { bubbles: true }));
          rightField.element.dispatchEvent(new Event('change', { bubbles: true }));
          filledFields.push({ type: 'zip2', label: rightField.label || rightField.element.name, value: SENDER_INFO.zip2 });
        }
        // 1つしかない場合、完全な郵便番号を入力
        else if (zipFieldsWithPosition.length === 1) {
          const field = zipFieldsWithPosition[0];
          field.element.value = SENDER_INFO.zip;
          field.element.dispatchEvent(new Event('input', { bubbles: true }));
          field.element.dispatchEvent(new Event('change', { bubbles: true }));
          filledFields.push({ type: 'zip', label: field.label || field.element.name, value: SENDER_INFO.zip });
        }
      }

      // 名前フィールドグループを処理（位置情報で判定）
      Object.keys(nameFieldGroups).forEach(groupKey => {
        const group = nameFieldGroups[groupKey];

        // 位置情報（x座標）を取得してソート
        const fieldsWithPosition = group.map(field => {
          const rect = field.element.getBoundingClientRect();
          return { ...field, x: rect.x };
        }).sort((a, b) => a.x - b.x); // x座標でソート（左→右）

        // 2つのフィールドがある場合、左を姓/セイ、右を名/メイとして扱う
        if (fieldsWithPosition.length >= 2) {
          const leftField = fieldsWithPosition[0];
          const rightField = fieldsWithPosition[1];

          if (leftField.fieldType === 'name') {
            // 名前フィールドの場合
            leftField.element.value = SENDER_INFO.lastName;
            leftField.element.dispatchEvent(new Event('input', { bubbles: true }));
            leftField.element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'lastName', label: leftField.label || leftField.element.name, value: SENDER_INFO.lastName });

            rightField.element.value = SENDER_INFO.firstName;
            rightField.element.dispatchEvent(new Event('input', { bubbles: true }));
            rightField.element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'firstName', label: rightField.label || rightField.element.name, value: SENDER_INFO.firstName });
          } else if (leftField.fieldType === 'kana') {
            // ふりがなフィールドの場合
            leftField.element.value = SENDER_INFO.lastNameKana;
            leftField.element.dispatchEvent(new Event('input', { bubbles: true }));
            leftField.element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'lastNameKana', label: leftField.label || leftField.element.name, value: SENDER_INFO.lastNameKana });

            rightField.element.value = SENDER_INFO.firstNameKana;
            rightField.element.dispatchEvent(new Event('input', { bubbles: true }));
            rightField.element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'firstNameKana', label: rightField.label || rightField.element.name, value: SENDER_INFO.firstNameKana });
          }
        }
        // 1つのフィールドしかない場合、フルネームを入力
        else if (fieldsWithPosition.length === 1) {
          const field = fieldsWithPosition[0];
          if (field.fieldType === 'name') {
            field.element.value = SENDER_INFO.fullName;
            field.element.dispatchEvent(new Event('input', { bubbles: true }));
            field.element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'fullName', label: field.label || field.element.name, value: SENDER_INFO.fullName });
          } else if (field.fieldType === 'kana') {
            field.element.value = SENDER_INFO.fullNameKana;
            field.element.dispatchEvent(new Event('input', { bubbles: true }));
            field.element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'fullNameKana', label: field.label || field.element.name, value: SENDER_INFO.fullNameKana });
          }
        }
      });

      return { filledCount: filledFields.length, filledFields };
    }, SENDER_INFO);

    console.log(`✅ 入力完了: ${result.filledCount}項目`);
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

  console.log('\n\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 全30フォーム テスト結果サマリー');
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
