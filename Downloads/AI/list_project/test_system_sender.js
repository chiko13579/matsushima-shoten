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
  subject: '【ご提案】Web制作パートナーのご相談（実店舗経営15年の知見・チーム4名体制）',
  message: `突然のご連絡にて失礼いたします。
Web制作チーム（4名体制）で活動しております、森田と申します。

実店舗を15年経営する中で
「どう伝えれば、興味を持ってもらえるのか」を試行錯誤した経験を活かし、
LP・サイト制作を行っています。
(ディレクションから構築まで丸投げ、またはデザインのみなど)

年度末に向けてお忙しい時期かと存じます。
「デザイナーのリソースが足りない」
「ディレクションから丸投げできるパートナーが欲しい」 といった場面で、
即戦力としてお力になれればと思い、ご連絡いたしました。


イメージが湧きやすいよう、下記に「実績」「自己紹介」などをまとめております。

【ポートフォリオ】
ーーーーーーーーーー
https://rokuha.xsrv.jp/portfolio



▼ 私たちがお役に立てること
ーーーーーーーーーー
・企画段階からのご相談・要件整理・構成のご提案
・ディレクション／クライアント対応
・デザイン（LP・Webサイト・バナーなど）
・Studioでの構築
・セールスライティング
・営業資料の作成

企画から実装まで一貫してお任せいただくことも、
「デザインだけ」「ライティングだけ」といった部分的なご依頼も可能です。



▼ 直近ご対応した案件
ーーーーーーーーーー
①【茨城県の自動車学校様】よりホームページリニューアルのご依頼
→ ライティング / デザイン / 構築
→ 制作期間：3ヶ月
→ お客様からの声:「以前より資料請求数が明らかに増えた」とご報告いただきました

②【新規開院の歯科医院様】ホームページデザイン
→ デザイン
→ 制作期間：2週間
→ お客様からの声:「他の歯科医院から、こんなデザインで作ってほしい、
  というご依頼を複数いただいた」とご報告いただきました



実店舗経営を行う中で、チラシやPOP、SNSなどでトライアンドエラーを繰り返しながら
「どうしたら人が来たくなるか」を考え続けてきました。

この経験を活かし、貴社案件のスムーズな進行と、
クライアント様のご満足に貢献できればと考えております。

今すぐご予定がなくても、「急ぎの案件が入った時に相談できる先」として
覚えていただければ幸いです。

ご興味をお持ちいただけましたら、
ぜひ15分ほどお話しさせていただけないでしょうか？ 情報交換だけでも構いません。

ご検討のほど、何卒よろしくお願い申し上げます。

・－・－・・－・－・・－・－・・－・－・・－・－・・－
森田 憲治
メール：info@anatano-okage.com
Tel：090-9174-9043
※お急ぎの場合はお電話でもご連絡いただけます
・－・－・－・－・－・－・－・－・－・－・－・－・－・`
};

