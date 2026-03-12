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

  const url = 'https://isshoni.co.jp/contact/';

  console.log(`\n📋 いっしょに税理士法人のフォームに送信テスト...\n`);

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

        // 郵便番号
        if (allText.match(/zip|郵便|postal/)) {
          if (allText.match(/zip.*1|郵便.*1/)) {
            return { type: 'zip1', value: senderInfo.zip1 };
          }
          if (allText.match(/zip.*2|郵便.*2/)) {
            return { type: 'zip2', value: senderInfo.zip2 };
          }
          return { type: 'zip', value: senderInfo.zip };
        }

        // 住所
        if (allText.match(/address|住所|addr/)) {
          if (allText.match(/都道府県|prefecture|pref/)) {
            return { type: 'prefecture', value: senderInfo.prefecture };
          }
          if (allText.match(/市区町村|city/)) {
            return { type: 'city', value: senderInfo.city };
          }
          return { type: 'address', value: senderInfo.address };
        }

        // お問合せ種別（selectやradio）
        if ((element.tagName === 'select' || type === 'radio') &&
            (allText.match(/種別|type|区分|項目|カテゴリ|category/) || name.match(/inquiry|問.*合.*種別/))) {
          return { type: 'inquiryType', value: 'other' };
        }

        // お問合せ内容
        if (element.tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) {
          return { type: 'message', value: senderInfo.message };
        }

        // お問い合わせ種別のチェックボックスグループ
        if (type === 'checkbox' && name.match(/contact.*type|問.*合.*種別/)) {
          return { type: 'contactType', value: true };
        }

        // サービス・希望のチェックボックスグループ
        if (type === 'checkbox' && name.match(/service|希望|サービス/)) {
          return { type: 'serviceType', value: true };
        }

        // ふりがな（分離）
        if (allText.match(/kana.*head|head.*kana|last.*kana|せい.*かな|みょうじ.*かな|furi.*1/) && !allText.match(/会社|法人/)) {
          return { type: 'lastNameKana', value: senderInfo.lastNameKana };
        }
        if (allText.match(/kana.*body|body.*kana|first.*kana|めい.*かな|furi.*2/) && !allText.match(/会社|法人|氏名|お名前/)) {
          return { type: 'firstNameKana', value: senderInfo.firstNameKana };
        }

        // 姓名（分離）
        if (allText.match(/name.*head|head.*name|last.*name|name.*1|姓(?!.*名)|苗字|みょうじ|^sei\b/) && !allText.match(/会社|法人/)) {
          return { type: 'lastName', value: senderInfo.lastName };
        }
        if (allText.match(/name.*body|body.*name|first.*name|name.*2|名(?!.*姓)(?!前)|^mei\b/) && !allText.match(/会社|法人|氏名|お名前|代表/)) {
          return { type: 'firstName', value: senderInfo.firstName };
        }

        // フルネーム
        if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp/)) {
          if (allText.match(/かな|kana|ふりがな|フリガナ/)) {
            return { type: 'fullNameKana', value: senderInfo.fullNameKana };
          }
          return { type: 'fullName', value: senderInfo.fullName };
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

        const fieldInfo = {
          tagName: element.tagName.toLowerCase(),
          type: element.type || 'text',
          name: element.name || '',
          id: element.id || '',
          placeholder: element.placeholder || '',
          label: label
        };

        const detection = window.detectFieldType(fieldInfo);

        if (detection.type !== 'other' && detection.value) {
          try {
            if (fieldInfo.type === 'checkbox' && detection.type === 'agreement') {
              element.checked = true;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              filledFields.push({ ...fieldInfo, filledValue: 'checked' });
            } else if (fieldInfo.type === 'checkbox' && (detection.type === 'contactType' || detection.type === 'serviceType')) {
              // チェックボックスグループ - 「その他」を優先してチェック
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
                  filledFields.push({ ...fieldInfo, detectedType: detection.type, filledValue: cbLabel });
                  checked = true;
                }
              });

              if (!checked) {
                skippedFields.push({ ...fieldInfo, reason: '「その他」が見つからない' });
              }
            } else if (detection.type === 'inquiryType') {
              // ラジオボタン - 「その他」を選択
              if (fieldInfo.type === 'radio') {
                const radios = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
                let selected = false;
                radios.forEach(radio => {
                  let radioLabel = '';
                  if (radio.id) {
                    const labelElement = document.querySelector(`label[for="${radio.id}"]`);
                    if (labelElement) radioLabel = labelElement.textContent.trim();
                  }
                  if (!radioLabel) {
                    const parentLabel = radio.closest('label');
                    if (parentLabel) radioLabel = parentLabel.textContent.trim();
                  }

                  if (radioLabel.match(/その他|other/i) && !selected) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                    filledFields.push({ ...fieldInfo, detectedType: detection.type, filledValue: radioLabel });
                    selected = true;
                  }
                });

                if (!selected) {
                  skippedFields.push({ ...fieldInfo, reason: '「その他」が見つからない（radio）' });
                }
              }
            } else if (fieldInfo.type !== 'checkbox' && fieldInfo.type !== 'radio' && fieldInfo.tagName !== 'select') {
              element.value = detection.value;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              const preview = detection.value.length > 50 ? detection.value.substring(0, 50) + '...' : detection.value;
              filledFields.push({ ...fieldInfo, detectedType: detection.type, filledValue: preview });
            }
          } catch (e) {
            skippedFields.push({ ...fieldInfo, reason: e.message });
          }
        }
      });

      return { filledFields, skippedFields };
    });

    console.log(`✅ 入力完了: ${result.filledFields.length}項目\n`);
    result.filledFields.forEach(field => {
      console.log(`   - [${field.detectedType || '?'}] ${field.label || field.name}: ${field.filledValue}`);
    });

    if (result.skippedFields.length > 0) {
      console.log(`\n⚠️  スキップ: ${result.skippedFields.length}項目`);
      result.skippedFields.forEach(field => {
        console.log(`   - ${field.label || field.name}: ${field.reason}`);
      });
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
