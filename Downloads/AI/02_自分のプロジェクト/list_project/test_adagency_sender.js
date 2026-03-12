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
  lastNameKatakana: 'モリタ',
  firstNameKatakana: 'ケンジ',
  fullNameKatakana: 'モリタケンジ',
  company: 'あなたのおかげ',
  email: 'info@anatano-okage.com',
  tel: '09091749043',
  tel1: '090',
  tel2: '9174',
  tel3: '9043',
  zip: '470-2303',
  zipNoHyphen: '4702303',
  zip1: '470',
  zip2: '2303',
  address: '愛知県知多郡武豊町祠峰1-91',
  prefecture: '愛知県',
  city: '知多郡武豊町',
  street: '祠峰1-91',
  industry: 'マーケティング',
  subject: 'ご相談があり、ご連絡させていただきました。',
  message: `テストです`
};

const CONFIG = {
  inputFile: '全国の広告代理店リスト_imitsu_お問合せURL追加.csv',
  logFile: '送信結果ログ_広告代理店.csv',
  screenshotDir: 'error_screenshots',
  testMode: true,
  testLimit: 3, // テスト: 3件だけ
  delayBetweenSubmissions: 2000,
  headless: false,
  dryRun: true // 送信ボタンを押さない
};

/**
 * フォーム項目の種類を判定
 */
