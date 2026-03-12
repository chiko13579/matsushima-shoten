const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function debugHtmlStructure() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto('https://www.yuigonsyo.biz/contact/', { waitUntil: 'networkidle2' });

  const results = await page.evaluate(() => {
    const results = [];

    // subject[]チェックボックスの親要素を確認
    const subjectBoxes = document.querySelectorAll('input[type="checkbox"][name="subject[]"]');
    results.push('\n=== subject[] チェックボックスのHTML構造 ===');
    subjectBoxes.forEach((cb, i) => {
      results.push(`\n[${i}] subject[] チェックボックス:`);

      // 親要素を辿る
      let parent = cb.parentElement;
      for (let depth = 0; depth < 5 && parent; depth++) {
        results.push(`  親${depth}: <${parent.tagName.toLowerCase()}> "${parent.textContent.trim().substring(0, 50)}..."`);
        parent = parent.parentElement;
      }

      // 兄弟要素を確認
      let sibling = cb.previousElementSibling;
      if (sibling) {
        results.push(`  前の兄弟: <${sibling.tagName.toLowerCase()}> "${sibling.textContent.trim().substring(0, 50)}"`);
      }
    });

    // reply[]チェックボックスの親要素を確認
    const replyBoxes = document.querySelectorAll('input[type="checkbox"][name="reply[]"]');
    results.push('\n\n=== reply[] チェックボックスのHTML構造 ===');
    replyBoxes.forEach((cb, i) => {
      results.push(`\n[${i}] reply[] チェックボックス:`);

      // 親要素を辿る
      let parent = cb.parentElement;
      for (let depth = 0; depth < 5 && parent; depth++) {
        results.push(`  親${depth}: <${parent.tagName.toLowerCase()}> "${parent.textContent.trim().substring(0, 50)}..."`);
        parent = parent.parentElement;
      }
    });

    // 親を複数階層辿ってラベルを取得するロジックのシミュレーション
    results.push('\n\n=== ラベル取得シミュレーション ===');
    const firstSubject = subjectBoxes[0];
    let parent = firstSubject.parentElement;
    for (let depth = 0; depth < 5 && parent; depth++) {
      let sibling = parent.previousElementSibling;
      if (sibling) {
        const tag = sibling.tagName.toLowerCase();
        if (['p', 'span', 'label', 'dt', 'h2', 'h3', 'h4', 'h5'].includes(tag)) {
          if (!sibling.querySelector('input, textarea, select')) {
            const text = sibling.textContent.trim();
            if (text.length > 0 && text.length <= 20) {
              results.push(`  深さ${depth}の兄弟: <${tag}> "${text}" (これがラベルとして取得される可能性)`);
            }
          }
        }
      }
      parent = parent.parentElement;
    }

    return results;
  });

  console.log(results.join('\n'));

  await browser.close();
}

debugHtmlStructure().catch(console.error);
