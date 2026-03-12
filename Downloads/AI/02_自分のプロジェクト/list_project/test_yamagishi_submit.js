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

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.zyamagishi.jp/form/zeirishihouzin-yamagishi/contact';

  console.log(`\n📋 税理士法人山岸会計のフォームテスト\n`);

  try {
    // detectFieldType関数をページに注入
    await page.evaluateOnNewDocument((SENDER_INFO) => {
      window.detectFieldType = function(element) {
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const label = (element.label || '').toLowerCase();
        const type = element.type || '';

        const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

        // 会社名
        if (allText.match(/company|会社|法人|屋号|corp/)) {
          return { type: 'company', value: SENDER_INFO.company };
        }

        // メールアドレス
        if (type === 'email' || allText.match(/mail|メール/)) {
          return { type: 'email', value: SENDER_INFO.email };
        }

        // 電話番号
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

        // 郵便番号
        if (allText.match(/zip|postal|郵便|〒/)) {
          return { type: 'zip', value: SENDER_INFO.zip };
        }

        // 住所
        if (allText.match(/address|住所|番地/)) {
          return { type: 'address', value: SENDER_INFO.address };
        }
        if (allText.match(/prefecture|都道府県/)) {
          return { type: 'prefecture', value: SENDER_INFO.prefecture };
        }

        // お問合せ内容
        if (element.tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) {
          return { type: 'message', value: SENDER_INFO.message };
        }

        // ふりがな
        if (allText.match(/kana|かな|ふりがな|フリガナ/) && !allText.match(/会社|法人/)) {
          return { type: 'fullNameKana', value: SENDER_INFO.fullNameKana };
        }

        // 姓名
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp/)) {
          return { type: 'fullName', value: SENDER_INFO.fullName };
        }

        // 同意チェックボックス
        if (type === 'checkbox' && allText.match(/同意|承諾|accept|agree|privacy|個人情報/)) {
          return { type: 'agreement', value: true };
        }

        return { type: 'other', value: '' };
      };
    }, SENDER_INFO);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フォーム入力
    const result = await page.evaluate(() => {
      const filledFields = [];
      const elements = document.querySelectorAll('input, textarea, select');
      const processedCheckboxGroups = new Set();

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

        const fieldInfo = {
          tagName: element.tagName.toLowerCase(),
          type: element.type || 'text',
          name: element.name || '',
          id: element.id || '',
          placeholder: element.placeholder || '',
          label: label
        };

        const detection = window.detectFieldType(fieldInfo);

        // 通常のフィールド
        if (detection.type !== 'other' && detection.value &&
            fieldInfo.type !== 'checkbox' && fieldInfo.type !== 'radio' && fieldInfo.tagName !== 'select') {
          element.value = detection.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          const preview = typeof detection.value === 'string' && detection.value.length > 30
            ? detection.value.substring(0, 30) + '...'
            : detection.value;
          filledFields.push({ label: fieldInfo.label || fieldInfo.name, value: preview });
        }
        // 同意チェックボックス
        else if (fieldInfo.type === 'checkbox' && detection.type === 'agreement') {
          element.checked = true;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filledFields.push({ label: fieldInfo.label, value: 'checked' });
        }
        // 未検出のチェックボックスグループ - ラベルから判定
        else if (fieldInfo.type === 'checkbox' && element.name && !processedCheckboxGroups.has(element.name)) {
          const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${element.name}"]`);

          if (checkboxes.length > 1) {
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
            });

            if (hasInquiryKeywords) {
              processedCheckboxGroups.add(element.name);

              let checked = false;
              for (let i = 0; i < checkboxes.length; i++) {
                const cb = checkboxes[i];
                const cbLabel = labels[i];

                if (cbLabel.match(/その他|other|ご意見|要望/i) && !checked) {
                  cb.checked = true;
                  cb.dispatchEvent(new Event('change', { bubbles: true }));
                  filledFields.push({ label: 'お問い合わせ内容', value: cbLabel });
                  checked = true;
                  break;
                }
              }

              if (!checked && checkboxes[0]) {
                checkboxes[0].checked = true;
                checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
                filledFields.push({ label: 'お問い合わせ内容', value: labels[0] });
              }
            }
          }
        }
      });

      return filledFields;
    });

    console.log(`✅ 入力完了: ${result.length}項目\n`);
    result.forEach(field => {
      console.log(`   ✓ ${field.label}: ${field.value}`);
    });

    console.log('\n⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
  console.log('\n✅ テスト完了！');
})();
