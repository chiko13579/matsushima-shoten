const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const SENDER_INFO = {
  lastName: '森田',
  firstName: '憲治',
  lastNameKana: 'もりた',
  firstNameKana: 'けんじ',
  company: 'あなたのおかげ',
  email: 'info@anatano-okage.com',
  tel: '090-9174-9043'
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // detectFieldType関数をページに注入
  await page.evaluateOnNewDocument((senderInfo) => {
    window.detectFieldType = function(element) {
      const name = (element.name || '').toLowerCase();
      const id = (element.id || '').toLowerCase();
      const placeholder = (element.placeholder || '').toLowerCase();
      const label = element.label || '';
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

      // ふりがな（分離）- 名前より先にチェック
      if (allText.match(/kana.*head|head.*kana|last.*kana|せい.*かな|みょうじ.*かな/) && !allText.match(/会社|法人/)) {
        return { type: 'lastNameKana', value: senderInfo.lastNameKana };
      }
      if (allText.match(/kana.*body|body.*kana|first.*kana|めい.*かな/) && !allText.match(/会社|法人|氏名|お名前/)) {
        return { type: 'firstNameKana', value: senderInfo.firstNameKana };
      }

      // 姓名（分離）
      if (allText.match(/name.*head|head.*name|last.*name|姓(?!.*名)|苗字|みょうじ|^sei\b/) && !allText.match(/会社|法人/)) {
        return { type: 'lastName', value: senderInfo.lastName };
      }
      if (allText.match(/name.*body|body.*name|first.*name|名(?!.*姓)(?!前)|^mei\b/) && !allText.match(/会社|法人|氏名|お名前|代表/)) {
        return { type: 'firstName', value: senderInfo.firstName };
      }

      return { type: 'other', value: '' };
    };
  }, SENDER_INFO);

  await page.goto('https://aoi-p.biz/contact', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));

  console.log('\n📋 フォームフィールドを分析中...\n');

  // フィールドを分析して表示
  const fields = await page.evaluate(() => {
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

      const fieldInfo = {
        tagName: element.tagName.toLowerCase(),
        type: element.type || 'text',
        name: element.name || '',
        id: element.id || '',
        placeholder: element.placeholder || '',
        label: label
      };

      const detection = window.detectFieldType(fieldInfo);

      result.push({
        field: fieldInfo,
        detection: detection
      });
    });

    return result;
  });

  console.log('フィールド検出結果:\n');
  fields.forEach((f, i) => {
    console.log(`${i + 1}. ${f.field.name || f.field.id}`);
    console.log(`   Label: ${f.field.label}`);
    console.log(`   検出タイプ: ${f.detection.type}`);
    console.log(`   入力値: ${f.detection.value}`);
    console.log('');
  });

  // 実際に入力してみる
  console.log('\n📝 実際にフォームに入力します...\n');

  const fillResult = await page.evaluate(() => {
    const filled = [];
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

      const fieldInfo = {
        tagName: element.tagName.toLowerCase(),
        type: element.type || 'text',
        name: element.name || '',
        id: element.id || '',
        placeholder: element.placeholder || '',
        label: label
      };

      const detection = window.detectFieldType(fieldInfo);

      if (detection.type !== 'other' && detection.value) {
        element.value = detection.value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push({
          name: fieldInfo.name || fieldInfo.id,
          label: label,
          value: detection.value
        });
      }
    });

    return filled;
  });

  console.log('入力完了:\n');
  fillResult.forEach(f => {
    console.log(`✓ ${f.name}: ${f.value}`);
  });

  console.log('\n\n⏰ 30秒間フォームを確認できます...');
  await new Promise(r => setTimeout(r, 30000));

  await browser.close();
})();
