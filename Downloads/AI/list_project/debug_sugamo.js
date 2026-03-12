const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('調査中: https://sugamojizo.com/contact/\n');
  await page.goto('https://sugamojizo.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const result = await page.evaluate(() => {
    const fields = [];
    const elements = document.querySelectorAll('input, textarea, select');

    elements.forEach(element => {
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
      if (!label) {
        let parent = element.parentElement;
        while (parent && parent.tagName !== 'BODY') {
          const prevSibling = parent.previousElementSibling;
          if (prevSibling) {
            const text = prevSibling.textContent.trim();
            if (text && text.length < 100) {
              label = text;
              break;
            }
          }
          parent = parent.parentElement;
        }
      }

      const name = (element.name || '').toLowerCase();
      const id = (element.id || '').toLowerCase();
      const placeholder = (element.placeholder || '').toLowerCase();
      // 修正後: labelを含まない
      const allText = name + ' ' + id + ' ' + placeholder;
      const labelText = label.toLowerCase();

      fields.push({
        tagName: element.tagName,
        type: element.type,
        name: element.name,
        id: element.id,
        placeholder: element.placeholder || '',
        label: label.substring(0, 50),
        allText: allText.substring(0, 80),
        labelText: labelText.substring(0, 50),
        // 修正後: 英語はallText、日本語はlabelTextで判定
        matchCompanyEn: !!allText.match(/company|corp/),
        matchCompanyJp: !!labelText.match(/会社|法人|屋号|社名/),
        matchMessageEn: !!allText.match(/content|message|msg/),
        matchMessageJp: !!labelText.match(/問.*合|相談|詳細|内容/),
        matchTextarea: element.tagName === 'TEXTAREA'
      });
    });

    return fields;
  });

  console.log('=== 検出されたフィールド（修正後ロジック） ===\n');
  result.forEach((f, i) => {
    console.log('[' + (i + 1) + '] ' + f.tagName + ' (type=' + f.type + ')');
    console.log('    name: "' + f.name + '"');
    console.log('    id: "' + f.id + '"');
    console.log('    label: "' + f.label + '"');
    console.log('    allText (英語判定用): "' + f.allText + '"');
    console.log('    labelText (日本語判定用): "' + f.labelText + '"');
    console.log('    ▶ 会社名(英語): ' + (f.matchCompanyEn ? '✅' : '❌') + ' | 会社名(日本語): ' + (f.matchCompanyJp ? '✅' : '❌'));
    console.log('    ▶ メッセージ(英語): ' + (f.matchMessageEn ? '✅' : '❌') + ' | メッセージ(日本語): ' + (f.matchMessageJp ? '✅' : '❌'));
    console.log('    ▶ textarea: ' + (f.matchTextarea ? '✅' : '❌'));
    console.log('');
  });

  await browser.close();
})();
