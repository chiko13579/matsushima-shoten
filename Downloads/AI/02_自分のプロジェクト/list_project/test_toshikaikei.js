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

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Testing: https://www.toshikaikei.biz/call/');
  await page.goto('https://www.toshikaikei.biz/call/', { waitUntil: 'domcontentloaded', timeout: 30000 });
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
      const className = (element.className || '').toLowerCase();
      const allText = `${name} ${id} ${placeholder} ${label} ${className}`.toLowerCase();

      // 会社名
      if (allText.match(/会社|法人|屋号|貴社|御社|社名|事業者|団体名|organization|company|corp/) && !allText.match(/ふりがな|フリガナ|かな|kana|よみ/)) {
        return { type: 'company', value: SENDER_INFO.company };
      }
      // メールアドレス
      if (allText.match(/メール|eメール|e-mail|mail|アドレス/) || type === 'email') {
        return { type: 'email', value: SENDER_INFO.email };
      }
      // 電話番号
      if (allText.match(/電話|℡|tel|phone|携帯|ケータイ|連絡先|ご連絡|denwa/) || type === 'tel') {
        return { type: 'tel', value: SENDER_INFO.tel };
      }
      // 郵便番号
      if (name.match(/zip01|zip_1|zip1|postal_1|postal1/)) {
        return { type: 'zip1', value: SENDER_INFO.zip1 };
      }
      if (name.match(/zip02|zip_2|zip2|postal_2|postal2/)) {
        return { type: 'zip2', value: SENDER_INFO.zip2 };
      }
      if (allText.match(/郵便|postal|zip|〒|ゆうびん/) && !allText.match(/mail|メール/)) {
        return { type: 'zip', value: SENDER_INFO.zip };
      }
      // 住所
      if (allText.match(/住所|所在地|address|ご住所/) && !allText.match(/mail|メール|都道府県|市区町村|番地|建物/)) {
        return { type: 'address', value: SENDER_INFO.address };
      }
      // 問い合わせ内容（TEXTAREAのみ、または特定ラベル）
      if (element.tagName === 'TEXTAREA' ||
          (allText.match(/問い合わせ内容|お問合せ内容|ご相談内容|相談内容|質問内容|詳細|備考|message|inquiry|comment/) &&
           element.tagName.toLowerCase() !== 'select' && type !== 'checkbox' && type !== 'radio' &&
           !allText.match(/種別|タイプ|カテゴリ|category|type/))) {
        return { type: 'message', value: SENDER_INFO.message };
      }
      // 氏名
      if (allText.match(/お名前|氏名|名前|ご氏名|ご担当|代表者|担当者|your.*name/) && !allText.match(/会社|法人|貴社|組織|部署|部門|所属|件名/)) {
        return { type: 'fullName', value: SENDER_INFO.fullName };
      }
      // 同意チェックボックス
      if (type === 'checkbox' && allText.match(/同意|承諾|了承|確認|個人情報|プライバシー|利用規約|terms|privacy|agree|accept|consent/)) {
        return { type: 'agreement', value: true };
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
        const dd = element.closest('dd');
        if (dd) {
          const dt = dd.previousElementSibling;
          if (dt && dt.tagName === 'DT') label = dt.textContent.trim();
        }
      }
      if (!label) {
        let parent = element.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const firstChild = parent.firstElementChild;
          if (firstChild && !['INPUT', 'SELECT', 'TEXTAREA'].includes(firstChild.tagName)) {
            const text = firstChild.textContent.trim();
            if (text.length > 0 && text.length < 100) {
              label = text;
              break;
            }
          }
          parent = parent.parentElement;
        }
      }
      if (!label && element.placeholder) label = element.placeholder.trim();

      element.label = label;
      const detection = detectFieldType(element);

      // 常に入力するフィールドタイプ
      const alwaysFillTypes = [
        'email', 'fullName', 'message', 'company', 'tel', 'address', 'zip', 'zip1', 'zip2', 'agreement'
      ];
      if (!alwaysFillTypes.includes(detection.type)) {
        return;
      }

      console.log(`Detected: ${detection.type} for label="${label}" name="${element.name}"`);

      try {
        if (element.type === 'checkbox' && detection.type === 'agreement') {
          element.checked = true;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('click', { bubbles: true }));

          // 非表示のチェックボックスの場合
          const rect = element.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            let clickTarget = null;
            if (element.id) {
              clickTarget = document.querySelector(`label[for="${element.id}"]`);
            }
            if (!clickTarget) {
              clickTarget = element.closest('label');
            }
            if (!clickTarget) {
              let parent = element.parentElement;
              for (let i = 0; i < 3 && parent; i++) {
                if (parent.className && (parent.className.includes('checkbox') || parent.className.includes('agree'))) {
                  clickTarget = parent;
                  break;
                }
                parent = parent.parentElement;
              }
            }
            if (clickTarget) {
              clickTarget.click();
            }
          }
          filledFields.push({ type: detection.type, label: label || element.name, value: 'checked' });
        }
        else if (detection.type !== 'other' && detection.value && element.type !== 'checkbox' && element.type !== 'radio') {
          element.value = detection.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filledFields.push({ type: detection.type, label: label || element.name, value: detection.value });
        }
      } catch (e) {
        console.error('Error filling field:', e);
      }
    });

    return { filledFields };
  }, SENDER_INFO);

  console.log('\n=== 入力されたフィールド ===');
  result.filledFields.forEach((f, i) => {
    const displayValue = f.value.length > 30 ? f.value.substring(0, 30) + '...' : f.value;
    console.log(`  - ${f.type}: "${f.label}" → "${displayValue}"`);
  });
  console.log(`\n合計: ${result.filledFields.length}件`);

  console.log('\n60秒待機中...');
  await new Promise(r => setTimeout(r, 60000));
  await browser.close();
})();
