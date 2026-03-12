const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function debugSelector() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto('https://www.yuigonsyo.biz/contact/', { waitUntil: 'networkidle2' });

  const results = await page.evaluate(() => {
    const results = {};

    // subject[]のセレクターテスト
    const subjectBoxes = document.querySelectorAll('input[type="checkbox"][name="subject[]"]');
    results.subjectCount = subjectBoxes.length;
    results.subjectLabels = Array.from(subjectBoxes).map(cb => {
      let label = '';
      if (cb.closest('label')) {
        label = cb.closest('label').textContent.trim();
      }
      return label;
    });

    // その他を探すテスト
    let targetCheckbox = null;
    let targetLabel = '';
    subjectBoxes.forEach(cb => {
      let cbLabel = '';
      if (cb.closest('label')) {
        cbLabel = cb.closest('label').textContent.trim();
      }
      if (cbLabel.match(/その他|other/i) && !targetCheckbox) {
        targetCheckbox = cb;
        targetLabel = 'その他';
      }
    });

    results.foundOther = !!targetCheckbox;
    results.targetLabel = targetLabel;

    // 最初のオプションを探すテスト
    if (!targetCheckbox && subjectBoxes.length > 0) {
      targetCheckbox = subjectBoxes[0];
      let cbLabel = '';
      if (targetCheckbox.closest('label')) {
        cbLabel = targetCheckbox.closest('label').textContent.trim();
      }
      targetLabel = cbLabel || '最初の選択肢';
    }

    results.finalTarget = targetLabel;

    // clickテスト（実際にはクリックしない、要素が存在するかのみ確認）
    if (targetCheckbox) {
      results.canClick = typeof targetCheckbox.click === 'function';
    }

    return results;
  });

  console.log('=== subject[] セレクターテスト ===');
  console.log('チェックボックス数:', results.subjectCount);
  console.log('ラベル:', results.subjectLabels);
  console.log('「その他」が見つかった:', results.foundOther);
  console.log('targetLabel:', results.targetLabel);
  console.log('finalTarget:', results.finalTarget);
  console.log('click可能:', results.canClick);

  await browser.close();
}

debugSelector().catch(console.error);
