const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// 送信者情報
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
  zip: '470-2303',
  zip1: '470',
  zip2: '2303',
  address: '愛知県知多郡武豊町祠峰1-91',
  prefecture: '愛知県',
  city: '知多郡武豊町',
  street: '祠峰1-91',
  industry: 'マーケティング',
  message: `お世話になっております。
「あなたのおかげデザイン」の森田と申します。


突然のご連絡失礼いたします。

税理士の先生方とお話する中で、
「顧問先が申請対応や金融機関からの依頼で、急にホームページが必要になった」
というご相談をいただきます。

そのような"急ぎの場面"でも使えるよう、
必要な情報が揃ったシンプルなホームページを
短納期でご用意できるサービスをつくっております。

ーーーーーーーーーー
最短2日で納品、シンプルなホームページ
ーーーーーーーーーー
【料金】 49,800円

・3ページ構成 (ページを増やすことも可能)
・申請や審査で必要とされる情報をあらかじめ掲載


【ご利用いただくケース】
・開業直後で最低限の「会社の顔」を整えたいとき
・補助金・助成金申請にHP提示が必要なとき
・金融機関から事業の実態が分かるHPを求められたとき
・許認可申請の裏付け資料として必要なとき


どのような雰囲気で制作しているか、
デザイン例をこちらにまとめています。
ーーーーーーーーーーー
https://rokuha.xsrv.jp/lp/
ーーーーーーーーーーー


初めてのご連絡になりますので、
"ご紹介を前提としたご案内"ではございません。


先生の中で、
「こういう簡易サイトもあるんだな」
と選択肢のひとつに置いていただければ嬉しく思います。

もし、
・クライアント様のご提案に備えて内容だけ知っておきたい
・デザインの雰囲気だけ軽く見てみたい
といった場面がありましたら、

「少し話だけ聞きたいです」「資料だけ欲しいです」
といった短い一言で大丈夫です。
（ご相談ベースで構いません）

お忙しいところ、最後までお読みいただきありがとうございました。
今後ともよろしくお願いいたします。


-----------------------
あなたのおかげデザイン
https://anatano-okage.com/

森田 憲史`
};

const CONFIG = {
  inputFile: '全国の税理士リスト_お問合せあり.csv',
  testCount: 3 // テスト件数
};

