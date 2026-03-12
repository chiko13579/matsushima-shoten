const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://isshoni.co.jp/contact/';

  console.log(`\n📋 いっしょに税理士法人のフォームをチェック中...\n`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // 全フィールドの情報を取得
  const allFields = await page.evaluate(() => {
    const elements = document.querySelectorAll('input, textarea, select');
    const result = [];

    elements.forEach(element => {
      if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') {
        return;
      }

      let label = '';
      if (element.id) {
        const labelElement = document.querySelector(`label[for="${element.id}"]`);
        if (labelElement) label = labelElement.textContent.trim();
      }
      if (!label) {
        const parentLabel = element.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }

      // 親要素から見出しを探す
      let heading = '';
      let parent = element.closest('.field, .form-group, div, fieldset');
      if (parent) {
        const h3 = parent.querySelector('h3, h4, legend, .field-title');
        if (h3) heading = h3.textContent.trim();
      }

      // 必須チェック
      const isRequired = element.required ||
                        element.getAttribute('aria-required') === 'true' ||
                        label.includes('必須') ||
                        label.includes('*') ||
                        label.includes('※') ||
                        (heading && (heading.includes('必須') || heading.includes('*')));

      result.push({
        type: element.type || element.tagName.toLowerCase(),
        name: element.name || '',
        id: element.id || '',
        placeholder: element.placeholder || '',
        label: label,
        heading: heading,
        required: isRequired,
        value: element.value || ''
      });
    });

    return result;
  });

  console.log('全フィールド一覧:\n');
  allFields.forEach((field, i) => {
    const requiredMark = field.required ? '[必須]' : '';
    console.log(`${i + 1}. ${requiredMark} ${field.heading || field.label || field.name || field.placeholder || '(ラベルなし)'}`);
    console.log(`   Type: ${field.type}`);
    console.log(`   Name: ${field.name}`);
    console.log(`   Label: ${field.label}`);
    if (field.value) console.log(`   Current Value: ${field.value}`);
    console.log('');
  });

  const requiredFields = allFields.filter(f => f.required);
  console.log(`\n📊 必須フィールド: ${requiredFields.length}個`);
  requiredFields.forEach(field => {
    console.log(`   - ${field.heading || field.label || field.name || '(ラベルなし)'} (${field.type})`);
  });

  // ラジオボタングループを確認
  console.log('\n\n📻 ラジオボタングループ:\n');
  const radioGroups = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    const groups = {};

    radios.forEach(radio => {
      const name = radio.name || '(no-name)';
      if (!groups[name]) {
        groups[name] = [];
      }

      let label = '';
      if (radio.id) {
        const labelElement = document.querySelector(`label[for="${radio.id}"]`);
        if (labelElement) label = labelElement.textContent.trim();
      }
      if (!label) {
        const parentLabel = radio.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }

      // 親要素から見出しを探す
      let heading = '';
      let parent = radio.closest('.field, .form-group, div, fieldset');
      if (parent) {
        const h3 = parent.querySelector('h3, h4, legend, .field-title');
        if (h3) heading = h3.textContent.trim();
      }

      groups[name].push({
        label: label,
        value: radio.value,
        heading: heading
      });
    });

    return groups;
  });

  Object.keys(radioGroups).forEach(name => {
    const group = radioGroups[name];
    console.log(`グループ: ${name}`);
    if (group[0] && group[0].heading) {
      console.log(`   見出し: ${group[0].heading}`);
    }
    group.forEach((radio, i) => {
      console.log(`   ${i + 1}. ${radio.label} (value: ${radio.value})`);
    });
    console.log('');
  });

  // チェックボックスグループを確認
  console.log('\n\n☑️  チェックボックスグループ:\n');
  const checkboxGroups = await page.evaluate(() => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const groups = {};

    checkboxes.forEach(checkbox => {
      const name = checkbox.name || '(no-name)';
      if (!groups[name]) {
        groups[name] = [];
      }

      let label = '';
      if (checkbox.id) {
        const labelElement = document.querySelector(`label[for="${checkbox.id}"]`);
        if (labelElement) label = labelElement.textContent.trim();
      }
      if (!label) {
        const parentLabel = checkbox.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }

      // 親要素から見出しを探す
      let heading = '';
      let parent = checkbox.closest('.field, .form-group, div, fieldset');
      if (parent) {
        const h3 = parent.querySelector('h3, h4, legend, .field-title');
        if (h3) heading = h3.textContent.trim();
      }

      groups[name].push({
        label: label,
        value: checkbox.value,
        heading: heading
      });
    });

    return groups;
  });

  Object.keys(checkboxGroups).forEach(name => {
    const group = checkboxGroups[name];
    console.log(`グループ: ${name}`);
    if (group[0] && group[0].heading) {
      console.log(`   見出し: ${group[0].heading}`);
    }
    group.forEach((checkbox, i) => {
      console.log(`   ${i + 1}. ${checkbox.label} (value: ${checkbox.value})`);
    });
    console.log('');
  });

  console.log('\n\n⏰ 30秒間フォームを確認できます...');
  await new Promise(r => setTimeout(r, 30000));

  await browser.close();
})();