const CONFIG = {
  inputFile: 'システム会社リスト/③正常入力リスト.csv',
  logFile: 'システム会社リスト/③正常入力リスト_送信ログ.txt',
  failedFile: 'システム会社リスト/③正常入力リスト_失敗リスト.csv',
  screenshotDir: 'error_screenshots_system',
  testMode: true,
  testLimit: 5, // テスト5件
  delayBetweenSubmissions: 500,
  headless: false, // 確認のため表示
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
async function fillForm(page, url, companyName, logStream) {
  const logEntry = [];
  logEntry.push(`\n${'='.repeat(60)}`);
  logEntry.push(`📝 ${companyName}`);
  logEntry.push(`   URL: ${url}`);

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

    logEntry.push(`   フォーム要素: ${formElements.length}件`);
    console.log(`   フォーム要素: ${formElements.length}件`);

    // 1. セレクトボックス（プルダウン）を選択
    const selectResults = await page.evaluate(() => {
      const results = [];
      const selects = document.querySelectorAll('select');

      for (const select of selects) {
        const options = select.querySelectorAll('option');
        if (options.length === 0) continue;

        // ラベルを取得
        let label = '';
        if (select.id) {
          const labelEl = document.querySelector(`label[for="${select.id}"]`);
          if (labelEl) label = labelEl.textContent.trim();
        }
        if (!label && select.closest('label')) {
          label = select.closest('label').textContent.trim();
        }

        // 「その他」「お問い合わせ」「ご相談」などを優先選択
        let selectedOption = null;
        for (const opt of options) {
          const text = opt.textContent.toLowerCase();
          if (text.includes('その他') || text.includes('お問い合わせ') ||
              text.includes('ご相談') || text.includes('お問合せ') ||
              text.includes('パートナー') || text.includes('協業') ||
              text.includes('提携') || text.includes('営業')) {
            selectedOption = opt;
            break;
          }
        }

        // 見つからない場合は最後の選択肢（最初の「選択してください」以外）
        if (!selectedOption) {
          for (let i = options.length - 1; i >= 0; i--) {
            const text = options[i].textContent.trim();
            if (text && !text.includes('選択') && options[i].value) {
              selectedOption = options[i];
              break;
            }
          }
        }

        if (selectedOption && selectedOption.value) {
          select.value = selectedOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          results.push({ label: label || select.name || select.id, value: selectedOption.textContent.trim() });
        }
      }
      return results;
    });

    for (const result of selectResults) {
      logEntry.push(`   ✅ セレクト(${result.label}): ${result.value}`);
      console.log(`   ✅ セレクト(${result.label}): ${result.value}`);
    }

    // 2. ラジオボタンで「その他」を選択
    const radioClicked = await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      const radioGroups = {};

      // ラジオボタンをグループ化
      for (const radio of radios) {
        const name = radio.name || 'default';
        if (!radioGroups[name]) radioGroups[name] = [];
        radioGroups[name].push(radio);
      }

      let clicked = false;
      // 各グループで選択
      for (const groupName in radioGroups) {
        const group = radioGroups[groupName];
        let selectedRadio = null;

        // 「その他」「お問い合わせ」などを優先
        for (const radio of group) {
          const label = radio.closest('label')?.textContent || '';
          const nextText = radio.nextSibling?.textContent || '';
          const allText = label + nextText;
          if (allText.includes('その他') || allText.includes('お問い合わせ') ||
              allText.includes('ご相談') || allText.includes('お問合せ')) {
            selectedRadio = radio;
            break;
          }
        }

        // 見つからない場合は最後のラジオボタン
        if (!selectedRadio && group.length > 0) {
          selectedRadio = group[group.length - 1];
        }

        if (selectedRadio && !selectedRadio.checked) {
          selectedRadio.click();
          clicked = true;
        }
      }
      return clicked;
    });
    if (radioClicked) {
      logEntry.push(`   ✅ ラジオボタン: その他を選択`);
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
      logEntry.push(`   ✅ チェックボックス: 同意にチェック`);
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
            const displayValue = fieldInfo.value.length > 20 ? fieldInfo.value.substring(0, 20) + '...' : fieldInfo.value;
            logEntry.push(`   ✅ ${fieldInfo.type}: ${displayValue}`);
            console.log(`   ✅ ${fieldInfo.type}: ${displayValue}`);
            filledCount++;
          } catch (e) {
            // 入力失敗
          }
        }
      }
    }

    if (filledCount === 0) {
      logEntry.push(`   ⚠️ 入力できる項目がありませんでした`);
      console.log(`   ⚠️ 入力できる項目がありませんでした`);
      logStream.write(logEntry.join('\n') + '\n');
      return { success: false, reason: 'フォーム項目が見つからない' };
    }

    logEntry.push(`   📊 入力完了: ${filledCount}項目`);
    console.log(`   📊 入力完了: ${filledCount}項目`);

    if (CONFIG.dryRun) {
      logEntry.push(`   🔒 ドライラン: 送信ボタンは押しません`);
      console.log(`   🔒 ドライラン: 送信ボタンは押しません`);
      await new Promise(r => setTimeout(r, 3000)); // 確認用に3秒待機
      logStream.write(logEntry.join('\n') + '\n');
      return { success: true, reason: 'ドライラン完了' };
    }

    logStream.write(logEntry.join('\n') + '\n');
    return { success: true, reason: '送信完了' };

  } catch (error) {
    logEntry.push(`   ❌ エラー: ${error.message}`);
    console.log(`   ❌ エラー: ${error.message}`);
    logStream.write(logEntry.join('\n') + '\n');
    return { success: false, reason: error.message };
  }
}

