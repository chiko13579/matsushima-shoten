const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const SENDER_INFO = {
  fullName: '森田憲治',
  fullNameKana: 'もりたけんじ',
  company: 'あなたのおかげ',
  email: 'info@anatano-okage.com',
  tel: '09091749043',
  message: 'テストメッセージです'
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://mylegal.jp/info/contact.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate((senderInfo) => {
    const filled = [];
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(el => {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

      const name = el.name || '';
      const nameAttrForRequired = name;
      
      // ラベル取得
      let label = '';
      let parent = el.parentElement;
      for (let i = 0; i < 3 && parent; i++) {
        const text = parent.textContent.trim();
        if (text.length > 0 && text.length < 100) {
          label = text.substring(0, 50);
          break;
        }
        parent = parent.parentElement;
      }
      
      // 必須チェック（修正後）
      let isRequired = el.required ||
        el.getAttribute('aria-required') === 'true' ||
        label.includes('必須') ||
        label.includes('*') ||
        label.includes('※') ||
        nameAttrForRequired.includes('必須');  // ← 追加した検出

      // フィールドタイプ判定
      let fieldType = 'unknown';
      let value = null;
      
      if (name.includes('email') || name.includes('メール')) {
        fieldType = 'email';
        value = senderInfo.email;
      } else if (name.includes('confirm')) {
        fieldType = 'confirmEmail';
        value = senderInfo.email;
      } else if (name.includes('名前') || name.includes('氏名')) {
        fieldType = 'fullName';
        value = senderInfo.fullName;
      } else if (name.includes('電話')) {
        fieldType = 'tel';
        value = senderInfo.tel;
      } else if (el.tagName === 'TEXTAREA' || name.includes('問い合わせ') || name.includes('内容')) {
        fieldType = 'message';
        value = senderInfo.message;
      }

      if (value && isRequired) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push({ name: name.substring(0, 25), type: fieldType, isRequired });
      }
    });

    return filled;
  }, SENDER_INFO);

  console.log('=== 入力結果（必須のみ） ===');
  result.forEach(f => {
    console.log(`✅ ${f.type}: ${f.name} [required: ${f.isRequired}]`);
  });
  console.log(`\n📝 ${result.length}項目入力完了`);
  
  console.log('\n⏰ 20秒間確認できます');
  await new Promise(r => setTimeout(r, 20000));
  await browser.close();
})();
