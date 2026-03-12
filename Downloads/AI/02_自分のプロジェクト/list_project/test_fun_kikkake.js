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

  const url = 'https://www.yama-cpa.com/contact/';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ＦＵＮ税理士法人 - 「きっかけ」フィールド修正テスト`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フォーム入力（修正版detectFieldType使用）
    const result = await page.evaluate((SENDER_INFO) => {
      const filledFields = [];

      function detectFieldType(element) {
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const label = element.label || '';
        const type = element.type || '';
        const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

        // 弊社を知ったきっかけ（優先）
        if (allText.match(/きっかけ|know.*about|heard.*about|how.*hear|how.*find|referral/)) {
          return { type: 'referralSource', value: '検索' };
        }

        // お問合せ内容（textareaかつキーワードマッチ）
        if ((element.tagName === 'textarea' && allText.match(/問.*合|相談|詳細|内容|ご質問|ご相談|message|inquiry/)) ||
            allText.match(/お問.*合.*内容|ご相談.*内容|message.*content|inquiry.*detail/)) {
          return { type: 'message', value: SENDER_INFO.message };
        }

        return { type: 'other', value: '' };
      }

      const elements = document.querySelectorAll('input, textarea, select');

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

        const detection = detectFieldType(fieldInfo);

        if (detection.type !== 'other' && detection.value && fieldInfo.type !== 'checkbox' && fieldInfo.type !== 'radio' && fieldInfo.tagName !== 'select') {
          element.value = detection.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));

          // 「きっかけ」フィールドのみ記録
          if (fieldInfo.name.includes('きっかけ') || detection.type === 'referralSource' || detection.type === 'message') {
            filledFields.push({
              name: fieldInfo.name,
              label: fieldInfo.label || fieldInfo.name,
              detectedType: detection.type,
              filledValue: detection.value.length > 50 ? detection.value.substring(0, 50) + '...' : detection.value
            });
          }
        }
      });

      return filledFields;
    }, SENDER_INFO);

    console.log(`✅ フォーム入力完了\n`);

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`入力結果:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    result.forEach(field => {
      const icon = field.detectedType === 'referralSource' ? '✅' :
                   field.detectedType === 'message' ? '📝' : '❓';

      console.log(`${icon} [${field.detectedType}] ${field.label || field.name}`);
      console.log(`   値: "${field.filledValue}"`);

      if (field.name.includes('きっかけ')) {
        if (field.filledValue === '検索') {
          console.log(`   ✅ 成功！正しく「検索」が入力されました`);
        } else {
          console.log(`   ❌ 失敗！間違った値が入力されました`);
        }
      }

      console.log('');
    });

    console.log('\n⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
  console.log('\n✅ テスト完了！');
})();
