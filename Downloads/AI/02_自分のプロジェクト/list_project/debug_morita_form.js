const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://m-zj.com/contact/contact.html';

  console.log(`\n📋 森田税理士・社労士事務所のフォーム構造を調査中...\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const checkboxInfo = await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const result = [];

      checkboxes.forEach((cb, index) => {
        let label = '';
        if (cb.id) {
          const labelElement = document.querySelector(`label[for="${cb.id}"]`);
          if (labelElement) label = labelElement.textContent.trim();
        }
        if (!label) {
          const parentLabel = cb.closest('label');
          if (parentLabel) label = parentLabel.textContent.trim();
        }

        // 親要素のテキストも取得
        let parentText = '';
        if (cb.parentElement) {
          parentText = cb.parentElement.textContent.trim();
        }

        // 近くのテキストノードを探す
        let nearbyText = '';
        if (cb.nextSibling) {
          nearbyText = cb.nextSibling.textContent ? cb.nextSibling.textContent.trim() : '';
        }

        result.push({
          index: index,
          name: cb.name || '(なし)',
          id: cb.id || '(なし)',
          value: cb.value || '(なし)',
          label: label || '(なし)',
          parentText: parentText.substring(0, 100),
          nearbyText: nearbyText.substring(0, 50),
          required: cb.required,
          className: cb.className || '(なし)'
        });
      });

      return result;
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('全チェックボックスの詳細情報:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    checkboxInfo.forEach(cb => {
      console.log(`\n${cb.index + 1}番目のチェックボックス:`);
      console.log(`  Name: ${cb.name}`);
      console.log(`  ID: ${cb.id}`);
      console.log(`  Value: ${cb.value}`);
      console.log(`  Label: ${cb.label}`);
      console.log(`  Required: ${cb.required}`);
      console.log(`  Class: ${cb.className}`);
      console.log(`  Parent Text: ${cb.parentText}`);
      console.log(`  Nearby Text: ${cb.nearbyText}`);
    });

    // お問い合わせ内容のグループを特定
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('「お問い合わせ内容」グループの特定:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const inquiryCheckboxes = checkboxInfo.filter(cb =>
      cb.parentText.includes('お問い合わせ内容') ||
      cb.parentText.includes('創業') ||
      cb.parentText.includes('経営助言') ||
      cb.parentText.includes('その他・ご意見')
    );

    if (inquiryCheckboxes.length > 0) {
      console.log(`見つかりました！ ${inquiryCheckboxes.length}個のチェックボックス\n`);
      inquiryCheckboxes.forEach(cb => {
        console.log(`  ${cb.index + 1}. Name="${cb.name}" Parent="${cb.parentText.substring(0, 30)}..."`);
      });

      // 同じname属性のグループを探す
      const firstCheckbox = inquiryCheckboxes[0];
      console.log(`\n共通のname属性: "${firstCheckbox.name}"`);

      const sameNameGroup = checkboxInfo.filter(cb => cb.name === firstCheckbox.name);
      console.log(`\nこのnameを持つ全チェックボックス (${sameNameGroup.length}個):`);
      sameNameGroup.forEach(cb => {
        console.log(`  - "${cb.nearbyText || cb.parentText.substring(0, 30)}"`);
      });
    } else {
      console.log('❌ お問い合わせ内容グループが見つかりませんでした');
    }

    console.log('\n\n⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
