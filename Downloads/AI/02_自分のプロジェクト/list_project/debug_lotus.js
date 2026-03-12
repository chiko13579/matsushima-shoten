const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://office-lotus.com/inquiry', { waitUntil: 'networkidle2' });

  const result = await page.evaluate(() => {
    const buttons = [];

    // button, input[type=submit], input[type=button]
    document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach(el => {
      buttons.push({
        tag: el.tagName,
        type: el.type,
        text: (el.textContent || el.value || '').trim(),
        className: el.className,
        visible: el.offsetWidth > 0 && el.offsetHeight > 0
      });
    });

    // aタグで送信っぽいもの
    document.querySelectorAll('a').forEach(el => {
      const text = (el.textContent || '').trim();
      const className = el.className || '';
      if (text.length < 20 && (text.match(/送信|submit|確認|登録/i) || className.match(/submit|btn|button/i))) {
        buttons.push({
          tag: 'A',
          text: text,
          className: className,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        });
      }
    });

    // 全てのボタンっぽい要素
    document.querySelectorAll('[role="button"], .btn, .button, [type="submit"], .submit').forEach(el => {
      buttons.push({
        tag: el.tagName,
        text: (el.textContent || el.value || '').trim().substring(0, 50),
        className: el.className,
        role: el.getAttribute('role'),
        visible: el.offsetWidth > 0 && el.offsetHeight > 0,
        width: el.offsetWidth,
        height: el.offsetHeight
      });
    });

    return buttons;
  });

  console.log('=== 検出されたボタン/リンク ===');
  result.forEach((b, i) => {
    console.log('[' + i + '] ' + b.tag + ' | text: "' + b.text + '" | class: ' + b.className + ' | visible: ' + b.visible);
    if (b.width) console.log('    size: ' + b.width + 'x' + b.height);
  });

  // フォーム内の全ての要素を確認
  const formElements = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return 'No form found';

    const elements = [];
    form.querySelectorAll('*').forEach(el => {
      if (el.tagName.match(/BUTTON|INPUT|A/) || el.className.match(/submit|btn|button/i)) {
        elements.push({
          tag: el.tagName,
          type: el.type || '',
          text: (el.textContent || el.value || '').trim().substring(0, 30),
          className: el.className,
          visible: el.offsetWidth > 0
        });
      }
    });
    return elements;
  });

  console.log('\n=== フォーム内の要素 ===');
  if (typeof formElements === 'string') {
    console.log(formElements);
  } else {
    formElements.forEach((el, i) => {
      console.log('[' + i + '] ' + el.tag + ' type=' + el.type + ' | "' + el.text + '" | class: ' + el.className + ' | visible: ' + el.visible);
    });
  }

  await browser.close();
})();
