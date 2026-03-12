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
  subject: '2日で納品49800円のホームページのお知らせ',
  message: `お世話になっております。
「あなたのおかげデザイン」の森田と申します。

テスト送信です。`
};

const FORMS_TO_TEST = [
  // 6-15 (次の10フォーム)
  { name: 'みつい税理士事務所', url: 'https://www.office-mitsui.jp/contact/' },
  { name: '税理士法人パートナーズ', url: 'https://www.p-office.gr.jp/contact/' },
  { name: 'みんなの会計事務所', url: 'https://www.minnano-k.com/contact/' },
  { name: 'Y&Partners会計事務所', url: 'https://www.yandpartners.jp/contact/' },
  { name: '山本聡一郎税理士事務所', url: 'https://www.office-yamamoto.gr.jp/contact/' },
  { name: '税理士法人テラス', url: 'https://trc-tax.com/contact' },
  { name: '税理士法人 トップ', url: 'https://www.top-zeirishi.net/form/top-zeirishinet/inquiry' },
  { name: 'PlusA税理士法人', url: 'https://plusa-inc.jp/contact/' },
  { name: 'P&H税理士事務所', url: 'https://takatsuki-sogyo.com/page-31' },
  { name: '吉田一仁税理士事務所', url: 'https://tax.yoshidakazuhito.net/contact' }
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
        const className = (element.className || '').toLowerCase();
        const allText = `${name} ${id} ${placeholder} ${label} ${className}`.toLowerCase();

        // 会社名（日本語優先、バリエーション追加）
        if (allText.match(/会社|法人|屋号|貴社|御社|社名|事業者|団体名|organization|company|corp/) && !allText.match(/ふりがな|フリガナ|かな|kana|よみ/)) {
          return { type: 'company', value: SENDER_INFO.company };
        }

        // メールアドレス（日本語優先、バリエーション追加）
        if (allText.match(/メール|eメール|e-mail|mail|アドレス/) || type === 'email') {
          return { type: 'email', value: SENDER_INFO.email };
        }
        // 電話番号（日本語優先、バリエーション追加）
        if (name.match(/tel1|phone1/) || name === 'tel1_1') {
          return { type: 'tel1', value: SENDER_INFO.tel1 };
        }
        if (name.match(/tel2|phone2/) || name === 'tel2_1') {
          return { type: 'tel2', value: SENDER_INFO.tel2 };
        }
        if (name.match(/tel3|phone3/) || name === 'tel3_1') {
          return { type: 'tel3', value: SENDER_INFO.tel3 };
        }
        if (allText.match(/電話|℡|tel|phone|携帯|ケータイ|連絡先|ご連絡/) || type === 'tel') {
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
        if (allText.match(/郵便|postal|zip|〒|ゆうびん/) && !allText.match(/mail|メール/)) {
          return { type: 'zip', value: SENDER_INFO.zip };
        }
        // 住所関連（name属性による特定パターンを優先）
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

        // 住所関連（日本語での判断、バリエーション追加）
        if (allText.match(/都道府県|県名|prefecture|pref/) && !allText.match(/市|区|町|村|番地|建物|ビル|マンション/)) {
          return { type: 'prefecture', value: SENDER_INFO.prefecture };
        }
        // 「市区町村以下」のパターン（市区町村 + 番地を結合）
        if (allText.match(/市区町村.*以下|市町村.*以下/) || (allText.match(/市区町村|市町村/) && allText.match(/以下|いか/))) {
          const cityAndStreet = `${SENDER_INFO.city}${SENDER_INFO.street}`;
          return { type: 'cityAndStreet', value: cityAndStreet };
        }
        if (allText.match(/市区町村|市町村|区市町村/) || (allText.match(/住所|所在/) && (label.match(/市|区|町|村/) || placeholder.match(/市|区|町|村/)))) {
          return { type: 'city', value: SENDER_INFO.city };
        }
        if (allText.match(/番地|丁目|町名|地番/) || (allText.match(/住所|所在/) && (label.match(/番地|丁目/) || placeholder.match(/番地|丁目/)))) {
          return { type: 'street', value: SENDER_INFO.street };
        }
        if (allText.match(/建物|ビル|マンション|アパート|物件/) || (allText.match(/住所|所在/) && (label.match(/建物|ビル|マンション/) || placeholder.match(/建物|ビル|マンション/)))) {
          return { type: 'building', value: SENDER_INFO.building || '' };
        }
        if (allText.match(/住所|所在地|address|ご住所/) && !allText.match(/mail|メール|都道府県|市区町村|番地|建物/)) {
          return { type: 'address', value: SENDER_INFO.address };
        }
        // 件名（タイトル）- 必須の場合のみ入力
        if (allText.match(/件名|タイトル|題名|subject|title/) && !allText.match(/問い合わせ|お問合せ|内容|詳細/) && allText.match(/必須|required|\*|※/)) {
          return { type: 'subject', value: SENDER_INFO.subject };
        }
        // 問い合わせ内容（日本語優先、バリエーション追加）- ただしチェックボックスは除外
        if ((element.tagName === 'textarea' || allText.match(/問い合わせ|お問合せ|お問い合わせ|ご相談|相談内容|お問合せ内容|質問|ご質問|詳細|備考|要件|用件|message|inquiry|comment|detail/)) && type !== 'checkbox' && type !== 'radio') {
          return { type: 'message', value: SENDER_INFO.message };
        }

        // ふりがな（すべてnameKanaGroupとして検出し、後でフィールド数で判定）
        if (allText.match(/ふりがな|フリガナ|かな|カナ|よみがな|読み仮名|ヨミガナ|^セイ$|^メイ$|^せい$|^めい$/) && !allText.match(/会社|法人|社名|屋号|組織/)) {
          return { type: 'nameKanaGroup', value: SENDER_INFO.fullNameKana };
        }
        if (placeholder && placeholder.match(/^[ぁ-ん\s　]+$/)) {
          return { type: 'nameKanaGroup', value: SENDER_INFO.fullNameKana };
        }

        // 氏名（すべてnameGroupとして検出し、後でフィールド数で判定）
        if (allText.match(/お名前|氏名|名前|ご氏名|ご担当|代表者|担当者|your.*name|^姓$|^名$/) && !allText.match(/会社|法人|貴社|組織|部署|部門|所属|件名/)) {
          return { type: 'nameGroup', value: SENDER_INFO.fullName };
        }
        // 同意チェックボックス（日本語優先、バリエーション追加）
        if (type === 'checkbox' && allText.match(/同意|承諾|了承|確認|個人情報|プライバシー|利用規約|terms|privacy|agree|accept|consent/)) {
          return { type: 'agreement', value: true };
        }

        return { type: 'other', value: '' };
      }

      elements.forEach(element => {
        if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

        let label = '';
        let subLabel = ''; // 「姓」「名」などのサブラベル用

        // フィールドの直前の兄弟要素をチェック（「姓」「名」などのサブラベル）
        // input要素が続く場合はスキップして、その前のテキスト要素を探す
        let prevSibling = element.previousElementSibling;
        for (let i = 0; i < 3 && prevSibling; i++) {
          if (['SPAN', 'DIV', 'LABEL', 'P'].includes(prevSibling.tagName)) {
            const text = prevSibling.textContent.trim();
            if (text && text.length < 20) {
              subLabel = text;
              break;
            }
          }
          // input/select/textareaの場合は、その前の要素をチェック
          if (['INPUT', 'SELECT', 'TEXTAREA'].includes(prevSibling.tagName)) {
            prevSibling = prevSibling.previousElementSibling;
            continue;
          }
          break;
        }

        // 親要素の直前の兄弟要素もチェック（フィールドがdivでラップされている場合）
        if (!subLabel) {
          const parent = element.parentElement;
          if (parent) {
            let parentPrevSibling = parent.previousElementSibling;
            for (let i = 0; i < 3 && parentPrevSibling; i++) {
              if (['SPAN', 'DIV', 'LABEL', 'P'].includes(parentPrevSibling.tagName)) {
                const text = parentPrevSibling.textContent.trim();
                if (text && text.length < 20) {
                  subLabel = text;
                  break;
                }
              }
              if (['INPUT', 'SELECT', 'TEXTAREA'].includes(parentPrevSibling.tagName) || parentPrevSibling.querySelector('input, select, textarea')) {
                parentPrevSibling = parentPrevSibling.previousElementSibling;
                continue;
              }
              break;
            }
          }
        }

        // 通常のラベル取得（親要素のテキストを優先）
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

        // 親の親要素を辿ってラベルを探す（「ご担当者」「お名前」などのセクションラベル）
        if (!label) {
          let parent = element.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const firstChild = parent.firstElementChild;
            if (firstChild &&
                !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(firstChild.tagName) &&
                firstChild !== element &&
                firstChild.textContent.trim().length > 0 &&
                firstChild.textContent.trim().length < 100) {
              const text = firstChild.textContent.trim();
              if (!text.startsWith('例）') && !text.startsWith('例)')) {
                label = text;
                break;
              }
            }
            const parentPrevSibling = parent.previousElementSibling;
            if (parentPrevSibling && parentPrevSibling.textContent) {
              const text = parentPrevSibling.textContent.trim();
              if (text.length > 0 && text.length < 100 && !text.startsWith('例）') && !text.startsWith('例)')) {
                label = text;
                break;
              }
            }
            parent = parent.parentElement;
          }
        }

        // プレースホルダーやaria-label（ラベルがない場合のフォールバック）
        if (!label && element.placeholder && element.placeholder.trim()) {
          label = element.placeholder.trim();
        }
        if (!label && element.getAttribute('aria-label')) {
          label = element.getAttribute('aria-label').trim();
        }

        // サブラベルがある場合は追加（「姓」「名」など）
        // ベースラベル：ラベルの末尾から「姓」「名」「セイ」「メイ」などを除去してグループ化用のキーを作成
        let baseLabel = label.replace(/[\s　]*(姓|名|セイ|メイ|せい|めい)[\s　]*$/g, '').trim();
        if (subLabel && !label.includes(subLabel)) {
          label = `${label} ${subLabel}`.trim();
        }

        element.label = label;
        element.baseLabel = baseLabel; // グループ化用にベースラベルを保持（姓/名を除去済み）

        // 必須項目の判定（JavaScript検証パターンも追加）
        const className = element.className || '';

        // 親要素の周辺テキストも確認（ラジオボタン/チェックボックスのグループラベル用）
        let parentText = '';
        let parent = element.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const parentClassName = parent.className || '';
          const parentInnerText = parent.textContent || '';
          // 短いテキストのみ確認（長すぎるとページ全体になる）
          if (parentInnerText.length < 200) {
            parentText = parentInnerText;
          }
          if (parentClassName.includes('required') || parentClassName.includes('必須')) {
            parentText += ' 必須';
            break;
          }
          parent = parent.parentElement;
        }

        const isRequired = element.required ||
                          element.hasAttribute('required') ||
                          element.getAttribute('aria-required') === 'true' ||
                          element.getAttribute('aria-invalid') === 'true' ||
                          className.includes('required') ||
                          className.includes('必須') ||
                          className.includes('validate') ||
                          label.includes('*') ||
                          label.includes('＊') ||
                          label.includes('※') ||
                          label.includes('必須') ||
                          label.includes('Required') ||
                          parentText.includes('必須') ||
                          parentText.includes('Required');

        element.isRequired = isRequired;
        const detection = detectFieldType(element);

        // 郵便番号フィールドは後で位置情報を使って判定するため、一旦保存
        if (detection.type === 'zip' || detection.type === 'zip1' || detection.type === 'zip2') {
          zipFields.push({ element, detection, label });
          return;
        }

        // 名前フィールドグループは後で数を判定するため、一旦保存
        if (detection.type === 'nameGroup') {
          const groupKey = element.baseLabel || 'name'; // ベースラベルでグループ化（「姓」「名」を除いた部分）
          if (!nameFieldGroups[groupKey]) nameFieldGroups[groupKey] = [];
          nameFieldGroups[groupKey].push({ element, detection, label, fieldType: 'name' });
          return;
        }

        // ふりがなフィールドグループは後で数を判定するため、一旦保存
        if (detection.type === 'nameKanaGroup') {
          const groupKey = element.baseLabel || 'kana'; // ベースラベルでグループ化
          if (!nameFieldGroups[groupKey]) nameFieldGroups[groupKey] = [];
          nameFieldGroups[groupKey].push({ element, detection, label, fieldType: 'kana' });
          return;
        }

        // 名前・メール・お問合せ内容以外は必須の場合のみ入力
        const alwaysFillTypes = ['email', 'lastName', 'firstName', 'fullName', 'lastNameKana', 'firstNameKana', 'fullNameKana', 'message'];
        if (!alwaysFillTypes.includes(detection.type) && !element.isRequired) {
          return; // 必須でない場合はスキップ
        }

        try {
          if (detection.type === 'prefecture' || detection.type === 'city' || detection.type === 'cityAndStreet' || detection.type === 'address' || detection.type === 'addressWithoutPref') {
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

      // 名前フィールドグループを処理（ラベル内の「姓」「名」を優先、なければ位置情報で判定）
      Object.keys(nameFieldGroups).forEach(groupKey => {
        const group = nameFieldGroups[groupKey];

        // 位置情報を取得し、最もページ上部に近いフィールドのみを対象にする
        const allFields = group.map(field => {
          const rect = field.element.getBoundingClientRect();
          const style = window.getComputedStyle(field.element);
          const isVisible = rect.width > 0 && rect.height > 0 &&
                           style.display !== 'none' &&
                           style.visibility !== 'hidden' &&
                           style.opacity !== '0' &&
                           !field.element.disabled &&
                           !field.element.readOnly;
          return { ...field, x: rect.x, y: rect.y, isVisible };
        }).filter(f => f.isVisible);

        // 最もy座標が小さい（ページ上部）フィールドを基準に、近いものだけをグループ化
        if (allFields.length === 0) return;
        const minY = Math.min(...allFields.map(f => f.y));
        const fieldsWithPosition = allFields
          .filter(f => Math.abs(f.y - minY) < 200) // 最上部から200px以内のフィールドのみ
          .sort((a, b) => a.x - b.x); // x座標でソート（左→右）

        // 2つのフィールドがある場合、x座標で左=姓、右=名として処理（日本語フォームの標準配置）
        if (fieldsWithPosition.length >= 2) {
          // x座標でソート済みなので、左が姓、右が名
          const lastNameField = fieldsWithPosition[0];
          const firstNameField = fieldsWithPosition[1];

          if (lastNameField.fieldType === 'name') {
            // 名前フィールドの場合
            lastNameField.element.value = SENDER_INFO.lastName;
            lastNameField.element.dispatchEvent(new Event('input', { bubbles: true }));
            lastNameField.element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'lastName', label: lastNameField.label || lastNameField.element.name, value: SENDER_INFO.lastName });

            firstNameField.element.value = SENDER_INFO.firstName;
            firstNameField.element.dispatchEvent(new Event('input', { bubbles: true }));
            firstNameField.element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'firstName', label: firstNameField.label || firstNameField.element.name, value: SENDER_INFO.firstName });
          } else if (lastNameField.fieldType === 'kana') {
            // ふりがなフィールドの場合
            lastNameField.element.value = SENDER_INFO.lastNameKana;
            lastNameField.element.dispatchEvent(new Event('input', { bubbles: true }));
            lastNameField.element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'lastNameKana', label: lastNameField.label || lastNameField.element.name, value: SENDER_INFO.lastNameKana });

            firstNameField.element.value = SENDER_INFO.firstNameKana;
            firstNameField.element.dispatchEvent(new Event('input', { bubbles: true }));
            firstNameField.element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ type: 'firstNameKana', label: firstNameField.label || firstNameField.element.name, value: SENDER_INFO.firstNameKana });
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

    console.log(`✅ 入力完了: ${result.filledCount}項目\n`);
    if (result.filledFields.length > 0) {
      result.filledFields.forEach(field => {
        const displayValue = field.value && field.value.length > 30 ? field.value.substring(0, 30) + '...' : field.value;
        console.log(`   - ${field.type}: "${field.label}" → "${displayValue}"`);
      });
    }

    console.log('\n⏰ 30秒間フォームを確認できます...\n');
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
