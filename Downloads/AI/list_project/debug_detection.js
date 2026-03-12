const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const SENDER_INFO = {
  lastName: '森田',
  firstName: '憲治',
  lastNameKana: 'もりた',
  firstNameKana: 'けんじ',
  lastNameKatakana: 'モリタ',
  firstNameKatakana: 'ケンジ',
  message: 'テストです'
};

async function debugDetection() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto('https://www.yuigonsyo.biz/contact/', { waitUntil: 'networkidle2' });

  const results = await page.evaluate((senderInfo) => {
    // detectFieldType関数を再定義
    const detectFieldType = (fieldInfo) => {
      const allText = `${fieldInfo.name}${fieldInfo.id}${fieldInfo.className}`.toLowerCase();
      const labelText = fieldInfo.label.toLowerCase();
      const label = fieldInfo.label;
      const type = fieldInfo.type;
      const placeholder = fieldInfo.placeholder;

      // チェックボックスの汎用処理
      if (type === 'checkbox') {
        // 同意チェックボックス
        if (allText.match(/accept|agree|privacy|spam/) || labelText.match(/同意|承諾|個人情報|スパム|チェック.*送信|確認.*送信/)) {
          return { type: 'agreement', value: true };
        }
        return { type: 'requiredCheckbox', value: 'auto' };
      }

      return { type: 'other', value: null };
    };

    const results = [];
    const elements = document.querySelectorAll('input[type="checkbox"]');

    elements.forEach((el, index) => {
      // ラベルを取得
      let label = '';
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) label = labelEl.textContent.trim();
      }
      if (!label && el.closest('label')) {
        label = el.closest('label').textContent.trim();
      }

      const fieldInfo = {
        name: el.name || '',
        id: el.id || '',
        className: el.className || '',
        label: label,
        type: el.type,
        placeholder: el.placeholder || ''
      };

      const detection = detectFieldType(fieldInfo);

      results.push({
        index,
        name: el.name,
        label: label,
        detectionType: detection.type,
        allText: `${fieldInfo.name}${fieldInfo.id}${fieldInfo.className}`.toLowerCase(),
        labelLower: label.toLowerCase()
      });
    });

    return results;
  }, SENDER_INFO);

  console.log('=== チェックボックス検出結果 ===');
  results.forEach(r => {
    console.log(`\n[${r.index}] name=${r.name}`);
    console.log(`    label: ${r.label}`);
    console.log(`    detection.type: ${r.detectionType}`);
    console.log(`    allText: ${r.allText}`);
  });

  await browser.close();
}

debugDetection().catch(console.error);