function detectFieldType(element) {
  const name = (element.name || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const label = element.label || '';
  const type = element.type || '';

  const allText = `${name} ${id} ${placeholder}`.toLowerCase();
  const labelText = label.toLowerCase();
  const nameAttr = element.name || '';

  // ふりがなチェック
  if (nameAttr.match(/ふりがな|フリガナ/) || name.match(/hurigana|furigana|hiragana/i)) {
    const isKatakana = nameAttr.match(/フリガナ/) || labelText.match(/カタカナ/) || name.match(/katakana/i);
    return { type: 'fullNameKana', value: isKatakana ? SENDER_INFO.fullNameKatakana : SENDER_INFO.fullNameKana };
  }

  // お名前チェック
  if (nameAttr.match(/^お?名前$/) && !nameAttr.match(/社名|会社/)) {
    return { type: 'fullName', value: SENDER_INFO.fullName };
  }

  // 姓/名
  if (nameAttr === '姓') return { type: 'lastName', value: SENDER_INFO.lastName };
  if (nameAttr === '名') return { type: 'firstName', value: SENDER_INFO.firstName };
  if (nameAttr === 'セイ') return { type: 'lastNameKana', value: SENDER_INFO.lastNameKatakana };
  if (nameAttr === 'メイ') return { type: 'firstNameKana', value: SENDER_INFO.firstNameKatakana };
  if (nameAttr === 'メールアドレス') return { type: 'email', value: SENDER_INFO.email };
  if (nameAttr === '電話番号') return { type: 'tel', value: SENDER_INFO.tel };

  // メールアドレス
  if (allText.match(/e-?mail|mail/) && !allText.match(/confirm|kakunin|確認/)) {
    return { type: 'email', value: SENDER_INFO.email };
  }
  if (labelText.match(/メール|e-?mail/) && !labelText.match(/確認/)) {
    return { type: 'email', value: SENDER_INFO.email };
  }

  // 電話番号
  if (allText.match(/tel|phone/) && !allText.match(/tel2|tel3/)) {
    return { type: 'tel', value: SENDER_INFO.tel };
  }
  if (labelText.match(/電話/)) {
    return { type: 'tel', value: SENDER_INFO.tel };
  }

  // 会社名
  if (allText.match(/company|corp|organization/) || labelText.match(/会社|御社|貴社|社名|法人/)) {
    return { type: 'company', value: SENDER_INFO.company };
  }

  // 名前（フルネーム）
  if (allText.match(/fullname|your-name|yourname/) ||
      (labelText.match(/お名前|氏名|名前/) && !labelText.match(/ふりがな|フリガナ|カナ/))) {
    return { type: 'fullName', value: SENDER_INFO.fullName };
  }

  // 件名
  if (allText.match(/subject|title/) || labelText.match(/件名|タイトル|題名/)) {
    return { type: 'subject', value: SENDER_INFO.subject };
  }

  // 本文
  if (allText.match(/message|body|content|inquiry|detail/) ||
      labelText.match(/内容|本文|メッセージ|お問.*合.*内容|ご相談|詳細/)) {
    return { type: 'message', value: SENDER_INFO.message };
  }

  return null;
}

/**
 * フォームに入力
 */
async function fillForm(page, url, companyName) {
  console.log(`\n📝 ${companyName}`);
  console.log(`   URL: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // フォーム要素を取得
    const formElements = await page.evaluate(() => {
      const elements = [];
      const inputs = document.querySelectorAll('input, textarea, select');

      inputs.forEach(el => {
        if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

        let label = '';
        if (el.id) {
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          if (labelEl) label = labelEl.textContent.trim();
        }
        if (!label && el.closest('label')) {
          label = el.closest('label').textContent.trim();
        }

        elements.push({
          tagName: el.tagName.toLowerCase(),
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          label: label
        });
      });

      return elements;
    });

    console.log(`   フォーム要素: ${formElements.length}件`);

    // 1. まずラジオボタンで「その他」を選択
    const radioClicked = await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      for (const radio of radios) {
        const label = radio.closest('label')?.textContent || '';
        const nextText = radio.nextSibling?.textContent || '';
        if (label.includes('その他') || nextText.includes('その他')) {
          radio.click();
          return true;
        }
      }
      // 「その他」がなければ最後のラジオボタンを選択
      if (radios.length > 0) {
        radios[radios.length - 1].click();
        return true;
      }
      return false;
    });
    if (radioClicked) {
      console.log(`   ✅ ラジオボタン: その他を選択`);
    }

    // 2. 同意チェックボックスをチェック
    const checkboxClicked = await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      let clicked = false;
      for (const cb of checkboxes) {
        const label = cb.closest('label')?.textContent || '';
        const nearText = cb.parentElement?.textContent || '';
        if (label.match(/同意|規約|プライバシー|個人情報/) || nearText.match(/同意|規約|プライバシー|個人情報/)) {
          if (!cb.checked) {
            cb.click();
            clicked = true;
          }
        }
      }
      return clicked;
    });
    if (checkboxClicked) {
      console.log(`   ✅ チェックボックス: 同意にチェック`);
    }

    let filledCount = 0;
    for (const element of formElements) {
      const fieldInfo = detectFieldType(element);
      if (fieldInfo) {
        const selector = element.id ? `#${element.id}` :
                        element.name ? `[name="${element.name}"]` : null;
        if (selector) {
          try {
            await page.type(selector, fieldInfo.value, { delay: 50 });
            console.log(`   ✅ ${fieldInfo.type}: ${fieldInfo.value.substring(0, 20)}...`);
            filledCount++;
          } catch (e) {
            // 入力失敗
          }
        }
      }
    }

    if (filledCount === 0) {
      console.log(`   ⚠️ 入力できる項目がありませんでした`);
      return { success: false, reason: 'フォーム項目が見つからない' };
    }

    console.log(`   📊 入力完了: ${filledCount}項目`);

    if (CONFIG.dryRun) {
      console.log(`   🔒 ドライラン: 送信ボタンは押しません`);
      await new Promise(r => setTimeout(r, 3000)); // 確認用に3秒待機
      return { success: true, reason: 'ドライラン完了' };
    }

    return { success: true, reason: '送信完了' };

  } catch (error) {
    console.log(`   ❌ エラー: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

async function main() {
  console.log('🚀 広告代理店リストへのテスト送信を開始します\n');
  console.log(`📋 送信者: ${SENDER_INFO.fullName} (${SENDER_INFO.company})`);
  console.log(`📧 連絡先: ${SENDER_INFO.email}`);
  console.log(`🧪 テストモード: ON (最大${CONFIG.testLimit}件)`);
  console.log(`🔒 ドライラン: ${CONFIG.dryRun ? 'ON (送信しない)' : 'OFF'}\n`);

  // CSVを読み込み
  const content = fs.readFileSync(CONFIG.inputFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const targets = [];
  for (let i = 1; i < lines.length; i++) {
    if (CONFIG.testMode && targets.length >= CONFIG.testLimit) break;

    const parts = lines[i].split(',');
    // 広告代理店リスト: 会社名,サービスURL,お問合せURL
    if (parts.length >= 3) {
      const contactUrl = parts[2].trim();
      if (contactUrl && contactUrl.startsWith('http')) {
        targets.push({
          company: parts[0].trim(),
          contactUrl: contactUrl
        });
      }
    }
  }

  console.log(`📊 送信対象: ${targets.length}件\n`);

  if (targets.length === 0) {
    console.log('送信対象がありません');
    return;
  }

  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  let successCount = 0;
  let failCount = 0;

  for (const target of targets) {
    const result = await fillForm(page, target.contactUrl, target.company);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    await new Promise(r => setTimeout(r, CONFIG.delayBetweenSubmissions));
  }

  await browser.close();

  console.log(`\n✅ 完了！`);
  console.log(`📊 成功: ${successCount}件`);
  console.log(`📊 失敗: ${failCount}件`);
}

main().catch(console.error);
