const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('調査中: https://aikyo-gyosei.jp/inquiry/\n');
  await page.goto('https://aikyo-gyosei.jp/inquiry/', { waitUntil: 'domcontentloaded', timeout: 30000 });
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
      const allText = name + ' ' + id + ' ' + placeholder;
      const labelText = label.toLowerCase();
      const nameAttr = element.name || '';

      // 新しい検出ロジック
      let detectedType = 'unknown';

      // 最優先: name属性に日本語キーワードがある場合
      if (nameAttr.match(/ふりがな|フリガナ/)) {
        detectedType = 'fullNameKana';
      } else if (nameAttr.match(/^お?名前$/) && !nameAttr.match(/社名|会社/)) {
        detectedType = 'fullName';
      } else if (labelText.match(/名前|氏名|お名前/)) {
        detectedType = 'fullName (via label)';
      }

      fields.push({
        tagName: element.tagName,
        type: element.type,
        name: element.name,
        label: label.substring(0, 50),
        nameAttr: nameAttr,
        detectedType: detectedType
      });
    });

    return fields;
  });

  console.log('=== フィールド検出結果（修正後ロジック） ===\n');
  result.forEach((f, i) => {
    console.log('[' + (i + 1) + '] ' + f.tagName + ' (type=' + f.type + ')');
    console.log('    name属性: "' + f.name + '"');
    console.log('    label: "' + f.label + '"');
    console.log('    ▶ 検出タイプ: ' + f.detectedType);
    console.log('');
  });

  await browser.close();
})();
