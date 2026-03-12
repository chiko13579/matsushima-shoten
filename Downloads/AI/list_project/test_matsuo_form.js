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

  const url = 'https://m-accounting-firm.com/contact/';

  console.log(`\n📋 松尾会計事務所のフォームをチェック中...\n`);

  try {
    // detectFieldType関数をページに注入
    await page.evaluateOnNewDocument((senderInfo) => {
      window.detectFieldType = function(fieldInfo) {
        const element = fieldInfo;
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const label = (element.label || '').toLowerCase();
        const type = element.type || '';

        const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

        // 会社名
        if (allText.match(/company|会社|法人|屋号|corp/)) {
          return { type: 'company', value: senderInfo.company };
        }

        // メールアドレス
        if (type === 'email' || allText.match(/mail|メール/)) {
          return { type: 'email', value: senderInfo.email };
        }

        // 電話番号
        if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) {
          return { type: 'tel', value: senderInfo.tel };
        }

        // 住所・エリア
        if (allText.match(/area|エリア|地域|都道府県/)) {
          return { type: 'area', value: '特になし' };
        }

        // お問合せ種別（selectやradio）
        if ((element.tagName === 'select' || type === 'radio') &&
            (allText.match(/種別|type|区分|項目|カテゴリ|category/) || name.match(/inquiry|問.*合.*種別/))) {
          return { type: 'inquiryType', value: 'other' };
        }

        // お問合せ内容
        if (element.tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) {
          return { type: 'message', value: senderInfo.message };
        }

        // 姓名
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp/)) {
          if (allText.match(/かな|kana|ふりがな|フリガナ/)) {
            return { type: 'fullNameKana', value: senderInfo.fullNameKana };
          }
          return { type: 'fullName', value: senderInfo.fullName };
        }

        return { type: 'other', value: '' };
      };
    }, SENDER_INFO);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // 全フィールドの情報を取得
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

        // 必須チェック
        const isRequired = element.required ||
                          element.getAttribute('aria-required') === 'true' ||
                          label.includes('必須') ||
                          label.includes('*') ||
                          label.includes('※');

        result.push({
          type: element.type || element.tagName.toLowerCase(),
          name: element.name || '',
          id: element.id || '',
          placeholder: element.placeholder || '',
          label: label,
          required: isRequired,
          value: element.value || ''
        });
      });

      return result;
    });

    console.log('全フィールド一覧:\n');
    allFields.forEach((field, i) => {
      const requiredMark = field.required ? '[必須]' : '';
      console.log(`${i + 1}. ${requiredMark} ${field.label || field.name || field.placeholder || '(ラベルなし)'}`);
      console.log(`   Type: ${field.type}`);
      console.log(`   Name: ${field.name}`);
      if (field.value) console.log(`   Current Value: ${field.value}`);
      console.log('');
    });

    const requiredFields = allFields.filter(f => f.required);
    console.log(`\n📊 必須フィールド: ${requiredFields.length}個`);
    requiredFields.forEach(field => {
      console.log(`   - ${field.label || field.name || '(ラベルなし)'} (${field.type})`);
    });

    // フォーム入力をシミュレート
    console.log('\n\n📝 フォーム入力テスト（送信なし）...\n');

    const result = await page.evaluate(() => {
      const filledFields = [];
      const skippedFields = [];
      const elements = document.querySelectorAll('input, textarea, select');

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

        const detection = window.detectFieldType(fieldInfo);

        if (detection.type !== 'other' && detection.value) {
          try {
            if (fieldInfo.type !== 'checkbox' && fieldInfo.type !== 'radio' && fieldInfo.tagName !== 'select') {
              element.value = detection.value;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              const preview = detection.value.length > 50 ? detection.value.substring(0, 50) + '...' : detection.value;
              filledFields.push({ ...fieldInfo, detectedType: detection.type, filledValue: preview });
            }
          } catch (e) {
            skippedFields.push({ ...fieldInfo, reason: e.message });
          }
        } else if (fieldInfo.required) {
          // 必須だが検出できなかった場合、デフォルト値を入力
          if (fieldInfo.type === 'text' || fieldInfo.type === 'textarea') {
            element.value = '特になし';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledFields.push({ ...fieldInfo, detectedType: 'default', filledValue: '特になし' });
          }
        }
      });

      return { filledFields, skippedFields };
    });

    console.log(`✅ 入力完了: ${result.filledFields.length}項目\n`);
    result.filledFields.forEach(field => {
      const req = field.required ? '[必須]' : '';
      console.log(`   ${req} [${field.detectedType || '?'}] ${field.label || field.name}: ${field.filledValue}`);
    });

    if (result.skippedFields.length > 0) {
      console.log(`\n⚠️  スキップ: ${result.skippedFields.length}項目`);
      result.skippedFields.forEach(field => {
        console.log(`   - ${field.label || field.name}: ${field.reason}`);
      });
    }

    console.log('\n\n⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
