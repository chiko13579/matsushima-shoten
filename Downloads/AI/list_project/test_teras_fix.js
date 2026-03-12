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

  const url = 'https://trc-tax.com/contact';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 税理士法人テラス - ふりがなフィールド修正テスト`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フォーム入力
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

        // ふりがな検出（会社関連を除外）
        if (allText.match(/kana|かな|ふりがな|フリガナ/) && !allText.match(/会社|法人|社名|屋号|組織|corp/)) {
          return { type: 'fullNameKana', value: SENDER_INFO.fullNameKana };
        }
        // placeholderが全てひらがな → ふりがな
        if (placeholder && placeholder.match(/^[ぁ-ん\s　]+$/)) {
          return { type: 'fullNameKana', value: SENDER_INFO.fullNameKana };
        }

        // フルネーム検出
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|組織/)) {
          return { type: 'fullName', value: SENDER_INFO.fullName };
        }

        // メール
        if (type === 'email' || allText.match(/mail|メール/)) {
          return { type: 'email', value: SENDER_INFO.email };
        }

        // 電話
        if (type === 'tel' || allText.match(/tel|電話|phone/)) {
          return { type: 'tel', value: SENDER_INFO.tel };
        }

        // 問い合わせ内容
        if (element.tagName.toLowerCase() === 'textarea' || allText.match(/問い合わせ|お問合せ|ご相談|内容|message|詳細|comment/)) {
          return { type: 'message', value: SENDER_INFO.message };
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

        element.label = label;
        const detection = detectFieldType(element);

        if (detection.type !== 'other' && detection.value) {
          element.value = detection.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filledFields.push({
            name: element.name,
            label: label,
            placeholder: element.placeholder,
            value: detection.value,
            detectionType: detection.type
          });
        }
      });

      return { filledFields };
    }, SENDER_INFO);

    console.log(`✅ 入力完了: ${result.filledFields.length}項目\n`);

    console.log(`入力されたフィールド:`);
    result.filledFields.forEach(field => {
      const displayName = field.label || field.placeholder || field.name;
      console.log(`   ${field.detectionType}: "${displayName}" → "${field.value}"`);
    });

    // ふりがなフィールドの値を確認
    const furiganaValue = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      for (let input of inputs) {
        if (input.placeholder && input.placeholder.match(/^[ぁ-ん\s　]+$/)) {
          return {
            name: input.name,
            placeholder: input.placeholder,
            value: input.value
          };
        }
      }
      return null;
    });

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    if (furiganaValue && furiganaValue.value === 'もりたけんじ') {
      console.log(`✅ 成功！ふりがなフィールドに正しく入力されました`);
      console.log(`   Name: ${furiganaValue.name}`);
      console.log(`   Placeholder: ${furiganaValue.placeholder}`);
      console.log(`   Value: ${furiganaValue.value}`);
    } else if (furiganaValue) {
      console.log(`❌ 失敗！ふりがなフィールドが空です`);
      console.log(`   Name: ${furiganaValue.name}`);
      console.log(`   Placeholder: ${furiganaValue.placeholder}`);
      console.log(`   Value: ${furiganaValue.value || '(空)'}`);
    } else {
      console.log(`❌ ふりがなフィールドが見つかりません`);
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log('⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    console.error(error.stack);
  }

  await browser.close();
  console.log('\n✅ テスト完了！');
})();
