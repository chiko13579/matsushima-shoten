const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.kobayashi-tax-accountant.com/contact/';

  console.log(`\n📋 税理士 小林誉光事務所 - お名前フィールド調査\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // お名前を含むフィールドを探す
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
        if (!label) {
          const tr = el.closest('tr');
          if (tr) {
            const th = tr.querySelector('th');
            if (th) label = th.textContent.trim();
          }
        }
        if (!label) {
          const dt = el.closest('dd');
          if (dt) {
            const prevDt = dt.previousElementSibling;
            if (prevDt && prevDt.tagName === 'DT') {
              label = prevDt.textContent.trim();
            }
          }
        }

        // 名前、name、お名前を含むフィールド
        if ((label && (label.includes('名前') || label.includes('お名前') || label.includes('氏名'))) ||
            (el.name && (el.name.includes('name') || el.name.includes('名前'))) ||
            (el.placeholder && (el.placeholder.includes('名前') || el.placeholder.includes('お名前')))) {

          const allText = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${label}`.toLowerCase();

          result.push({
            tagName: el.tagName.toLowerCase(),
            type: el.type || 'text',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            label: label,
            allText: allText
          });
        }
      });

      return result;
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`「お名前」フィールド (${fields.length}個):`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    fields.forEach((field, index) => {
      console.log(`${index + 1}. Label: "${field.label}"`);
      console.log(`   Name: ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Placeholder: ${field.placeholder}`);
      console.log(`   Type: ${field.type}`);
      console.log(`   AllText: "${field.allText}"`);

      // fullNameパターンチェック
      const fullNameMatch = field.allText.match(/name|名前|氏名|お名前|代表者|担当者/);
      console.log(`   fullNameパターンマッチ: ${fullNameMatch ? `✅ YES (${fullNameMatch[0]})` : '❌ NO'}`);

      // 除外パターンチェック
      const exclusionMatch = field.allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|組織/);
      console.log(`   除外パターンマッチ: ${exclusionMatch ? `⚠️  YES (${exclusionMatch[0]}) - これが原因で入力されていない可能性` : '✅ NO'}`);

      console.log('');
    });

    console.log('\n⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
