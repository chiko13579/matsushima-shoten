const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const SENDER_INFO = {
  fullName: '森田憲治',
  email: 'info@anatano-okage.com',
  tel: '09091749043',
  prefecture: '愛知県',
  message: 'テストメッセージです'
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.wavy-kigyou.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate((senderInfo) => {
    const filled = [];
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(el => {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

      const name = el.name || '';
      const allText = name.toLowerCase();
      const isSelect = el.tagName === 'SELECT';
      const isTextarea = el.tagName === 'TEXTAREA';

      let fieldType = 'unknown';
      let value = null;

      // 都道府県判定（todohuken追加）
      if (allText.match(/prefecture|todohuken|todofuken|todouhuken/)) {
        fieldType = 'prefecture';
        if (isSelect) {
          const options = Array.from(el.options);
          const target = options.find(o => o.value === senderInfo.prefecture || o.text === senderInfo.prefecture);
          if (target) {
            el.value = target.value;
            filled.push({ name, type: 'prefecture', value: target.value });
          }
        }
        return;
      }

      // その他のフィールド判定
      if (name === 'your-name') {
        value = senderInfo.fullName;
        fieldType = 'fullName';
      } else if (name === 'your-email') {
        value = senderInfo.email;
        fieldType = 'email';
      } else if (allText.match(/tel/)) {
        value = senderInfo.tel;
        fieldType = 'tel';
      } else if (isTextarea && !name.includes('wpcf7') && !name.includes('recaptcha')) {
        value = senderInfo.message;
        fieldType = 'message';
      }

      if (value) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push({ name, type: fieldType, value: value.substring(0, 20) });
      }
    });

    return filled;
  }, SENDER_INFO);

  console.log('=== 入力結果 ===');
  result.forEach(f => {
    console.log(`✅ ${f.type}: ${f.name} = "${f.value}"`);
  });
  console.log(`\n📝 ${result.length}項目入力完了`);

  console.log('\n⏰ 20秒間確認できます');
  await new Promise(r => setTimeout(r, 20000));
  await browser.close();
})();
