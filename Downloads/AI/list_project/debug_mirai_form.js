const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.miraikaikei.or.jp/contact/';

  console.log(`\n📋 みらい会計税理士法人のフォーム調査\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // 全てのフィールドを調査
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
        if (!label && el.parentElement) {
          // 親要素のテキストを取得
          const parentText = el.parentElement.textContent.trim();
          if (parentText.length < 100) label = parentText;
        }

        result.push({
          tagName: el.tagName.toLowerCase(),
          type: el.type || 'text',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          label: label,
          value: el.value || ''
        });
      });

      return result;
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`フィールド一覧 (${fields.length}個):`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    fields.forEach((field, index) => {
      console.log(`${index + 1}. Label: "${field.label}"`);
      console.log(`   Name: ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Placeholder: ${field.placeholder}`);
      console.log(`   Type: ${field.type}`);

      // detectFieldType の判定をシミュレート
      const allText = `${field.name} ${field.id} ${field.placeholder} ${field.label}`.toLowerCase();

      console.log(`   AllText: "${allText}"`);

      // 会社名パターンチェック
      const companyMatch = allText.match(/company|会社|法人|屋号|corp|貴社|貴殿|事業/);
      console.log(`   会社名パターンマッチ: ${companyMatch ? '✅ YES' : '❌ NO'}`);

      // フルネームパターンチェック
      const nameMatch = allText.match(/name|名前|氏名|お名前|代表者|担当者/);
      const nameExclude = allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|事業/);
      console.log(`   フルネームパターンマッチ: ${nameMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   フルネーム除外パターンマッチ: ${nameExclude ? '✅ YES (除外される)' : '❌ NO (除外されない)'}`);

      if (companyMatch) {
        console.log(`   ➡️  判定: 会社名フィールド → "あなたのおかげ"`);
      } else if (nameMatch && !nameExclude) {
        console.log(`   ➡️  判定: フルネームフィールド → "森田憲治"`);
      } else {
        console.log(`   ➡️  判定: その他`);
      }

      console.log('');
    });

    console.log('\n⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
