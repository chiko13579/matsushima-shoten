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

  console.log('テスト: https://www.crimson-sapporo.com/contact\n');
  await page.goto('https://www.crimson-sapporo.com/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // フォーム入力
  const filledFields = await page.evaluate((senderInfo) => {
    const filled = [];
    const skipped = [];
    let messageFieldFilled = false; // メッセージは1つだけ
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(el => {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;
      if (el.type === 'radio' || el.type === 'checkbox') return; // スキップ

      let label = '';
      if (el.id) {
        const lbl = document.querySelector('label[for="' + el.id + '"]');
        if (lbl) label = lbl.textContent.trim();
      }
      if (!label) {
        const parent = el.closest('label');
        if (parent) label = parent.textContent.trim();
      }

      const labelText = label.toLowerCase();
      let value = null;
      let isMessage = false;

      // フィールド判定
      if (labelText.match(/法人|会社|社名/)) {
        value = senderInfo.company;
      } else if (labelText.match(/ふりがな|フリガナ/)) {
        value = senderInfo.fullNameKana;
      } else if (labelText.match(/名前|氏名/)) {
        value = senderInfo.fullName;
      } else if (labelText.match(/メール|mail/i)) {
        value = senderInfo.email;
      } else if (labelText.match(/電話|tel/i)) {
        value = senderInfo.tel;
      } else if (el.tagName === 'TEXTAREA' || labelText.match(/相談|内容|質問/)) {
        isMessage = true;
        value = senderInfo.message;
      }

      // メッセージは1つだけ入力
      if (isMessage && messageFieldFilled) {
        skipped.push({ label: label.substring(0, 30), reason: 'メッセージ重複' });
        return;
      }

      if (value) {
        if (isMessage) messageFieldFilled = true;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled.push({ label: label.substring(0, 30), value: value });
      }
    });

    return { filled, skipped };
  }, SENDER_INFO);

  console.log('=== 入力結果 ===');
  filledFields.filled.forEach(f => {
    console.log('✅ ' + f.label + ': ' + f.value);
  });

  if (filledFields.skipped.length > 0) {
    console.log('\n=== スキップ ===');
    filledFields.skipped.forEach(f => {
      console.log('⏭️  ' + f.label + ' (' + f.reason + ')');
    });
  }

  console.log('\n📝 入力完了: ' + filledFields.filled.length + '項目');
  console.log('⏰ 30秒間確認できます（Ctrl+Cで終了）');

  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
})();