async function testFormFilling() {
  console.log('🚀 実際のお問合せフォームでテスト開始\n');

  // CSVを読み込む
  const content = fs.readFileSync(CONFIG.inputFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const targets = [];
  for (let i = 1; i < Math.min(lines.length, CONFIG.testCount + 1); i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 4) {
      targets.push({
        company: parts[0],
        url: parts[1],
        address: parts[2],
        contactUrl: parts[3]
      });
    }
  }

  console.log(`📊 テスト対象: ${targets.length}件\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // detectFieldType関数をページに注入
  await page.evaluateOnNewDocument((senderInfo) => {
    window.detectFieldType = function(element) {
      const name = (element.name || '').toLowerCase();
      const id = (element.id || '').toLowerCase();
      const placeholder = (element.placeholder || '').toLowerCase();
      const label = element.label || '';
      const type = element.type || '';

      const allText = `${name} ${id} ${placeholder} ${label}`.toLowerCase();

      // 優先順位1: 会社名
      if (allText.match(/company|会社|法人|屋号|corp/)) {
        return { type: 'company', value: senderInfo.company };
      }

      // 優先順位2: メールアドレス
      if (type === 'email' || allText.match(/mail|メール/)) {
        return { type: 'email', value: senderInfo.email };
      }

      // 優先順位3: 電話番号
      if (type === 'tel' || allText.match(/tel|phone|電話|携帯/)) {
        return { type: 'tel', value: senderInfo.tel };
      }

      // 優先順位4: 郵便番号
      if (allText.match(/郵便|zip|postal|〒/)) {
        // 郵便番号が分割されている場合（01, 1, 前半など）
        if (allText.match(/zip.*01|zip.*1(?!\d)|郵便.*1|前半/)) {
          return { type: 'zip1', value: senderInfo.zip1 };
        }
        if (allText.match(/zip.*02|zip.*2(?!\d)|郵便.*2|後半/)) {
          return { type: 'zip2', value: senderInfo.zip2 };
        }
        // 単一フィールドの場合
        return { type: 'zip', value: senderInfo.zip };
      }

      // 優先順位5: 住所
      if (allText.match(/都道府県|prefecture/)) {
        return { type: 'prefecture', value: senderInfo.prefecture };
      }
      if (allText.match(/市区町村|city/) && !allText.match(/都道府県/)) {
        return { type: 'city', value: senderInfo.city };
      }
      if (allText.match(/番地|町名|street/) || (allText.match(/住所/) && allText.match(/2|3|詳細/))) {
        return { type: 'street', value: senderInfo.street };
      }
      if (allText.match(/address|住所/) && !allText.match(/mail/)) {
        return { type: 'address', value: senderInfo.address };
      }

      // 優先順位6: 業種
      if (allText.match(/業種|業界|industry|業態/)) {
        // select/radioの場合は「その他」を選択
        if (element.tagName === 'select' || type === 'radio') {
          return { type: 'industrySelect', value: 'other' };
        }
        // textの場合は「マーケティング」を入力
        return { type: 'industry', value: senderInfo.industry };
      }

      // 優先順位7: お問合せ種別（selectやradio）
      if ((element.tagName === 'select' || type === 'radio') &&
          allText.match(/種別|type|区分|項目|カテゴリ|category|attendance|aggregation/)) {
        return { type: 'inquiryType', value: 'other' }; // 「その他」を選択
      }

      // 優先順位7.5: 契約について（radioボタン）
      if ((element.tagName === 'select' || type === 'radio') &&
          allText.match(/contract|契約/)) {
        return { type: 'contract', value: 'no' }; // 「契約なし」を選択
      }

      // 優先順位8: お問合せ内容
      if (element.tagName === 'textarea' || allText.match(/content|message|問.*合|相談|詳細|内容|msg/)) {
        return { type: 'message', value: senderInfo.message };
      }

      // 優先順位9: 姓名（分離）
      if (allText.match(/last.*name|姓(?!.*名)|苗字|みょうじ/) && !allText.match(/会社|法人/)) {
        return { type: 'lastName', value: senderInfo.lastName };
      }
      if (allText.match(/first.*name|名(?!.*姓)(?!前)/) && !allText.match(/会社|法人|氏名|お名前|代表/)) {
        return { type: 'firstName', value: senderInfo.firstName };
      }

      // 優先順位10: ふりがな（分離）
      if (allText.match(/last.*kana|せい.*かな|みょうじ.*かな/) && !allText.match(/会社|法人/)) {
        return { type: 'lastNameKana', value: senderInfo.lastNameKana };
      }
      if (allText.match(/first.*kana|めい.*かな/) && !allText.match(/会社|法人|氏名|お名前/)) {
        return { type: 'firstNameKana', value: senderInfo.firstNameKana };
      }

      // 優先順位11: フルネーム（代表者名を含む）
      if (allText.match(/name|名前|氏名|お名前|代表者|担当者/) && !allText.match(/会社|法人|corp/)) {
        if (allText.match(/かな|kana|ふりがな|フリガナ/)) {
          return { type: 'fullNameKana', value: senderInfo.fullNameKana };
        }
        return { type: 'fullName', value: senderInfo.fullName };
      }

      // 優先順位11.5: placeholderが全てひらがな → ふりがな
      if (element.placeholder && element.placeholder.match(/^[ぁ-ん\s　]+$/)) {
        return { type: 'fullNameKana', value: senderInfo.fullNameKana };
      }

      // 優先順位12: 同意チェックボックス
      if (type === 'checkbox' && allText.match(/同意|承諾|accept|agree|privacy|個人情報/)) {
        return { type: 'agreement', value: true };
      }

      return { type: 'other', value: '' };
    };
  }, SENDER_INFO);

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${i + 1}/${targets.length}] ${target.company}`);
    console.log(`URL: ${target.contactUrl}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
      await page.goto(target.contactUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // フォーム要素を分析
      const formAnalysis = await page.evaluate(() => {
        const elements = document.querySelectorAll('input, textarea, select');
        const fields = [];

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

          fields.push({
            tagName: element.tagName.toLowerCase(),
            type: element.type || 'text',
            name: element.name || '',
            id: element.id || '',
            placeholder: element.placeholder || '',
            label: label,
            required: element.required || false
          });
        });

        return fields;
      });

      console.log(`📋 フォーム項目: ${formAnalysis.length}個`);

      // 自動入力
      const fillResult = await page.evaluate((senderInfo) => {
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
            label: label,
            required: element.required || false
          };

          const detection = window.detectFieldType(fieldInfo);

          if (detection.type !== 'other' && detection.value) {
            try {
              if (fieldInfo.type === 'checkbox' && detection.type === 'agreement') {
                element.checked = true;
                filledFields.push({ ...fieldInfo, filledValue: 'checked', detectedAs: detection.type });
              } else if (detection.type === 'inquiryType' || detection.type === 'industrySelect') {
                // お問合せ種別・業種（select/radio）の処理
                if (fieldInfo.tagName === 'select') {
                  // selectの場合、「その他」を含むoptionを探して選択
                  const options = element.options;
                  let selected = false;
                  for (let i = 0; i < options.length; i++) {
                    const optionText = options[i].textContent.toLowerCase();
                    const optionValue = options[i].value.toLowerCase();
                    if (optionText.match(/その他|other|その他.*意見|要望/) || optionValue.match(/other|その他/)) {
                      element.selectedIndex = i;
                      element.dispatchEvent(new Event('change', { bubbles: true }));
                      filledFields.push({ ...fieldInfo, filledValue: options[i].textContent, detectedAs: detection.type });
                      selected = true;
                      break;
                    }
                  }
                  if (!selected) {
                    skippedFields.push({ ...fieldInfo, reason: '「その他」オプションが見つかりません' });
                  }
                } else if (fieldInfo.type === 'radio') {
                  // radioの場合、同じname属性を持つ全てのradioボタンから「その他」を探す
                  const radios = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
                  let selected = false;
                  radios.forEach(radio => {
                    const radioLabel = radio.label || '';
                    const radioValue = (radio.value || '').toLowerCase();
                    if (radioLabel.match(/その他|other/) || radioValue.match(/other|その他/)) {
                      radio.checked = true;
                      radio.dispatchEvent(new Event('change', { bubbles: true }));
                      filledFields.push({ ...fieldInfo, filledValue: 'その他', detectedAs: detection.type });
                      selected = true;
                    }
                  });
                  if (!selected) {
                    skippedFields.push({ ...fieldInfo, reason: '「その他」ラジオボタンが見つかりません' });
                  }
                }
              } else if (detection.type === 'contract') {
                // 契約について（radio）の処理
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

                    const radioValue = (radio.value || '').toLowerCase();
                    const radioLabelLower = radioLabel.toLowerCase();

                    // 「契約なし」「なし」「no」を探す
                    if (radioLabelLower.match(/契約.*なし|なし|no.*contract/) || radioValue.match(/なし|no|none/)) {
                      radio.checked = true;
                      radio.dispatchEvent(new Event('change', { bubbles: true }));
                      filledFields.push({ ...fieldInfo, filledValue: radioLabel || '契約なし', detectedAs: detection.type });
                      selected = true;
                    }
                  });
                  if (!selected) {
                    skippedFields.push({ ...fieldInfo, reason: '「契約なし」オプションが見つかりません' });
                  }
                } else if (fieldInfo.tagName === 'select') {
                  // selectの場合も対応
                  const options = element.options;
                  let selected = false;
                  for (let i = 0; i < options.length; i++) {
                    const optionText = options[i].textContent.toLowerCase();
                    const optionValue = options[i].value.toLowerCase();
                    if (optionText.match(/契約.*なし|なし|no.*contract/) || optionValue.match(/なし|no|none/)) {
                      element.selectedIndex = i;
                      element.dispatchEvent(new Event('change', { bubbles: true }));
                      filledFields.push({ ...fieldInfo, filledValue: options[i].textContent, detectedAs: detection.type });
                      selected = true;
                      break;
                    }
                  }
                  if (!selected) {
                    skippedFields.push({ ...fieldInfo, reason: '「契約なし」オプションが見つかりません' });
                  }
                }
              } else if (fieldInfo.type !== 'checkbox' && fieldInfo.tagName !== 'select') {
                element.value = detection.value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                const preview = detection.value.length > 30 ? detection.value.substring(0, 30) + '...' : detection.value;
                filledFields.push({ ...fieldInfo, filledValue: preview, detectedAs: detection.type });
              }
            } catch (e) {
              skippedFields.push({ ...fieldInfo, reason: e.message });
            }
          } else if (fieldInfo.required) {
            // 必須項目で値が不明な場合、無難なデフォルト値を入力
            let defaultValue = '';

            if (fieldInfo.type === 'select') {
              // selectの場合、「その他」を優先、なければ最初のoptionを選択
              try {
                if (element.options && element.options.length > 0) {
                  let selectedIndex = 0;
                  let foundOther = false;

                  // 「その他」を探す
                  for (let i = 0; i < element.options.length; i++) {
                    const optionText = element.options[i].textContent.toLowerCase();
                    const optionValue = (element.options[i].value || '').toLowerCase();
                    if (optionText.match(/その他|other|その他.*意見|要望/) || optionValue.match(/other|その他/)) {
                      selectedIndex = i;
                      foundOther = true;
                      break;
                    }
                  }

                  element.selectedIndex = selectedIndex;
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                  defaultValue = element.options[selectedIndex].textContent;
                  filledFields.push({
                    ...fieldInfo,
                    filledValue: defaultValue,
                    detectedAs: foundOther ? 'default-other' : 'default'
                  });
                } else {
                  skippedFields.push({ ...fieldInfo, reason: '必須だが値不明（select）' });
                }
              } catch (e) {
                skippedFields.push({ ...fieldInfo, reason: '必須だが値不明（select error）' });
              }
            } else if (fieldInfo.type === 'radio') {
              // radioの場合、「その他」を優先、なければ最初のラジオボタンを選択
              try {
                const radios = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
                if (radios.length > 0) {
                  let selectedRadio = radios[0];
                  let foundOther = false;

                  // 「その他」を探す
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

                    const radioValue = (radio.value || '').toLowerCase();
                    if (radioLabel.toLowerCase().match(/その他|other/) || radioValue.match(/other|その他/)) {
                      selectedRadio = radio;
                      foundOther = true;
                    }
                  });

                  selectedRadio.checked = true;
                  selectedRadio.dispatchEvent(new Event('change', { bubbles: true }));
                  filledFields.push({
                    ...fieldInfo,
                    filledValue: foundOther ? 'その他' : '最初の選択肢',
                    detectedAs: foundOther ? 'default-other' : 'default'
                  });
                } else {
                  skippedFields.push({ ...fieldInfo, reason: '必須だが値不明（radio）' });
                }
              } catch (e) {
                skippedFields.push({ ...fieldInfo, reason: '必須だが値不明（radio error）' });
              }
            } else if (fieldInfo.tagName === 'input' || fieldInfo.tagName === 'textarea') {
              // テキスト入力の場合、無難な値を入力
              const label = fieldInfo.label.toLowerCase();

              if (label.match(/資本金|capital/)) {
                defaultValue = '100万円';
              } else if (label.match(/従業員|社員数|人数/)) {
                defaultValue = '1名';
              } else if (label.match(/設立|創業/)) {
                defaultValue = '2020年';
              } else if (label.match(/url|サイト|ホームページ/)) {
                defaultValue = 'https://anatano-okage.com/';
              } else {
                defaultValue = '特になし';
              }

              try {
                element.value = defaultValue;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                filledFields.push({ ...fieldInfo, filledValue: defaultValue, detectedAs: 'default' });
              } catch (e) {
                skippedFields.push({ ...fieldInfo, reason: '必須だが値不明（input error）' });
              }
            } else {
              skippedFields.push({ ...fieldInfo, reason: '必須だが値不明' });
            }
          } else {
            skippedFields.push({ ...fieldInfo, reason: '任意項目' });
          }
        });

        return { filledFields, skippedFields };
      }, SENDER_INFO);

      console.log(`\n✅ 入力完了: ${fillResult.filledFields.length}項目`);
      fillResult.filledFields.forEach(field => {
        console.log(`   ✓ [${field.detectedAs}] ${field.label || field.name || field.placeholder}: "${field.filledValue}"`);
      });

      if (fillResult.skippedFields.length > 0) {
        console.log(`\n⏭️  スキップ: ${fillResult.skippedFields.length}項目`);
        const grouped = {};
        fillResult.skippedFields.forEach(field => {
          if (!grouped[field.reason]) grouped[field.reason] = [];
          grouped[field.reason].push(field);
        });
        Object.keys(grouped).forEach(reason => {
          console.log(`   ${reason}: ${grouped[reason].length}件`);
        });
      }

      // 送信ボタンを探してクリック
      console.log(`\n📤 送信ボタンを探しています...`);

      const submitResult = await page.evaluate(() => {
        // 送信ボタンを探す
        const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');

        for (const button of buttons) {
          const text = button.textContent || button.value || '';
          if (text.match(/送信|submit|確認|登録|apply/i)) {
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
        console.log(`   ✅ 第1ボタン発見: "${submitResult.text}"`);

        // 確認ボタンか最終送信ボタンかを判定
        const isConfirmButton = submitResult.text.match(/確認|内容.*確認|確定|check/i);

        if (isConfirmButton) {
          console.log(`   📋 確認画面へ遷移します...`);
        } else {
          console.log(`   🚀 3秒後に送信します...`);
        }

        await new Promise(resolve => setTimeout(resolve, 3000));

        // 第1ボタンをクリック
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
          for (const button of buttons) {
            const text = button.textContent || button.value || '';
            if (text.match(/送信|submit|確認|登録|apply/i)) {
              button.click();
              return;
            }
          }
        });

        console.log(`   ✅ 第1ボタンクリック完了`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 確認画面に遷移した場合、最終送信ボタンを探す
        if (isConfirmButton) {
          console.log(`\n📤 最終送信ボタンを探しています...`);

          const finalSubmitResult = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.button, a.btn');

            // 優先順位1: 「送信」系のボタン（「確認」を含まない）
            for (const button of buttons) {
              const text = button.textContent || button.value || '';
              if (text.match(/送信|submit|登録|apply/i) && !text.match(/確認|check|戻る|back/i)) {
                return {
                  found: true,
                  text: text.trim(),
                  type: button.tagName.toLowerCase()
                };
              }
            }

            // 優先順位2: type="submit"のボタン
            for (const button of buttons) {
              if (button.type === 'submit' || button.tagName.toLowerCase() === 'button') {
                const text = button.textContent || button.value || '';
                if (!text.match(/戻る|back|キャンセル|cancel/i)) {
                  return {
                    found: true,
                    text: text.trim() || 'submit',
                    type: button.tagName.toLowerCase()
                  };
                }
              }
            }

            return { found: false };
          });

          if (finalSubmitResult.found) {
            console.log(`   ✅ 最終送信ボタン発見: "${finalSubmitResult.text}"`);
            console.log(`   🚀 3秒後に最終送信します...`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 最終送信実行
            await page.evaluate(() => {
              const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.button, a.btn');

              // 優先順位1: 「送信」系のボタン
              for (const button of buttons) {
                const text = button.textContent || button.value || '';
                if (text.match(/送信|submit|登録|apply/i) && !text.match(/確認|check|戻る|back/i)) {
                  button.click();
                  return;
                }
              }

              // 優先順位2: type="submit"のボタン
              for (const button of buttons) {
                if (button.type === 'submit' || button.tagName.toLowerCase() === 'button') {
                  const text = button.textContent || button.value || '';
                  if (!text.match(/戻る|back|キャンセル|cancel/i)) {
                    button.click();
                    return;
                  }
                }
              }
            });

            console.log(`   ✅✅ 最終送信完了！`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.log(`   ⚠️  最終送信ボタンが見つかりませんでした（確認画面で完了の可能性）`);
          }
        } else {
          console.log(`   ✅ 送信完了！`);
        }
      } else {
        console.log(`   ⚠️  送信ボタンが見つかりませんでした`);
      }

      if (i < targets.length - 1) {
        console.log(`\n5秒後に次のフォームに進みます...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      console.error(`❌ エラー: ${error.message}\n`);
      if (i < targets.length - 1) {
        console.log(`\n3秒後に次のフォームに進みます...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  console.log(`\n\n✅ テスト完了！`);
  console.log(`5秒後にブラウザを閉じます...`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  await browser.close();
}

testFormFilling();
