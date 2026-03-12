const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const SENDER_INFO = {
  fullName: '森田憲治',
  fullNameKana: 'もりたけんじ',
  company: 'あなたのおかげ',
  email: 'info@anatano-okage.com',
  tel: '09091749043',
  message: 'テストです'
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('テスト: https://mylegal.jp/info/contact.html\n');
  await page.goto('https://mylegal.jp/info/contact.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // フォーム入力テスト
  const result = await page.evaluate((senderInfo) => {
    const filled = [];
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(el => {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

      const name = el.name || '';
      const type = el.type || el.tagName.toLowerCase();
      const isTextarea = el.tagName === 'TEXTAREA';

      // name属性に「必須」が含まれるか
      const nameHasRequired = name.includes('必須');

      let value = null;
      let fieldType = 'unknown';

      // フィールド判定
      if (name.includes('email') || name.includes('メール')) {
        value = senderInfo.email;
        fieldType = 'email';
      } else if (name.includes('confirm')) {
        value = senderInfo.email;
        fieldType = 'confirmEmail';
      } else if (name.includes('名前') || name.includes('氏名')) {
        value = senderInfo.fullName;
        fieldType = 'fullName';
      } else if (name.includes('電話')) {
        value = senderInfo.tel;
        fieldType = 'tel';
      } else if (isTextarea || name.includes('問い合わせ') || name.includes('内容')) {
        value = senderInfo.message;
        fieldType = 'message';
      }

      if (value) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push({
          name: name.substring(0, 30),
          value: value.substring(0, 20),
          type: fieldType,
          isTextarea: isTextarea,
          nameHasRequired: nameHasRequired
        });
      }
    });

    return filled;
  }, SENDER_INFO);

  console.log('=== 入力結果 ===');
  result.forEach(f => {
    console.log(`✅ ${f.type}: ${f.name}`);
    console.log(`   value: ${f.value}`);
    console.log(`   isTextarea: ${f.isTextarea}, nameHasRequired: ${f.nameHasRequired}`);
    console.log('');
  });

  console.log('\n⏰ 30秒間確認できます');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
})();
