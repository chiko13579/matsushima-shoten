const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const SENDER_INFO = {
  fullName: '森田憲治',
  fullNameKana: 'もりたけんじ',
  company: 'あなたのおかげ',
  email: 'info@anatano-okage.com',
  tel: '09091749043',
  address: '愛知県知多郡武豊町祠峰1-91',
  message: 'テストメッセージです'
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://mtstar-gs.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate((senderInfo) => {
    const filled = [];
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(el => {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

      const name = el.name || '';
      const allText = name.toLowerCase();
      const isTextarea = el.tagName === 'TEXTAREA';

      let fieldType = 'unknown';
      let value = null;

      // フィールド判定（questionをmessageとして検出）
      if (name === 'name') {
        fieldType = 'fullName';
        value = senderInfo.fullName;
      } else if (name === 'hurigana') {
        fieldType = 'fullNameKana';
        value = senderInfo.fullNameKana;
      } else if (name === 'tel') {
        fieldType = 'tel';
        value = senderInfo.tel;
      } else if (name === 'email') {
        fieldType = 'email';
        value = senderInfo.email;
      } else if (name === 'address') {
        fieldType = 'address';
        value = senderInfo.address;
      } else if (isTextarea || allText.match(/message|inquiry|question/)) {
        fieldType = 'message';
        value = senderInfo.message;
      }

      if (value) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push({ name, type: fieldType, isTextarea });
      }
    });

    return filled;
  }, SENDER_INFO);

  console.log('=== 入力結果 ===');
  result.forEach(f => {
    console.log(`✅ ${f.type}: ${f.name} (textarea: ${f.isTextarea})`);
  });
  console.log(`\n📝 ${result.length}項目入力完了`);

  console.log('\n⏰ 20秒間確認できます');
  await new Promise(r => setTimeout(r, 20000));
  await browser.close();
})();
