const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://m-zj.com/contact/contact.html';

  console.log(`\n📋 森田税理士・社労士事務所のフォーム構造を調査中...\n`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('ページ読み込み完了\n');

    // iframeの確認
    const frames = page.frames();
    console.log(`フレーム数: ${frames.length}`);
    frames.forEach((frame, i) => {
      console.log(`  ${i}. ${frame.url()}`);
    });

    // 5秒待機
    console.log('\n5秒待機中...');
    await new Promise(r => setTimeout(r, 5000));

    // 全フィールドを取得
    const allFields = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      const result = {
        total: inputs.length,
        byType: {}
      };

      inputs.forEach(input => {
        const type = input.type || input.tagName.toLowerCase();
        if (!result.byType[type]) result.byType[type] = 0;
        result.byType[type]++;
      });

      return result;
    });

    console.log(`\n全フィールド数: ${allFields.total}`);
    console.log('タイプ別:');
    Object.entries(allFields.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}個`);
    });

    // チェックボックス詳細
    const checkboxDetails = await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const result = [];

      checkboxes.forEach((cb, index) => {
        // 周辺のテキストを様々な方法で取得
        let texts = [];

        // 1. label[for]
        if (cb.id) {
          const label = document.querySelector(`label[for="${cb.id}"]`);
          if (label) texts.push(`label[for]: ${label.textContent.trim()}`);
        }

        // 2. 親のlabel
        const parentLabel = cb.closest('label');
        if (parentLabel) texts.push(`parent label: ${parentLabel.textContent.trim().substring(0, 50)}`);

        // 3. 次の兄弟要素
        if (cb.nextElementSibling) {
          texts.push(`next sibling: ${cb.nextElementSibling.textContent.trim().substring(0, 50)}`);
        }

        // 4. 親要素
        if (cb.parentElement) {
          texts.push(`parent: ${cb.parentElement.textContent.trim().substring(0, 50)}`);
        }

        // 5. 前の兄弟要素
        if (cb.previousElementSibling) {
          texts.push(`prev sibling: ${cb.previousElementSibling.textContent.trim().substring(0, 50)}`);
        }

        result.push({
          index: index + 1,
          name: cb.name,
          id: cb.id,
          value: cb.value,
          className: cb.className,
          texts: texts
        });
      });

      return result;
    });

    if (checkboxDetails.length > 0) {
      console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`チェックボックス詳細 (${checkboxDetails.length}個):`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      checkboxDetails.forEach(cb => {
        console.log(`${cb.index}番目:`);
        console.log(`  name="${cb.name}" id="${cb.id}" value="${cb.value}"`);
        console.log(`  class="${cb.className}"`);
        console.log(`  周辺テキスト:`);
        cb.texts.forEach(text => {
          console.log(`    - ${text}`);
        });
        console.log('');
      });
    } else {
      console.log('\n❌ チェックボックスが見つかりません');
    }

    // iframeの中を探す
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame === page.mainFrame()) continue;

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`iframe ${i}の中を調査: ${frame.url()}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      try {
        const iframeCheckboxes = await frame.evaluate(() => {
          const checkboxes = document.querySelectorAll('input[type="checkbox"]');
          return checkboxes.length;
        });

        console.log(`  チェックボックス数: ${iframeCheckboxes}`);

        if (iframeCheckboxes > 0) {
          const iframeDetails = await frame.evaluate(() => {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            const result = [];

            checkboxes.forEach((cb, index) => {
              let label = '';
              if (cb.id) {
                const labelEl = document.querySelector(`label[for="${cb.id}"]`);
                if (labelEl) label = labelEl.textContent.trim();
              }
              if (!label && cb.nextElementSibling) {
                label = cb.nextElementSibling.textContent.trim();
              }

              result.push({
                index: index + 1,
                name: cb.name,
                label: label.substring(0, 50)
              });
            });

            return result;
          });

          console.log('\n  詳細:');
          iframeDetails.forEach(cb => {
            console.log(`    ${cb.index}. name="${cb.name}" label="${cb.label}"`);
          });
        }
      } catch (e) {
        console.log(`  エラー: ${e.message}`);
      }
    }

    console.log('\n\n⏰ 30秒間ブラウザを開いています...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
