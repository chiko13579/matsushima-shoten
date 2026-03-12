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
  lastNameKatakana: 'モリタ',
  firstNameKatakana: 'ケンジ',
  fullNameKatakana: 'モリタケンジ',
  company: 'あなたのおかげ',
  email: 'info@anatano-okage.com',
  tel: '09091749043',
  message: 'テストです'
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('テスト: https://ocean.jpn.com/contact/\n');
  await page.goto('https://ocean.jpn.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // フォーム入力
  const filledFields = await page.evaluate((senderInfo) => {
    const filled = [];
    const skipped = [];
    let messageFieldFilled = false;
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(el => {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

      const name = el.name || '';
      const type = el.type;

      // DL/DT/DD構造の必須検出
      let isRequired = el.required || false;
      if (!isRequired) {
        const dd = el.closest('dd');
        if (dd) {
          let sibling = dd.previousElementSibling;
          while (sibling && sibling.tagName !== 'DT') {
            sibling = sibling.previousElementSibling;
          }
          if (sibling && sibling.tagName === 'DT' && sibling.textContent.includes('必須')) {
            isRequired = true;
          }
        }
      }

      let value = null;
      let fieldType = 'unknown';

      // name属性に日本語がある場合の検出
      if (name === '姓') {
        value = senderInfo.lastName;
        fieldType = 'lastName';
      } else if (name === '名') {
        value = senderInfo.firstName;
        fieldType = 'firstName';
      } else if (name === 'セイ') {
        value = senderInfo.lastNameKatakana;
        fieldType = 'lastNameKana';
      } else if (name === 'メイ') {
        value = senderInfo.firstNameKatakana;
        fieldType = 'firstNameKana';
      } else if (name === 'メールアドレス') {
        value = senderInfo.email;
        fieldType = 'email';
      } else if (name === '電話番号') {
        value = senderInfo.tel;
        fieldType = 'tel';
      } else if (el.tagName === 'TEXTAREA' && name === 'お問い合わせ内容') {
        if (!messageFieldFilled) {
          value = senderInfo.message;
          fieldType = 'message';
          messageFieldFilled = true;
        }
      } else if (type === 'checkbox' && name.includes('個人情報')) {
        fieldType = 'agreement';
        // チェックボックスは後で処理
      }

      // 必須でないフィールドはスキップ（メッセージと同意は必須扱い）
      if (!isRequired && fieldType !== 'message' && fieldType !== 'agreement') {
        if (value) {
          skipped.push({ name: name, reason: '必須でない', type: fieldType });
        }
        return;
      }

      if (value) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push({ name: name, value: value, type: fieldType, required: isRequired });
      } else if (fieldType === 'agreement' && type === 'checkbox') {
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push({ name: name, value: 'checked', type: fieldType, required: isRequired });
      }
    });

    return { filled, skipped };
  }, SENDER_INFO);

  console.log('=== 入力結果 ===');
  filledFields.filled.forEach(f => {
    console.log(`✅ ${f.type} (${f.name}): ${f.value} [必須: ${f.required ? 'はい' : 'いいえ'}]`);
  });

  if (filledFields.skipped.length > 0) {
    console.log('\n=== スキップ ===');
    filledFields.skipped.forEach(f => {
      console.log(`⏭️  ${f.type} (${f.name}): ${f.reason}`);
    });
  }

  console.log('\n📝 入力完了: ' + filledFields.filled.length + '項目');
  console.log('⏰ 30秒間確認できます（Ctrl+Cで終了）');

  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
})();
