const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const contactUrls = [
  { name: '税理士法人テラス', url: 'https://trc-tax.com/contact' }
];

async function analyzeContactForm(page, url, name) {
  try {
    console.log(`\n📋 ${name} を分析中...`);
    console.log(`   URL: ${url}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const formFields = await page.evaluate(() => {
      const fields = [];

      // すべてのフォーム要素を取得
      const inputs = document.querySelectorAll('input, textarea, select');

      inputs.forEach(element => {
        // 非表示フィールドやボタンは除外
        if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') {
          return;
        }

        // ラベルを探す
        let label = '';

        // 1. label要素で関連付けられている場合
        if (element.id) {
          const labelElement = document.querySelector(`label[for="${element.id}"]`);
          if (labelElement) {
            label = labelElement.textContent.trim();
          }
        }

        // 2. 親要素のlabelを探す
        if (!label) {
          const parentLabel = element.closest('label');
          if (parentLabel) {
            label = parentLabel.textContent.trim();
          }
        }

        // 3. placeholder属性
        if (!label && element.placeholder) {
          label = `[placeholder: ${element.placeholder}]`;
        }

        // 4. name属性
        if (!label && element.name) {
          label = `[name: ${element.name}]`;
        }

        // 5. 前の要素を探す
        if (!label) {
          let prevElement = element.previousElementSibling;
          while (prevElement) {
            const text = prevElement.textContent.trim();
            if (text && text.length < 100) {
              label = `[prev: ${text}]`;
              break;
            }
            prevElement = prevElement.previousElementSibling;
          }
        }

        fields.push({
          type: element.tagName.toLowerCase() === 'select' ? 'select' : element.type || 'text',
          label: label || '[ラベルなし]',
          name: element.name || '',
          id: element.id || '',
          required: element.required || false,
          placeholder: element.placeholder || ''
        });
      });

      return fields;
    });

    console.log(`   フォーム項目数: ${formFields.length}`);
    formFields.forEach((field, index) => {
      console.log(`   ${index + 1}. [${field.type}] ${field.label}${field.required ? ' (必須)' : ''}`);
      if (field.placeholder) {
        console.log(`      placeholder: ${field.placeholder}`);
      }
    });

    return {
      name,
      url,
      fields: formFields
    };

  } catch (error) {
    console.error(`   ❌ エラー: ${error.message}`);
    return {
      name,
      url,
      error: error.message,
      fields: []
    };
  }
}

async function main() {
  console.log('🚀 お問合せフォームの項目を分析します\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const results = [];

  for (const contact of contactUrls) {
    const result = await analyzeContactForm(page, contact.url, contact.name);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  await browser.close();

  // 集計
  console.log('\n\n📊 ===== 分析結果まとめ =====\n');

  const allFieldLabels = {};
  results.forEach(result => {
    if (result.fields && result.fields.length > 0) {
      result.fields.forEach(field => {
        const cleanLabel = field.label.replace(/\[.*?\]/g, '').trim();
        if (cleanLabel) {
          allFieldLabels[cleanLabel] = (allFieldLabels[cleanLabel] || 0) + 1;
        }
      });
    }
  });

  console.log('よく使われるフォーム項目（上位20個）：');
  const sorted = Object.entries(allFieldLabels)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  sorted.forEach(([label, count], index) => {
    console.log(`${index + 1}. ${label} (${count}サイト)`);
  });

  // JSON出力
  fs.writeFileSync('contact_form_analysis.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('\n✅ 詳細結果を contact_form_analysis.json に保存しました');
}

main();
