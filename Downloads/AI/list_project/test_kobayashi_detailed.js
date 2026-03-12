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

  const url = 'https://www.kobayashi-tax-accountant.com/contact/';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 税理士 小林誉光事務所 - 詳細テスト`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フォーム入力（test_complete_10_forms.jsと同じロジック）
    const result = await page.evaluate((SENDER_INFO) => {
      const filledFields = [];
      const skippedFields = [];
      const elements = document.querySelectorAll('input, textarea, select');

      function detectFieldType(element) {
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const label = element.label || '';
        const type = element.type || '';
        const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

        // フルネーム検出
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|組織/)) {
          return { type: 'fullName', value: SENDER_INFO.fullName };
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

        const detection = detectFieldType(fieldInfo);

        // お名前フィールドをチェック
        if (element.name === 'namae') {
          const allText = `${fieldInfo.name} ${fieldInfo.id} ${fieldInfo.placeholder} ${fieldInfo.label}`.toLowerCase();
          skippedFields.push({
            name: element.name,
            label: label,
            placeholder: element.placeholder,
            allText: allText,
            detectionType: detection.type,
            detectionValue: detection.value,
            nameMatch: allText.match(/name|名前|氏名|お名前|代表者|担当者/) ? 'YES' : 'NO',
            exclusionMatch: allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|組織/) ? 'YES' : 'NO'
          });
        }

        if (detection.type === 'fullName' && detection.value) {
          element.value = detection.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filledFields.push({
            name: element.name,
            label: label,
            value: detection.value
          });
        }
      });

      return { filledFields, skippedFields };
    }, SENDER_INFO);

    console.log(`✅ 入力完了: ${result.filledFields.length}項目\n`);

    if (result.filledFields.length > 0) {
      console.log(`入力されたフィールド:`);
      result.filledFields.forEach(field => {
        console.log(`   - ${field.label || field.name}: "${field.value}"`);
      });
    }

    console.log(`\nお名前フィールド詳細:`);
    result.skippedFields.forEach(field => {
      console.log(`   Name: ${field.name}`);
      console.log(`   Label: ${field.label}`);
      console.log(`   Placeholder: ${field.placeholder}`);
      console.log(`   AllText: "${field.allText}"`);
      console.log(`   Name Pattern Match: ${field.nameMatch}`);
      console.log(`   Exclusion Pattern Match: ${field.exclusionMatch}`);
      console.log(`   Detection Type: ${field.detectionType}`);
      console.log(`   Detection Value: ${field.detectionValue}`);
    });

    // 実際の値を確認
    const actualValue = await page.evaluate(() => {
      const nameInput = document.querySelector('input[name="namae"]');
      return nameInput ? nameInput.value : null;
    });

    console.log(`\n実際のフィールド値: "${actualValue}"`);

    if (actualValue === '森田憲治') {
      console.log(`\n✅ 成功！お名前フィールドに正しく入力されました`);
    } else {
      console.log(`\n❌ 失敗！お名前フィールドが空です`);
    }

    console.log('\n⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    console.error(error.stack);
  }

  await browser.close();
  console.log('\n✅ テスト完了！');
})();
