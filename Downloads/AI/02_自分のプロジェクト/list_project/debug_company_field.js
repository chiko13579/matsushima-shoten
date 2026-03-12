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

const FORMS_TO_TEST = [
  { name: '中川税理士事務所', url: 'https://nakagawa-firm.com/inquiry/' },
  { name: 'アイネックス税理士法人', url: 'https://business.form-mailer.jp/fms/4d1a7ba5267478' },
  { name: '税理士法人SHIP', url: 'https://www.ship-ac.jp/contact' },
  { name: 'ＦＵＮ税理士法人', url: 'https://www.yama-cpa.com/contact/' },
  { name: 'りんく税理士法人', url: 'https://www.taxlink.jp/contact/' },
  { name: '税理士 小林誉光事務所', url: 'https://www.kobayashi-tax-accountant.com/contact/' },
  { name: 'みらい会計税理士法人', url: 'https://www.miraikaikei.or.jp/contact/' }
];

async function debugForm(form) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ${form.name}`);
  console.log(`🔗 ${form.url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(form.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // 「法人」「事業所」を含むフィールドを探す
    const companyFields = await page.evaluate(() => {
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

        const allText = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${label}`.toLowerCase();

        // 「法人」「事業所」「会社」を含むフィールド
        if (allText.match(/法人|事業所|会社|company|corp/)) {
          result.push({
            label: label,
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            type: el.type || el.tagName.toLowerCase(),
            value: el.value || ''
          });
        }
      });

      return result;
    });

    if (companyFields.length > 0) {
      console.log(`✅ 会社関連フィールド発見 (${companyFields.length}個):\n`);
      companyFields.forEach((field, index) => {
        console.log(`${index + 1}. Label: "${field.label}"`);
        console.log(`   Name: ${field.name}`);
        console.log(`   ID: ${field.id}`);
        console.log(`   Placeholder: ${field.placeholder}`);
        console.log(`   Type: ${field.type}`);
        console.log(`   Current Value: ${field.value}`);

        // detectFieldType の判定をシミュレート
        const allText = `${field.name} ${field.id} ${field.placeholder} ${field.label}`.toLowerCase();

        console.log(`   AllText: "${allText}"`);

        // 会社名パターンチェック
        const companyMatch = allText.match(/company|会社|法人|屋号|corp|貴社|貴殿/);
        console.log(`   会社名パターンマッチ: ${companyMatch ? '✅ YES' : '❌ NO'}`);

        // フルネームパターンチェック
        const nameMatch = allText.match(/name|名前|氏名|お名前|代表者|担当者/);
        const nameExclude = allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ/);
        console.log(`   フルネームパターンマッチ: ${nameMatch ? '✅ YES' : '❌ NO'}`);
        console.log(`   フルネーム除外パターンマッチ: ${nameExclude ? '✅ YES (除外される)' : '❌ NO (除外されない)'}`);

        if (companyMatch) {
          console.log(`   ➡️  判定: 会社名フィールド → "あなたのおかげ"`);
        } else if (nameMatch && !nameExclude) {
          console.log(`   ➡️  判定: フルネームフィールド → "森田憲治" ⚠️ 問題！`);
        } else {
          console.log(`   ➡️  判定: その他`);
        }

        console.log('');
      });

      console.log('\n⏰ 10秒間確認できます...');
      await new Promise(r => setTimeout(r, 10000));

      await browser.close();
      return true;
    } else {
      console.log('❌ 会社関連フィールドなし\n');
      await browser.close();
      return false;
    }

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    await browser.close();
    return false;
  }
}

(async () => {
  for (const form of FORMS_TO_TEST) {
    const found = await debugForm(form);
    if (found) {
      // 問題のフィールドが見つかったら詳細を表示
    }
  }
  console.log('\n✅ デバッグ完了！');
})();