async function main() {
  console.log('🚀 システム開発会社リストへのテスト送信を開始します\n');
  console.log(`📋 送信者: ${SENDER_INFO.fullName} (${SENDER_INFO.company})`);
  console.log(`📧 連絡先: ${SENDER_INFO.email}`);
  console.log(`🧪 テストモード: ON (最大${CONFIG.testLimit}件)`);
  console.log(`🔒 ドライラン: ${CONFIG.dryRun ? 'ON (送信しない)' : 'OFF'}\n`);

  // ログファイルを準備
  const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'w' });
  logStream.write(`システム開発会社テスト送信ログ\n`);
  logStream.write(`実行日時: ${new Date().toLocaleString('ja-JP')}\n`);
  logStream.write(`送信者: ${SENDER_INFO.fullName} (${SENDER_INFO.company})\n`);
  logStream.write(`テスト件数: ${CONFIG.testLimit}件\n`);
  logStream.write(`ドライラン: ${CONFIG.dryRun ? 'ON' : 'OFF'}\n`);

  // CSVを読み込み
  const content = fs.readFileSync(CONFIG.inputFile, 'utf-8');
  const lines = content.split('\n');
  const allLines = [...lines]; // 元のCSVを保持（送信済みチェック用）

  // CSVをパースする関数
  function parseCSVLine(line) {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    return parts;
  }

  // ヘッダーに「送信済み」列がなければ追加
  const headerParts = parseCSVLine(allLines[0]);
  if (!headerParts.includes('送信済み')) {
    allLines[0] = allLines[0] + ',送信済み';
  }

  const targets = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    if (CONFIG.testMode && targets.length >= CONFIG.testLimit) break;

    const parts = parseCSVLine(lines[i]);

    // ③正常入力リスト.csv: タイトル,URL,入力項目数,名前,メール,メッセージ,会社名,送信済み
    if (parts.length >= 2) {
      const contactUrl = parts[1].trim();
      // 送信済み列（8列目）がチェック済みならスキップ
      const sentStatus = parts[7] || '';
      if (sentStatus === '○' || sentStatus === '済') {
        console.log(`⏭️ スキップ（送信済み）: ${parts[0]}`);
        continue;
      }
      if (contactUrl && contactUrl.startsWith('http')) {
        targets.push({
          company: parts[0].trim(), // タイトルを会社名として使用
          contactUrl: contactUrl,
          lineIndex: i // 元のCSV行番号を保持
        });
      }
    }
  }

  // 送信済みチェックをCSVに保存する関数
  function markAsSent(lineIndex) {
    const parts = parseCSVLine(allLines[lineIndex]);
    // 送信済み列（8列目）にチェック
    while (parts.length < 8) parts.push('');
    parts[7] = '○';
    // 行を再構築（ダブルクォート対応）
    allLines[lineIndex] = parts.map(p => p.includes(',') ? `"${p}"` : p).join(',');
    // CSVを保存
    fs.writeFileSync(CONFIG.inputFile, allLines.join('\n'), 'utf-8');
  }

  console.log(`📊 送信対象: ${targets.length}件\n`);
  logStream.write(`\n送信対象: ${targets.length}件\n`);

  if (targets.length === 0) {
    console.log('送信対象がありません');
    logStream.end();
    return;
  }

  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let successCount = 0;
  let failCount = 0;
  const failedList = [];

  for (const target of targets) {
    // 毎回新しいページを作成
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const result = await fillForm(page, target.contactUrl, target.company, logStream);
    if (result.success) {
      successCount++;
      // CSVに送信済みチェックを付ける
      markAsSent(target.lineIndex);
      console.log(`   ✅ CSVに送信済みチェックを追加`);
    } else {
      failCount++;
      failedList.push({
        company: target.company,
        contactUrl: target.contactUrl,
        reason: result.reason
      });
    }

    await page.close();
    await new Promise(r => setTimeout(r, CONFIG.delayBetweenSubmissions));
  }

  await browser.close();

  // 失敗リストをCSVに保存
  if (failedList.length > 0) {
    const failedCsv = ['会社名,お問合せURL,失敗理由'];
    for (const item of failedList) {
      failedCsv.push(`"${item.company}","${item.contactUrl}","${item.reason}"`);
    }
    fs.writeFileSync(CONFIG.failedFile, failedCsv.join('\n'), 'utf-8');
  }

  // 結果サマリー
  const summary = `
${'='.repeat(60)}
📊 テスト結果サマリー
${'='.repeat(60)}
✅ 成功: ${successCount}件
❌ 失敗: ${failCount}件
📊 合計: ${targets.length}件
`;

  console.log(summary);
  logStream.write(summary);
  logStream.end();

  console.log(`\n📝 ログファイル: ${CONFIG.logFile}`);
  if (failedList.length > 0) {
    console.log(`📝 失敗リスト: ${CONFIG.failedFile}`);
  }
}

main().catch(console.error);
