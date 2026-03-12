const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('テスト: https://kayaharajimusyo.com/contact.html\n');
  await page.goto('https://kayaharajimusyo.com/contact.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));

  // ページ構造を調査
  const result = await page.evaluate(() => {
    const info = {
      title: document.title,
      url: window.location.href,
      iframes: [],
      formCount: document.querySelectorAll('form').length,
      inputCount: document.querySelectorAll('input').length,
      textareaCount: document.querySelectorAll('textarea').length,
      html: document.body.innerHTML.substring(0, 3000)
    };

    // iframe調査
    document.querySelectorAll('iframe').forEach(iframe => {
      info.iframes.push({
        src: iframe.src || '(no src)',
        id: iframe.id || '',
        name: iframe.name || ''
      });
    });

    return info;
  });

  console.log('=== ページ情報 ===');
  console.log(`タイトル: ${result.title}`);
  console.log(`URL: ${result.url}`);
  console.log(`form数: ${result.formCount}`);
  console.log(`input数: ${result.inputCount}`);
  console.log(`textarea数: ${result.textareaCount}`);

  console.log('\n=== iframe ===');
  if (result.iframes.length === 0) {
    console.log('(なし)');
  } else {
    result.iframes.forEach((f, i) => {
      console.log(`[${i+1}] src: ${f.src}`);
    });
  }

  console.log('\n=== HTML抜粋 ===');
  console.log(result.html.substring(0, 1500));

  console.log('\n⏰ 30秒間確認できます');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
})();
