const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.top-zeirishi.net/form/top-zeirishinet/inquiry';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 税理士法人 トップ - 「所属部署」フィールド調査`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // 「所属部署」フィールドを探す
    const field = await page.evaluate(() => {
      const elements = document.querySelectorAll('input, textarea, select');
      let result = null;

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

        // 「所属部署」を含むラベル
        if (label.includes('所属部署') || label.includes('部署')) {
          const allText = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${label}`.toLowerCase();

          result = {
            tagName: el.tagName.toLowerCase(),
            type: el.type || 'text',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            label: label,
            value: el.value || '',
            allText: allText
          };
        }
      });

      return result;
    });

    if (field) {
      console.log(`「所属部署」フィールド詳細:\n`);
      console.log(`   TagName: ${field.tagName.toUpperCase()}`);
      console.log(`   Type: ${field.type}`);
      console.log(`   Name: "${field.name}"`);
      console.log(`   ID: "${field.id}"`);
      console.log(`   Placeholder: "${field.placeholder}"`);
      console.log(`   Label: "${field.label}"`);
      console.log(`   Value: "${field.value}"`);
      console.log(`   AllText: "${field.allText}"`);

      console.log(`\n検出パターンチェック:`);

      // fullName検出パターン
      const nameMatch = field.allText.match(/name|名前|氏名|お名前|代表者|担当者/);
      const exclusionMatch = field.allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|組織/);

      console.log(`   name系パターンマッチ: ${nameMatch ? `YES (${nameMatch[0]})` : 'NO'}`);
      console.log(`   除外パターンマッチ: ${exclusionMatch ? `YES (${exclusionMatch[0]})` : 'NO'}`);

      if (nameMatch && !exclusionMatch) {
        console.log(`\n   → ❌ fullName として誤検出される！`);
        console.log(`   理由: "${nameMatch[0]}" がマッチ、除外パターンなし`);
      } else {
        console.log(`\n   → ✅ fullName として検出されない`);
      }

      // company検出パターン
      const companyMatch = field.allText.match(/company|会社|法人|屋号|corp|貴社|貴殿|組織|organization/);
      console.log(`\n   company系パターンマッチ: ${companyMatch ? `YES (${companyMatch[0]})` : 'NO'}`);

      // department検出パターン（追加すべき）
      const departmentMatch = field.allText.match(/department|部署|部門|所属/);
      console.log(`   department系パターンマッチ: ${departmentMatch ? `YES (${departmentMatch[0]})` : 'NO'}`);
    } else {
      console.log(`❌ 「所属部署」フィールドが見つかりませんでした`);
    }

    console.log('\n⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    console.error(error.stack);
  }

  await browser.close();
})();
