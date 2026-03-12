const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // 税理士法人 トップのフォーム
  const url = 'https://www.top-zeirishi.net/form/top-zeirishinet/inquiry';

  console.log(`\n📋 郵便番号フィールド調査\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // 郵便番号フィールドの属性を調査
    const zipFields = await page.evaluate(() => {
      const elements = document.querySelectorAll('input');
      const zipFieldsInfo = [];

      elements.forEach(element => {
        const name = element.name || '';
        const id = element.id || '';
        const placeholder = element.placeholder || '';
        const type = element.type || '';

        // ラベルを取得
        let label = '';
        if (element.id) {
          const labelElement = document.querySelector(`label[for="${element.id}"]`);
          if (labelElement) label = labelElement.textContent.trim();
        }
        if (!label) {
          const parentLabel = element.closest('label');
          if (parentLabel) label = parentLabel.textContent.trim();
        }
        if (!label) {
          const tr = element.closest('tr');
          if (tr) {
            const th = tr.querySelector('th');
            if (th) label = th.textContent.trim();
          }
        }

        const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

        // 郵便番号に関連しそうなフィールドのみ抽出
        if (allText.match(/zip|postal|郵便|〒/)) {
          zipFieldsInfo.push({
            name: name,
            id: id,
            type: type,
            placeholder: placeholder,
            label: label,
            value: element.value
          });
        }
      });

      return zipFieldsInfo;
    });

    console.log('郵便番号関連フィールド:');
    console.log(JSON.stringify(zipFields, null, 2));

    console.log('\n⏰ 30秒間待機...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    console.error(error.stack);
  }

  await browser.close();
  console.log('\n✅ デバッグ完了！');
})();
