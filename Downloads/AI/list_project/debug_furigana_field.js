const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const SENDER_INFO = {
  fullNameKana: 'もりたけんじ'
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // 税理士法人テラスのフォーム
  const url = 'https://trc-tax.com/contact';

  console.log(`\n📋 ふりがなフィールド調査\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // ふりがなフィールドを探す
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
          const dd = el.closest('dd');
          if (dd) {
            const prevDt = dd.previousElementSibling;
            if (prevDt && prevDt.tagName === 'DT') {
              label = prevDt.textContent.trim();
            }
          }
        }

        // ふりがな、かな を含むフィールド
        if ((label && (label.includes('ふりがな') || label.includes('フリガナ') || label.includes('かな'))) ||
            (el.name && (el.name.includes('kana') || el.name.includes('furigana'))) ||
            (el.placeholder && (el.placeholder.includes('ふりがな') || el.placeholder.includes('かな')))) {

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
    console.log(`ふりがなフィールド (${fields.length}個):`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    fields.forEach((field, index) => {
      console.log(`${index + 1}. Label: "${field.label}"`);
      console.log(`   Name: ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Placeholder: ${field.placeholder}`);
      console.log(`   Type: ${field.type}`);
      console.log(`   AllText: "${field.allText}"`);

      // 検出パターンチェック
      const lastNameKanaMatch = field.allText.match(/kana.*head|head.*kana|last.*kana|lastnamekana|せい.*かな/);
      const firstNameKanaMatch = field.allText.match(/kana.*body|body.*kana|first.*kana|firstnamekana|めい.*かな/);
      const fullNameKanaMatch = field.allText.match(/kana|かな|ふりがな|フリガナ/);
      const exclusionMatch = field.allText.match(/会社|法人|姓名|氏名|お名前/);

      console.log(`   lastNameKanaマッチ: ${lastNameKanaMatch ? `YES (${lastNameKanaMatch[0]})` : 'NO'}`);
      console.log(`   firstNameKanaマッチ: ${firstNameKanaMatch ? `YES (${firstNameKanaMatch[0]})` : 'NO'}`);
      console.log(`   fullNameKanaマッチ: ${fullNameKanaMatch ? `YES (${fullNameKanaMatch[0]})` : 'NO'}`);
      console.log(`   除外パターン: ${exclusionMatch ? `YES (${exclusionMatch[0]})` : 'NO'}`);

      if (lastNameKanaMatch) {
        console.log(`   → lastNameKana として検出される`);
      } else if (firstNameKanaMatch && !exclusionMatch) {
        console.log(`   → firstNameKana として検出される`);
      } else if (fullNameKanaMatch && !exclusionMatch) {
        console.log(`   → fullNameKana として検出される`);
      } else {
        console.log(`   → ❌ 検出されない`);
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
