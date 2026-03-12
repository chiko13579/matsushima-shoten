const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const SENDER_INFO = {
  lastName: '森田',
  firstName: '憲治',
  fullName: '森田憲治',
  lastNameKana: 'もりた',
  firstNameKana: 'けんじ',
  fullNameKana: 'もりたけんじ',
  company: 'あなたのおかげ',
  email: 'info@anatano-okage.com',
  tel: '090-9174-9043',
  tel1: '090',
  tel2: '9174',
  tel3: '9043',
  zip: '470-2303',
  zip1: '470',
  zip2: '2303',
  address: '愛知県知多郡武豊町祠峰1-91',
  prefecture: '愛知県',
  city: '知多郡武豊町',
  industry: 'マーケティング',
  message: `お世話になっております。
「あなたのおかげデザイン」の森田と申します。

テスト送信です。`
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.miraikaikei.or.jp/contact/';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 みらい会計税理士法人 - 修正後テスト`);
  console.log(`🔗 ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    // auto_contact_sender.jsをページに注入
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // 修正後のdetectFieldType関数を使用してフォーム入力
    const result = await page.evaluate((SENDER_INFO) => {
      const filledFields = [];
      const elements = document.querySelectorAll('input, textarea, select');

      function detectFieldType(element) {
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const label = element.label || '';
        const type = element.type || '';
        const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

        // 会社名（貴社、貴殿も含む）
        if (allText.match(/company|会社|法人|屋号|corp|貴社|貴殿|事業/)) {
          return { type: 'company', value: SENDER_INFO.company };
        }

        // メールアドレス
        if (type === 'email' || allText.match(/mail|メール/)) {
          return { type: 'email', value: SENDER_INFO.email };
        }

        // 電話番号
        if (allText.match(/tel1|phone1|電話1/)) return { type: 'tel1', value: SENDER_INFO.tel1 };
        if (allText.match(/tel2|phone2|電話2/)) return { type: 'tel2', value: SENDER_INFO.tel2 };
        if (allText.match(/tel3|phone3|電話3/)) return { type: 'tel3', value: SENDER_INFO.tel3 };
        if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) {
          return { type: 'tel', value: SENDER_INFO.tel };
        }

        // お問合せ内容
        if (element.tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) {
          return { type: 'message', value: SENDER_INFO.message };
        }

        // フルネーム
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp|貴社|貴殿|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|姓(?!名)|苗字|みょうじ|事業/)) {
          return { type: 'fullName', value: SENDER_INFO.fullName };
        }

        return { type: 'other', value: '' };
      }

      elements.forEach(element => {
        if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') return;

        // 修正版: テーブル構造からラベルを取得
        let label = '';
        if (element.id) {
          const labelElement = document.querySelector(`label[for="${element.id}"]`);
          if (labelElement) label = labelElement.textContent.trim();
        }
        if (!label) {
          const parentLabel = element.closest('label');
          if (parentLabel) label = parentLabel.textContent.trim();
        }
        // テーブル構造の場合、tr内のth要素からラベルを取得
        if (!label) {
          const tr = element.closest('tr');
          if (tr) {
            const th = tr.querySelector('th');
            if (th) label = th.textContent.trim();
          }
        }

        const fieldInfo = {
          tagName: element.tagName.toLowerCase(),
          type: element.type || 'text',
          name: element.name || '',
          id: element.id || '',
          placeholder: element.placeholder || '',
          label: label
        };

        const detection = detectFieldType(fieldInfo);

        if (detection.type !== 'other' && detection.value && fieldInfo.type !== 'checkbox' && fieldInfo.type !== 'radio' && fieldInfo.tagName !== 'select') {
          element.value = detection.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filledFields.push({
            label: fieldInfo.label || fieldInfo.name || fieldInfo.id,
            detectedType: detection.type,
            filledValue: detection.value
          });
        }
      });

      return filledFields;
    }, SENDER_INFO);

    console.log(`✅ 入力完了: ${result.length}項目\n`);

    // 結果を表示
    result.forEach(field => {
      const icon = field.detectedType === 'company' ? '✅ 会社名' :
                   field.detectedType === 'fullName' ? '✅ 個人名' :
                   field.detectedType === 'email' ? '📧' :
                   field.detectedType === 'tel' ? '📞' :
                   field.detectedType === 'message' ? '📝' : '✓';

      const value = field.filledValue.length > 30 ? field.filledValue.substring(0, 30) + '...' : field.filledValue;
      console.log(`   ${icon} ${field.label}: "${value}"`);
    });

    // 「法人名または事業所名」フィールドをチェック
    const companyField = result.find(f => f.label.includes('法人名または事業所名'));
    if (companyField) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      if (companyField.filledValue === 'あなたのおかげ') {
        console.log(`✅ 成功！「法人名または事業所名」に正しく会社名が入力されました`);
      } else {
        console.log(`❌ 失敗！「法人名または事業所名」に間違った値が入力されました: ${companyField.filledValue}`);
      }
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }

    console.log('\n⏰ 30秒間フォームを確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
  console.log('\n✅ テスト完了！');
})();
