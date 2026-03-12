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
  message: `お世話になっております。
「あなたのおかげデザイン」の森田と申します。

テスト送信です。`
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.smc-g.co.jp/contact';

  console.log(`\n📋 SMC税理士法人のフォームに送信テスト...\n`);

  try {
    // detectFieldType関数をページに注入（ページ読み込み前）
    await page.evaluateOnNewDocument((senderInfo) => {
      window.detectFieldType = function(fieldInfo) {
        const element = fieldInfo;
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        const label = (element.label || '').toLowerCase();
        const type = element.type || '';

        const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

        // 会社名
        if (allText.match(/company|会社|法人|屋号|corp/)) {
          return { type: 'company', value: senderInfo.company };
        }

        // メールアドレス
        if (type === 'email' || allText.match(/mail|メール/)) {
          return { type: 'email', value: senderInfo.email };
        }

        // 電話番号
        if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) {
          if (allText.match(/tel.*1|phone.*1/)) {
            return { type: 'tel1', value: senderInfo.tel1 };
          }
          if (allText.match(/tel.*2|phone.*2/)) {
            return { type: 'tel2', value: senderInfo.tel2 };
          }
          if (allText.match(/tel.*3|phone.*3/)) {
            return { type: 'tel3', value: senderInfo.tel3 };
          }
          return { type: 'tel', value: senderInfo.tel };
        }

        // ふりがな（分離）- 名前より先にチェック
        if (allText.match(/kana.*head|head.*kana|last.*kana|せい.*かな|みょうじ.*かな/) && !allText.match(/会社|法人/)) {
          return { type: 'lastNameKana', value: senderInfo.lastNameKana };
        }
        if (allText.match(/kana.*body|body.*kana|first.*kana|めい.*かな/) && !allText.match(/会社|法人|氏名|お名前/)) {
          return { type: 'firstNameKana', value: senderInfo.firstNameKana };
        }

        // 姓名（分離）
        if (allText.match(/name.*head|head.*name|last.*name|姓(?!.*名)|苗字|みょうじ|^sei\b/) && !allText.match(/会社|法人/)) {
          return { type: 'lastName', value: senderInfo.lastName };
        }
        if (allText.match(/name.*body|body.*name|first.*name|名(?!.*姓)(?!前)|^mei\b/) && !allText.match(/会社|法人|氏名|お名前|代表/)) {
          return { type: 'firstName', value: senderInfo.firstName };
        }

        // フルネーム
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp/)) {
          if (allText.match(/かな|kana|ふりがな|フリガナ/)) {
            return { type: 'fullNameKana', value: senderInfo.fullNameKana };
          }
          return { type: 'fullName', value: senderInfo.fullName };
        }

        // お問合せ内容
        if (element.tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) {
          return { type: 'message', value: senderInfo.message };
        }

        // お問い合わせ種別のチェックボックスグループ
        if (type === 'checkbox' && name.match(/contact.*type|問.*合.*種別/)) {
          return { type: 'contactType', value: true };
        }

        // 同意チェックボックス
        if (type === 'checkbox' && allText.match(/同意|承諾|accept|agree|privacy|個人情報|プライバシー/)) {
          return { type: 'agreement', value: true };
        }

        return { type: 'other', value: '' };
      };
    }, SENDER_INFO);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // フォーム入力
    console.log('📝 フォームに入力中...\n');

    const result = await page.evaluate(() => {
      const filledFields = [];
      const skippedFields = [];
      const elements = document.querySelectorAll('input, textarea, select');

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

        const isRequired = element.required ||
                          element.getAttribute('aria-required') === 'true' ||
                          label.includes('必須') ||
                          label.includes('*') ||
                          label.includes('※');

        const fieldInfo = {
          tagName: element.tagName.toLowerCase(),
          type: element.type || 'text',
          name: element.name || '',
          id: element.id || '',
          placeholder: element.placeholder || '',
          label: label,
          required: isRequired
        };

        const detection = window.detectFieldType(fieldInfo);

        if (detection.type !== 'other' && detection.value) {
          try {
            if (fieldInfo.type === 'checkbox' && detection.type === 'agreement') {
              element.checked = true;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              filledFields.push({ ...fieldInfo, filledValue: 'checked' });
            } else if (fieldInfo.type === 'checkbox' && detection.type === 'contactType') {
              // お問い合わせ種別のチェックボックスグループ - 「その他」を優先してチェック
              const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${element.name}"]`);
              let checked = false;
              checkboxes.forEach(cb => {
                let cbLabel = '';
                if (cb.id) {
                  const labelElement = document.querySelector(`label[for="${cb.id}"]`);
                  if (labelElement) cbLabel = labelElement.textContent.trim();
                }
                if (!cbLabel) {
                  const parentLabel = cb.closest('label');
                  if (parentLabel) cbLabel = parentLabel.textContent.trim();
                }

                if (cbLabel.match(/その他|other/i) && !checked) {
                  cb.checked = true;
                  cb.dispatchEvent(new Event('change', { bubbles: true }));
                  filledFields.push({ ...fieldInfo, filledValue: cbLabel });
                  checked = true;
                }
              });

              // 「その他」が見つからなければスキップ（後で必須チェックで処理）
              if (!checked) {
                skippedFields.push({ ...fieldInfo, reason: '「その他」が見つからない' });
              }
            } else if (fieldInfo.type !== 'checkbox' && fieldInfo.tagName !== 'select') {
              element.value = detection.value;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              const preview = detection.value.length > 50 ? detection.value.substring(0, 50) + '...' : detection.value;
              filledFields.push({ ...fieldInfo, filledValue: preview });
            }
          } catch (e) {
            skippedFields.push({ ...fieldInfo, reason: e.message });
          }
        } else if (detection.type === 'other' && fieldInfo.required) {
          // 必須項目だが値が不明な場合、無難なデフォルト値を入力
          if (fieldInfo.type === 'checkbox') {
            // チェックボックスの場合、同じname属性を持つ他のチェックボックスを探す
            const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${element.name}"]`);
            if (checkboxes.length > 1) {
              // 複数のチェックボックスがある場合（例：お問い合わせ種別）
              // 「その他」を探してチェック、なければ最初の項目をチェック
              let checked = false;
              checkboxes.forEach(cb => {
                let cbLabel = '';
                if (cb.id) {
                  const labelElement = document.querySelector(`label[for="${cb.id}"]`);
                  if (labelElement) cbLabel = labelElement.textContent.trim();
                }
                if (!cbLabel) {
                  const parentLabel = cb.closest('label');
                  if (parentLabel) cbLabel = parentLabel.textContent.trim();
                }

                if (cbLabel.match(/その他|other/i) && !checked) {
                  cb.checked = true;
                  cb.dispatchEvent(new Event('change', { bubbles: true }));
                  filledFields.push({ ...fieldInfo, filledValue: cbLabel });
                  checked = true;
                }
              });

              // 「その他」が見つからなければ最初の項目をチェック
              if (!checked && checkboxes[0]) {
                checkboxes[0].checked = true;
                checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
                let firstLabel = '';
                if (checkboxes[0].id) {
                  const labelElement = document.querySelector(`label[for="${checkboxes[0].id}"]`);
                  if (labelElement) firstLabel = labelElement.textContent.trim();
                }
                if (!firstLabel) {
                  const parentLabel = checkboxes[0].closest('label');
                  if (parentLabel) firstLabel = parentLabel.textContent.trim();
                }
                filledFields.push({ ...fieldInfo, filledValue: firstLabel || '最初の選択肢' });
              }
            } else {
              // 単一のチェックボックスの場合、チェック
              element.checked = true;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              filledFields.push({ ...fieldInfo, filledValue: 'checked' });
            }
          } else if (fieldInfo.type === 'select' || fieldInfo.tagName === 'select') {
            // selectの場合、「その他」を優先、なければ最初の有効なoptionを選択
            if (element.options && element.options.length > 0) {
              let selectedIndex = 0;

              // 空の選択肢をスキップ
              for (let i = 0; i < element.options.length; i++) {
                const optionValue = element.options[i].value;
                const optionText = element.options[i].textContent.trim();

                if (!optionValue || optionText.match(/選択|select|choose/i)) {
                  continue;
                }

                selectedIndex = i;
                break;
              }

              // 「その他」を探す
              for (let i = 0; i < element.options.length; i++) {
                const optionText = element.options[i].textContent.toLowerCase();
                const optionValue = (element.options[i].value || '').toLowerCase();
                if (optionText.match(/その他|other/) || optionValue.match(/other|その他/)) {
                  selectedIndex = i;
                  break;
                }
              }

              element.selectedIndex = selectedIndex;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              filledFields.push({ ...fieldInfo, filledValue: element.options[selectedIndex].textContent.trim() });
            }
          }
        }
      });

      return { filledFields, skippedFields };
    });

    console.log(`✅ 入力完了: ${result.filledFields.length}項目\n`);
    result.filledFields.forEach(field => {
      console.log(`   - ${field.label || field.name}: ${field.filledValue}`);
    });

    if (result.skippedFields.length > 0) {
      console.log(`\n⚠️  スキップ: ${result.skippedFields.length}項目`);
    }

    // 送信ボタンを探す
    console.log('\n📤 送信ボタンを探しています...\n');

    const submitResult = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');

      for (const button of buttons) {
        const text = button.textContent || button.value || '';
        if (text.match(/送信|submit|確認|登録|apply|問.*合|お問合せ|問い合わせ/i)) {
          return {
            found: true,
            text: text.trim(),
            type: button.tagName.toLowerCase()
          };
        }
      }
      return { found: false };
    });

    if (submitResult.found) {
      console.log(`✅ ボタン発見: "${submitResult.text}"\n`);
      console.log(`⏰ 10秒待機中... (間違っていたらCtrl+Cで停止してください)\n`);
      await new Promise(resolve => setTimeout(resolve, 10000));

      // ボタンをクリック
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
        for (const button of buttons) {
          const text = button.textContent || button.value || '';
          if (text.match(/送信|submit|確認|登録|apply|問.*合|お問合せ|問い合わせ/i)) {
            button.click();
            return;
          }
        }
      });

      console.log(`✅ ボタンクリック完了！\n`);
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log('✅✅ 送信完了！\n');
    } else {
      console.log(`❌ 送信ボタンが見つかりませんでした\n`);
    }

    console.log('⏰ 30秒間結果を確認できます...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
  }

  await browser.close();
})();
