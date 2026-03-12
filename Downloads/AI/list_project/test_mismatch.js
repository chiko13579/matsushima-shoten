const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('株式会社ウィルビーのフォーム矛盾チェックをテスト...\n');

  await page.goto('https://willbe-inc.co.jp/contact/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('input, textarea, select'));

    // フォーム実装矛盾の検出
    const formMismatchCheck = () => {
      const getLabel = (el) => {
        if (el.id) {
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          if (labelEl) return labelEl.textContent.trim();
        }
        if (el.closest('label')) {
          return el.closest('label').textContent.trim();
        }
        return el.placeholder || '';
      };

      for (const el of elements) {
        if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;
        const name = (el.name || '').toLowerCase();
        const label = getLabel(el);

        // name属性に「email」が含まれるのにラベルが「名」「姓」「氏名」系
        if (name.includes('email') && label.match(/^名$|^姓$|^氏名$|^お名前$/)) {
          return { hasMismatch: true, reason: `name="${el.name}" にラベル「${label}」が設定されています`, name: el.name, label };
        }
        // name属性に「name」が含まれるのにラベルが「メール」系
        if (name.match(/\bname\b/) && !name.includes('company') && label.match(/メール|email/i)) {
          return { hasMismatch: true, reason: `name="${el.name}" にラベル「${label}」が設定されています`, name: el.name, label };
        }
        // name属性に「tel」「phone」が含まれるのにラベルが住所系
        if (name.match(/tel|phone/) && label.match(/住所|郵便|address/i)) {
          return { hasMismatch: true, reason: `name="${el.name}" にラベル「${label}」が設定されています`, name: el.name, label };
        }
      }
      return { hasMismatch: false };
    };

    return formMismatchCheck();
  });

  if (result.hasMismatch) {
    console.log('✅ 矛盾検出成功！');
    console.log(`   理由: ${result.reason}`);
    console.log('   → このサイトは自動でスキップされます');
  } else {
    console.log('❌ 矛盾が検出されませんでした');
  }

  await browser.close();
})();
