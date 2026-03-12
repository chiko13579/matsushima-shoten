const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('調査中: https://ocean.jpn.com/contact/\n');
  await page.goto('https://ocean.jpn.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(() => {
    const fields = [];
    const elements = document.querySelectorAll('input[name="姓"], input[name="セイ"], input[name="メールアドレス"]');

    elements.forEach(element => {
      // 親要素を5階層まで遡ってHTML構造を確認
      let parentHTML = '';
      let parent = element.parentElement;
      for (let i = 0; i < 5 && parent; i++) {
        const text = parent.textContent.trim().substring(0, 200);
        const className = parent.className;
        const tagName = parent.tagName;

        // 必須テキストがあるか確認
        if (text.includes('必須')) {
          parentHTML += `\n    [${i+1}階層] <${tagName}> class="${className}"\n      ⭐ 「必須」発見! text: "${text}"`;
          break;
        } else {
          parentHTML += `\n    [${i+1}階層] <${tagName}> class="${className}" text長=${text.length}`;
        }
        parent = parent.parentElement;
      }

      fields.push({
        name: element.name,
        outerHTML: element.outerHTML.substring(0, 150),
        parentHTML: parentHTML
      });
    });

    // 「必須」を含む要素を直接探す
    const requiredElements = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.tagName === 'SPAN' || el.tagName === 'DIV' || el.tagName === 'P' || el.tagName === 'LABEL') {
        const directText = el.childNodes.length > 0 ?
          Array.from(el.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && !n.querySelector('input, textarea')))
            .map(n => n.textContent || '')
            .join('')
            .trim() : '';
        if (directText.includes('必須') && directText.length < 100) {
          requiredElements.push({
            tagName: el.tagName,
            className: el.className,
            text: directText.substring(0, 80)
          });
        }
      }
    });

    return { fields, requiredElements: requiredElements.slice(0, 15) };
  });

  console.log('=== 氏名・ふりがな・メールのHTML構造 ===\n');
  result.fields.forEach((f, i) => {
    console.log(`[${i+1}] name="${f.name}"`);
    console.log(`    HTML: ${f.outerHTML}`);
    console.log(`    親要素: ${f.parentHTML}`);
    console.log('');
  });

  console.log('\n=== 「必須」を含む要素 ===\n');
  result.requiredElements.forEach((el, i) => {
    console.log(`[${i+1}] <${el.tagName}> class="${el.className}"`);
    console.log(`    text: "${el.text}"`);
    console.log('');
  });

  await browser.close();
})();
