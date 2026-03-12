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

// 先ほどテストした10個のフォームを再テスト
const FORMS_TO_TEST = [
  { name: '三輪厚二税理士事務所', url: 'https://www.zeirishi-miwa.co.jp/toiawase.html' },
  { name: '税理士法人 新納会計事務所', url: 'https://www.shinnou.net/form/sinnnou/form01' },
  { name: '笘原拓人税理士事務所', url: 'https://t-taxfirm.com/contact/' }
];

async function testForm(form) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ${form.name}`);
  console.log(`🔗 ${form.url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(form.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フィールドの詳細を取得
    const fields = await page.evaluate(() => {
      const elements = document.querySelectorAll('input, textarea, select');
      const result = [];

      elements.forEach(el => {
        if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

        let label = '';
        if (el.id) {
          const labelElement = document.querySelector(`label[for="${el.id}"]`);
          if (labelElement) label = labelElement.textContent.trim();
        }
        if (!label) {
          const parentLabel = el.closest('label');
          if (parentLabel) label = parentLabel.textContent.trim();
        }

        result.push({
          name: el.name,
          label: label,
          value: el.value || ''
        });
      });

      return result;
    });

    // 姓名フィールドをチェック
    const nameFields = fields.filter(f =>
      f.label.match(/^姓$|^名$|^セイ$|^メイ$|姓名|氏名/)
    );

    if (nameFields.length > 0) {
      console.log('姓名フィールド発見:');
      nameFields.forEach(f => {
        console.log(`  - Label: "${f.label}", Name: ${f.name}, Value: ${f.value}`);
      });
    } else {
      console.log('❌ 姓名フィールドなし\n');
      await browser.close();
      return;
    }

    // auto_contact_sender.jsのロジックを使用（最新版）
    await page.addScriptTag({ path: '/Users/saeki/Downloads/img/list_project/auto_contact_sender.js' });

    console.log('\n📝 フォーム入力テスト...\n');

    await new Promise(r => setTimeout(r, 15000));

    // 入力結果を確認
    const results = await page.evaluate(() => {
      const elements = document.querySelectorAll('input, textarea, select');
      const result = [];

      elements.forEach(el => {
        if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

        let label = '';
        if (el.id) {
          const labelElement = document.querySelector(`label[for="${el.id}"]`);
          if (labelElement) label = labelElement.textContent.trim();
        }
        if (!label) {
          const parentLabel = el.closest('label');
          if (parentLabel) label = parentLabel.textContent.trim();
        }

        if (label.match(/^姓$|^名$|^セイ$|^メイ$/)) {
          result.push({
            label: label,
            value: el.value || ''
          });
        }
      });

      return result;
    });

    console.log('入力結果:');
    results.forEach(r => {
      const expected =
        r.label === '姓' ? '森田' :
        r.label === '名' ? '憲治' :
        r.label === 'セイ' ? 'もりた' :
        r.label === 'メイ' ? 'けんじ' : '?';

      const status = r.value === expected ? '✅' : '❌';
      console.log(`  ${status} ${r.label}: "${r.value}" (期待値: "${expected}")`);
    });

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
}

(async () => {
  for (const form of FORMS_TO_TEST) {
    await testForm(form);
  }
  console.log('\n✅ テスト完了！');
})();
