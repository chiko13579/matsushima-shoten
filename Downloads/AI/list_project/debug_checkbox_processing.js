const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function debugCheckboxProcessing() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto('https://www.yuigonsyo.biz/contact/', { waitUntil: 'networkidle2' });

  const results = await page.evaluate(() => {
    const results = {
      subjectCheckboxes: [],
      replyCheckboxes: [],
      subjectSelector: null,
      replySelector: null
    };

    // subject[]チェックボックスを直接取得
    const subjectBoxes = document.querySelectorAll('input[type="checkbox"][name="subject[]"]');
    results.subjectCheckboxes = Array.from(subjectBoxes).map((cb, i) => {
      let label = '';
      if (cb.id) {
        const labelEl = document.querySelector(`label[for="${cb.id}"]`);
        if (labelEl) label = labelEl.textContent.trim();
      }
      if (!label && cb.closest('label')) {
        label = cb.closest('label').textContent.trim();
      }
      if (!label && cb.parentElement) {
        label = cb.parentElement.textContent.trim();
      }
      return { index: i, label, hasOther: label.match(/その他|other/i) ? true : false };
    });
    results.subjectSelector = `found ${subjectBoxes.length} checkboxes`;

    // reply[]チェックボックスを直接取得
    const replyBoxes = document.querySelectorAll('input[type="checkbox"][name="reply[]"]');
    results.replyCheckboxes = Array.from(replyBoxes).map((cb, i) => {
      let label = '';
      if (cb.id) {
        const labelEl = document.querySelector(`label[for="${cb.id}"]`);
        if (labelEl) label = labelEl.textContent.trim();
      }
      if (!label && cb.closest('label')) {
        label = cb.closest('label').textContent.trim();
      }
      if (!label && cb.parentElement) {
        label = cb.parentElement.textContent.trim();
      }
      return { index: i, label, hasOther: label.match(/その他|other/i) ? true : false };
    });
    results.replySelector = `found ${replyBoxes.length} checkboxes`;

    // processedCheckboxGroupsのシミュレーション
    const processedCheckboxGroups = new Set();
    const isInquiryTypeCheck = (name) => {
      return name.match(/subject|inquiry|項目|種類|category|type|reply|返信|連絡/i);
    };

    results.subjectIsInquiryType = !!isInquiryTypeCheck('subject[]');
    results.replyIsInquiryType = !!isInquiryTypeCheck('reply[]');

    return results;
  });

  console.log('=== チェックボックス処理デバッグ ===');
  console.log('\n--- subject[] チェックボックス ---');
  console.log('Selector result:', results.subjectSelector);
  console.log('isInquiryType:', results.subjectIsInquiryType);
  results.subjectCheckboxes.forEach(cb => {
    console.log(`  [${cb.index}] label="${cb.label}" hasOther=${cb.hasOther}`);
  });

  console.log('\n--- reply[] チェックボックス ---');
  console.log('Selector result:', results.replySelector);
  console.log('isInquiryType:', results.replyIsInquiryType);
  results.replyCheckboxes.forEach(cb => {
    console.log(`  [${cb.index}] label="${cb.label}" hasOther=${cb.hasOther}`);
  });

  await browser.close();
}

debugCheckboxProcessing().catch(console.error);
