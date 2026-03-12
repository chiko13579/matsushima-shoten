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

  const url = 'https://business.form-mailer.jp/fms/4d1a7ba5267478';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 アイネックス税理士法人 - 完全修正版テスト`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フォーム入力実行（auto_contact_sender.jsのロジックを直接実行）
    const fs = require('fs');
    const autoContactSender = fs.readFileSync('/Users/saeki/Downloads/img/list_project/auto_contact_sender.js', 'utf8');

    // page.evaluateで実行できる形に変換（ファイル全体ではなく、フォーム入力部分のみ）
    const result = await page.evaluate((senderInfo) => {
      const filledFields = [];
      const skippedFields = [];
      const processedCheckboxGroups = new Set();

      const elements = document.querySelectorAll('input, textarea, select');

      // detectFieldType関数
      function detectFieldType(fieldInfo) {
        const name = (fieldInfo.name || '').toLowerCase();
        const id = (fieldInfo.id || '').toLowerCase();
        const placeholder = (fieldInfo.placeholder || '').toLowerCase();
        const label = (fieldInfo.label || '').toLowerCase();
        const type = fieldInfo.type || '';
        const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

        // 優先順位1: 会社名（貴社、貴殿、組織も含む）
        if (allText.match(/company|会社|法人|屋号|corp|貴社|貴殿|組織|organization/)) {
          return { type: 'company', value: senderInfo.company };
        }

        // 優先順位2: メールアドレス
        if (type === 'email' || allText.match(/mail|メール/)) {
          return { type: 'email', value: senderInfo.email };
        }

        // 優先順位3: 電話番号
        if (allText.match(/tel1|phone1|電話1/)) return { type: 'tel1', value: senderInfo.tel1 };
        if (allText.match(/tel2|phone2|電話2/)) return { type: 'tel2', value: senderInfo.tel2 };
        if (allText.match(/tel3|phone3|電話3/)) return { type: 'tel3', value: senderInfo.tel3 };
        if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) {
          return { type: 'tel', value: senderInfo.tel };
        }

        // 優先順位4: 郵便番号
        if (allText.match(/zip1|postal1|郵便1/) || (allText.match(/zip|postal|郵便/) && allText.match(/1|前/))) {
          return { type: 'zip1', value: senderInfo.zip1 };
        }
        if (allText.match(/zip2|postal2|郵便2/) || (allText.match(/zip|postal|郵便/) && allText.match(/2|後/))) {
          return { type: 'zip2', value: senderInfo.zip2 };
        }
        if (allText.match(/zip|postal|郵便|〒/)) {
          return { type: 'zip', value: senderInfo.zip };
        }

        // 優先順位5: 住所（都道府県、市区町村、番地）
        if (allText.match(/都道府県|prefecture|pref/)) {
          return { type: 'prefecture', value: senderInfo.prefecture };
        }
        if (allText.match(/市区町村|city/) || (allText.match(/住所/) && allText.match(/1|市|区|町|村/))) {
          return { type: 'city', value: senderInfo.city };
        }
        if (allText.match(/番地|町名|street|block/) || (allText.match(/住所/) && allText.match(/2|3|詳細/))) {
          return { type: 'street', value: senderInfo.street };
        }
        if (allText.match(/住所|address/) && !allText.match(/mail|メール/)) {
          return { type: 'address', value: senderInfo.address };
        }

        // 優先順位6: 姓・名・氏名
        if (allText.match(/lastname|last_name|name_last|name.*head|姓|苗字|みょうじ/) && !allText.match(/氏名|お名前/)) {
          return { type: 'lastName', value: senderInfo.lastName };
        }
        if (label.match(/^名$/) || (allText.match(/firstname|first_name|name.*body|body.*name|name.*first|first.*name|名(?!.*姓)(?!前)/) && !allText.match(/会社|法人|氏名|お名前|代表|担当|貴社|貴殿|ビル|マンション|building|mansion|かな|kana|ふりがな/))) {
          return { type: 'firstName', value: senderInfo.firstName };
        }
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|組織/)) {
          return { type: 'fullName', value: senderInfo.fullName };
        }

        // 優先順位7: ふりがな
        if (allText.match(/lastkana|last_kana|kana_last|kana.*head|せい|みょうじ/) && allText.match(/kana|かな|ふりがな|フリガナ/)) {
          return { type: 'lastNameKana', value: senderInfo.lastNameKana };
        }
        if (allText.match(/firstkana|first_kana|kana.*body|kana.*first|めい/) && allText.match(/kana|かな|ふりがな|フリガナ/)) {
          return { type: 'firstNameKana', value: senderInfo.firstNameKana };
        }
        if (allText.match(/kana|かな|ふりがな|フリガナ/) && !allText.match(/会社|法人|lastname|firstname/)) {
          return { type: 'fullNameKana', value: senderInfo.fullNameKana };
        }

        // 優先順位8: お問い合わせ内容・メッセージ
        if (fieldInfo.tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) {
          return { type: 'message', value: senderInfo.message };
        }

        return { type: 'other', value: '' };
      }

      elements.forEach(element => {
        if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

        // ラベル取得
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

        const fieldInfo = {
          tagName: element.tagName.toLowerCase(),
          type: element.type || 'text',
          name: element.name || '',
          id: element.id || '',
          placeholder: element.placeholder || '',
          label: label
        };

        const detection = detectFieldType(fieldInfo);

        // 住所フィールド（prefecture, city, street, address）の処理
        if (detection.type === 'prefecture' || detection.type === 'city' || detection.type === 'street' || detection.type === 'address') {
          if (fieldInfo.tagName === 'select') {
            const options = element.options;
            let found = false;
            for (let i = 0; i < options.length; i++) {
              const optionText = options[i].textContent.trim();
              const optionValue = options[i].value;
              if (optionText === detection.value || optionText.includes(detection.value) || optionValue === detection.value) {
                element.selectedIndex = i;
                element.dispatchEvent(new Event('change', { bubbles: true }));
                filledFields.push({ ...fieldInfo, filledValue: optionText, detectedType: detection.type });
                found = true;
                break;
              }
            }
            if (!found && detection.type === 'prefecture') {
              skippedFields.push({ ...fieldInfo, reason: `都道府県「${detection.value}」が見つかりません` });
            }
          } else {
            element.value = detection.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ ...fieldInfo, filledValue: detection.value, detectedType: detection.type });
          }
        } else if (detection.type !== 'other' && detection.value && fieldInfo.type !== 'checkbox' && fieldInfo.type !== 'radio' && fieldInfo.tagName !== 'select') {
          // 通常のテキストフィールド
          element.value = detection.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filledFields.push({ ...fieldInfo, filledValue: detection.value, detectedType: detection.type });
        }
      });

      return { filledFields, skippedFields };
    }, SENDER_INFO);

    console.log(`✅ 入力完了: ${result.filledFields.length}項目\n`);

    // 住所フィールドの確認
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

    console.log('⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
  console.log('\n✅ テスト完了！');
})();
