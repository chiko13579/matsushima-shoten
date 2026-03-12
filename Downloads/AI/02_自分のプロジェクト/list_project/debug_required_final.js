const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function testSite(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('調査中: ' + url + '\n');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const result = await page.evaluate(() => {
    const fields = [];
    document.querySelectorAll('input, textarea, select').forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

      // ラベル取得
      let label = '';
      if (element.id) {
        const labelElement = document.querySelector('label[for="' + element.id + '"]');
        if (labelElement) label = labelElement.textContent.trim();
      }
      if (!label) {
        const parentLabel = element.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }

      // テーブル構造の場合
      if (!label) {
        const tr = element.closest('tr');
        if (tr) {
          const th = tr.querySelector('th');
          if (th) label = th.textContent.trim();
        }
      }

      // 必須チェック（修正後ロジック）
      let isRequired = element.required ||
        element.getAttribute('aria-required') === 'true' ||
        label.includes('必須') ||
        label.includes('*') ||
        label.includes('※');

      let detectedVia = isRequired ? 'label/element' : '';

      // 親要素の近くに「必須」があるか、または親のクラスに'required'が含まれるかチェック
      if (!isRequired) {
        let parent = element.parentElement;
        for (let i = 0; i < 4 && parent; i++) {
          // 親要素のクラスに'required'が含まれるかチェック
          if (parent.className && parent.className.toLowerCase().includes('required')) {
            isRequired = true;
            detectedVia = `親クラス${i+1}階層`;
            break;
          }

          // 親要素内に他のフォーム要素が5個以上ある場合はスキップ
          const formElementsInParent = parent.querySelectorAll('input:not([type="hidden"]), textarea, select');
          if (formElementsInParent.length >= 5) {
            parent = parent.parentElement;
            continue;
          }
          // 直接のテキストノードまたはラベル的な要素のみチェック
          const directText = Array.from(parent.childNodes)
            .filter(n => {
              if (n.nodeType === Node.TEXT_NODE) return true;
              if (n.nodeType === Node.ELEMENT_NODE) {
                return !n.querySelector('input, textarea, select') && n.textContent.length < 80;
              }
              return false;
            })
            .map(n => n.textContent || '')
            .join('');
          if (directText.includes('必須')) {
            isRequired = true;
            detectedVia = `親テキスト${i+1}階層`;
            break;
          }
          parent = parent.parentElement;
        }
      }

      fields.push({
        name: element.name || '',
        type: element.type,
        label: label.substring(0, 40),
        required: isRequired,
        detectedVia: detectedVia
      });
    });
    return fields;
  });

  console.log('=== 必須検出結果 ===\n');
  result.forEach((f, i) => {
    console.log(`[${i+1}] ${f.type} name="${f.name}"`);
    console.log(`    label: "${f.label}"`);
    console.log(`    必須: ${f.required ? '✅' : '❌'} ${f.detectedVia ? '(' + f.detectedVia + ')' : ''}`);
    console.log('');
  });

  await browser.close();
}

(async () => {
  console.log('========================================');
  await testSite('https://aikyo-gyosei.jp/inquiry/');

  console.log('\n========================================');
  await testSite('https://www.irohagyosei.jp/contact/');
})();
