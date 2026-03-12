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
  town: '祠峰',
  street: '1-91',
  cityTown: '知多郡武豊町祠峰',
  industry: 'マーケティング',
  position: '代表',
  subject: '【ご提案】Web制作パートナーのご相談',
  message: `突然のご連絡にて失礼いたします。
Web制作チーム（4名体制）で活動しております、森田と申します。

実店舗を15年経営する中で
「どう伝えれば、興味を持ってもらえるのか」を試行錯誤した経験を活かし、
LP・サイト制作を行っています。

【ポートフォリオ】
https://rokuha.xsrv.jp/portfolio

ご興味をお持ちいただけましたら、ぜひお話しさせていただけないでしょうか？

・－・－・－・－・－・－・－・－・－・－・－・－・－・
森田 憲治
メール：info@anatano-okage.com
Tel：090-9174-9043
・－・－・－・－・－・－・－・－・－・－・－・－・－・`
};

// コマンドライン引数解析
function parseArgs() {
  const args = process.argv.slice(2);
  let inputFile = '全国の行政書士リスト_営業OK_お問合せURL確認済み.csv';
  let startFrom = 2;
  let testLimit = 17000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i+1]) {
      startFrom = parseInt(args[i+1], 10);
      i++;
    } else if (args[i] === '--limit' && args[i+1]) {
      testLimit = parseInt(args[i+1], 10);
      i++;
    } else if (!args[i].startsWith('--')) {
      inputFile = args[i];
    }
  }
  return { inputFile, startFrom, testLimit };
}

const cmdArgs = parseArgs();

const CONFIG = {
  inputFile: cmdArgs.inputFile,
  logFile: '送信結果ログ.csv',
  testLimit: cmdArgs.testLimit,
  startFrom: cmdArgs.startFrom,
  delayBetweenSubmissions: 1000,
  headless: false,
  dryRun: true
};

// ============================================================
// メイン: フォーム自動入力
// ============================================================
async function fillForm(page, url, companyName) {
  try {
    console.log(`\n📝 ${companyName} のフォームに入力中...`);
    console.log(`   URL: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, CONFIG.dryRun ? 500 : 2000));

    // iframeフォームの検出
    const hasIframeForm = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        const src = iframe.src || '';
        if (src.includes('form-mailer') || src.includes('formrun') || src.includes('google.com/forms')) {
          return src;
        }
      }
      return null;
    });

    if (hasIframeForm) {
      console.log(`   ⚠️ スキップ: iframeフォーム`);
      return { success: false, url, company: companyName, error: 'iframe', filledCount: 0 };
    }

    // ページ内でフォーム解析・入力準備
    const result = await page.evaluate((senderInfo) => {

      // --- getLabel: 日本語ラベル取得を強化 ---
      function getLabel(element) {
        const clean = (text) => text.trim().replace(/必須|\*|※|\s+/g, ' ').trim();

        // 1. label[for]
        if (element.id) {
          const labelEl = document.querySelector(`label[for="${element.id}"]`);
          if (labelEl) return clean(labelEl.textContent);
        }

        // 2. 親がlabel
        const parentLabel = element.closest('label');
        if (parentLabel && element.type !== 'radio' && element.type !== 'checkbox') {
          return clean(parentLabel.textContent);
        }

        // 3. aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return clean(ariaLabel);

        // 4. テーブルTH または TD.mast（D-ingパターン）
        const td = element.closest('td');
        if (td) {
          const tr = td.closest('tr');
          if (tr) {
            const th = tr.querySelector('th');
            if (th) return clean(th.textContent);
            // D-ingパターン: td.mastにラベルがある
            const mastTd = tr.querySelector('td.mast');
            if (mastTd && mastTd !== td) return clean(mastTd.textContent);
          }
        }

        // 5. DL/DT/DD
        const dd = element.closest('dd');
        if (dd) {
          let sibling = dd.previousElementSibling;
          while (sibling && sibling.tagName !== 'DT') sibling = sibling.previousElementSibling;
          if (sibling && sibling.tagName === 'DT') return clean(sibling.textContent);
        }

        // 6. 親要素内のlabelタグを探す（ENASパターン対応）
        // ただし、nameが日本語の場合はスキップ（CURVAパターン対策）
        const hasJpName = element.name && element.name.match(/[ぁ-んァ-ヶー一-龠]/);
        if (!hasJpName) {
          let parent = element.parentElement;
          for (let i = 0; i < 3 && parent; i++) {
            const labelInParent = parent.querySelector('label');
            if (labelInParent && !labelInParent.contains(element)) {
              const text = clean(labelInParent.textContent);
              if (text.length > 0 && text.length <= 30) return text;
            }
            parent = parent.parentElement;
          }
        }

        // 7. 前の兄弟要素
        const prev = element.previousElementSibling;
        if (prev && !prev.querySelector('input, textarea, select')) {
          const text = clean(prev.textContent);
          if (text.length > 0 && text.length <= 20) return text;
        }

        return '';
      }

      // --- isRequired ---
      function isRequired(element, label) {
        if (element.required || element.getAttribute('aria-required') === 'true') return true;
        if (label.includes('必須') || label.includes('*') || label.includes('※')) return true;
        let parent = element.parentElement;
        for (let i = 0; i < 4 && parent; i++) {
          if (parent.className && parent.className.toLowerCase().includes('required')) return true;
          parent = parent.parentElement;
        }
        const td = element.closest('td');
        if (td) {
          const tr = td.closest('tr');
          if (tr) {
            const th = tr.querySelector('th');
            if (th && th.textContent.includes('必須')) return true;
            // D-ingパターン: td.mastクラスは必須を意味する
            const mastTd = tr.querySelector('td.mast');
            if (mastTd) return true;
          }
        }
        return false;
      }

      // --- detectFieldType: 日本語徹底チェック → type属性 → 英語判定 ---
      function detectFieldType(el, info) {
        const nameAttr = el.name || '';
        const name = nameAttr.toLowerCase();
        const label = el.label || '';
        const placeholder = el.placeholder || '';
        const type = el.type || '';
        const tagName = el.tagName || '';

        // 日本語テキストを統合（name + label + placeholder）
        const jpText = nameAttr + ' ' + label + ' ' + placeholder;

        // ========== STEP 1: 日本語で徹底判定 ==========

        // 除外パターン
        if (jpText.match(/部署/)) return null;

        // 会社名
        if (jpText.match(/会社|法人|御社|貴社|屋号|社名/) && !jpText.match(/url|ホームページ|電話|内容/)) {
          return { type: 'company', value: info.company };
        }

        // メールアドレス
        if (jpText.match(/メール|mail|e-mail/i) && !jpText.match(/内容|確認/)) {
          return { type: 'email', value: info.email };
        }

        // 電話番号
        if (jpText.match(/電話|携帯|tel|phone/i) && !jpText.match(/内容|fax/i)) {
          return { type: 'tel', value: info.tel };
        }

        // 郵便番号
        if (jpText.match(/郵便|〒|postal|zip/i)) {
          return { type: 'zip', value: info.zipNoHyphen };
        }

        // 都道府県
        if (jpText.match(/都道府県|prefecture/i)) {
          return { type: 'prefecture', value: info.prefecture };
        }

        // 市区町村
        if (jpText.match(/市区町村/)) {
          return { type: 'city', value: info.city };
        }

        // 住所（メールアドレスと区別）
        if (jpText.match(/住所|所在地/) && !jpText.match(/メール|mail/i)) {
          return { type: 'address', value: info.address };
        }

        // フリガナ（カタカナ/ひらがな判定）
        if (jpText.match(/ふりがな|フリガナ|よみがな|ヨミガナ|kana/i) && !jpText.match(/会社/)) {
          const isKatakana = jpText.match(/フリガナ|ヨミガナ|カタカナ/) || placeholder.match(/^[ァ-ヶー\s　]+$/);
          return { type: 'fullNameKana', value: isKatakana ? info.fullNameKatakana : info.fullNameKana };
        }

        // 姓（名字）
        if (jpText.match(/^姓$|姓\s|苗字|せい\s|セイ\s/) || nameAttr === '姓' || nameAttr === 'セイ') {
          const isKatakana = jpText.match(/セイ|カタカナ/);
          return { type: 'lastName', value: isKatakana ? info.lastNameKatakana : info.lastName };
        }

        // 名（名前の名）
        if ((jpText.match(/^名$|^名\s/) || nameAttr === '名' || nameAttr === 'メイ') && !jpText.match(/氏名|名前|会社/)) {
          const isKatakana = jpText.match(/メイ|カタカナ/);
          return { type: 'firstName', value: isKatakana ? info.firstNameKatakana : info.firstName };
        }

        // 氏名・名前・担当者
        if (jpText.match(/名前|氏名|お名前|担当者/) && !jpText.match(/会社|法人|フリガナ|ふりがな/)) {
          return { type: 'fullName', value: info.fullName };
        }

        // 件名・タイトル（日本語のみ）
        if (jpText.match(/件名|タイトル|題名/)) {
          return { type: 'subject', value: info.subject };
        }

        // お問い合わせ内容・メッセージ
        if (type !== 'radio' && type !== 'checkbox' && jpText.match(/問.*合|相談|内容|ご質問|備考|メッセージ|ご要望|本文/) && !jpText.match(/希望日|日時|url|添付|種別|項目/)) {
          return { type: 'message', value: info.message };
        }

        // 同意チェックボックス（親labelも確認）
        if (type === 'checkbox') {
          // checkboxはgetLabelで親labelを除外しているので、ここで追加チェック
          const checkboxText = jpText + ' ' + (el.parentLabelText || '');
          if (checkboxText.match(/同意|承諾|個人情報|プライバシー/)) {
            return { type: 'agreement', value: true };
          }
        }

        // SELECT/RADIO の問い合わせ種別
        if ((tagName === 'SELECT' || type === 'radio') && jpText.match(/項目|種別|区分|お問.*合|ご希望|種類/)) {
          return type === 'radio' ? { type: 'requiredRadio', value: 'auto' } : { type: 'inquiryType', value: 'other' };
        }

        // ========== STEP 2: type属性（確実） ==========
        if (type === 'email') return { type: 'email', value: info.email };
        if (type === 'tel') return { type: 'tel', value: info.tel };

        // ========== STEP 3: name英語（日本語で判定できなかった場合のみ） ==========
        if (name.match(/company/) && !name.match(/url|phone|mail/)) return { type: 'company', value: info.company };
        if (name.match(/email|e-mail|mail/) && !name.match(/confirm|re-/)) return { type: 'email', value: info.email };
        if (name.match(/tel|phone/) && !name.match(/[123]$|_[123]|-[123]/)) return { type: 'tel', value: info.tel };
        if (name.match(/tel[_-]?1|phone[_-]?1/)) return { type: 'tel1', value: info.tel1 };
        if (name.match(/tel[_-]?2|phone[_-]?2/)) return { type: 'tel2', value: info.tel2 };
        if (name.match(/tel[_-]?3|phone[_-]?3/)) return { type: 'tel3', value: info.tel3 };
        if (name.match(/zip|postal/)) return { type: 'zip', value: info.zipNoHyphen };
        if (name.match(/prefecture|pref/)) return { type: 'prefecture', value: info.prefecture };
        if (name.match(/city/)) return { type: 'city', value: info.city };
        if (name.match(/address|addr/) && !name.match(/mail/)) return { type: 'address', value: info.address };
        if (name.match(/last[_-]?name|sei/) && !name.match(/kana/)) return { type: 'lastName', value: info.lastName };
        if (name.match(/first[_-]?name|mei/) && !name.match(/kana/)) return { type: 'firstName', value: info.firstName };
        if (name.match(/kana|furigana/)) return { type: 'fullNameKana', value: info.fullNameKana };
        if (name.match(/name|fullname/) && !name.match(/company|last|first|kana|user/)) return { type: 'fullName', value: info.fullName };
        if (name.match(/message|comment|body|content|inquiry|text/) && !name.match(/type|category/)) return { type: 'message', value: info.message };
        if (name.match(/subject|title/)) return { type: 'subject', value: info.subject };

        // ========== STEP 4: placeholder（ひらがな/カタカナのみ） ==========
        if (placeholder.match(/^[ぁ-ん\s　]+$/)) return { type: 'fullNameKana', value: info.fullNameKana };
        if (placeholder.match(/^[ァ-ヶー\s　]+$/)) return { type: 'fullNameKana', value: info.fullNameKatakana };

        // ========== STEP 5: 汎用 ==========
        if (tagName === 'SELECT') return { type: 'requiredSelect', value: 'auto' };
        if (type === 'radio') return { type: 'requiredRadio', value: 'auto' };
        if (type === 'checkbox') return { type: 'requiredCheckbox', value: 'auto' };

        return { type: 'other', value: '' };
      }

      // === メイン ===
      const filledFields = [];
      const actions = [];
      const processedRadio = new Set();
      const processedCheckbox = new Set();

      // 各フィールドタイプの入力回数を制限（重複防止）
      const fieldTypeCount = {};
      const fieldTypeLimit = {
        company: 1,
        email: 2,        // メールは確認用含めて2つまで
        tel: 1,
        tel1: 1, tel2: 1, tel3: 1,
        zip: 1,
        prefecture: 1,
        city: 1,
        address: 1,
        fullName: 1,
        lastName: 1,
        firstName: 1,
        fullNameKana: 1,
        lastNameKana: 1,
        firstNameKana: 1,
        subject: 1,
        message: 1,
        agreement: 1
      };

      let submitY = Infinity;
      document.querySelectorAll('button, input[type="submit"]').forEach(btn => {
        const text = btn.textContent || btn.value || '';
        if (text.match(/送信|確認|登録/i)) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0) submitY = Math.min(submitY, rect.top + window.scrollY);
        }
      });

      document.querySelectorAll('input, textarea, select').forEach((el, idx) => {
        if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;
        if ((el.name || '').toLowerCase().match(/captcha|token|csrf/)) return;

        const rect = el.getBoundingClientRect();
        // radio/checkboxはCSSで非表示にされることがあるので、サイズチェックをスキップ
        const isRadioOrCheckbox = el.type === 'radio' || el.type === 'checkbox';
        if (!isRadioOrCheckbox && (rect.width === 0 || rect.height === 0)) return;
        if (submitY !== Infinity && rect.top + window.scrollY > submitY + 100) return;

        const label = getLabel(el);
        const req = isRequired(el, label);

        const uid = `ppt-${idx}`;
        el.setAttribute('data-ppt-id', uid);
        const selector = `[data-ppt-id="${uid}"]`;

        // checkbox/radioの親labelテキストを取得
        const parentLabelEl = el.closest('label');
        const parentLabelText = parentLabelEl ? parentLabelEl.textContent.trim() : '';

        const fieldInfo = { tagName: el.tagName, type: el.type || 'text', name: el.name || '', label, placeholder: el.placeholder || '', parentLabelText };
        const det = detectFieldType(fieldInfo, senderInfo);

        if (!det) return;

        // フィールドタイプの制限チェック
        const limit = fieldTypeLimit[det.type];
        if (limit !== undefined) {
          fieldTypeCount[det.type] = (fieldTypeCount[det.type] || 0) + 1;
          if (fieldTypeCount[det.type] > limit) return; // 制限超過はスキップ
        }

        if (det.type !== 'other' && det.value) {
          if (fieldInfo.type === 'checkbox' && det.type === 'agreement') {
            actions.push({ type: 'click', selector, label: '同意' });
            filledFields.push({ label, value: 'checked' });
          } else if (det.type === 'requiredCheckbox') {
            if (processedCheckbox.has(el.name) || !req) return;
            processedCheckbox.add(el.name);
            const cbs = document.querySelectorAll(`input[type="checkbox"][name="${el.name}"]`);
            let target = Array.from(cbs).find(c => (c.closest('label')?.textContent || c.value || '').match(/その他/i)) || cbs[0];
            if (target) { target.click(); filledFields.push({ label, value: 'checkbox' }); }
          } else if (det.type === 'requiredRadio') {
            if (processedRadio.has(el.name) || !req) return;
            processedRadio.add(el.name);
            const radios = document.querySelectorAll(`input[type="radio"][name="${el.name}"]`);
            let target = Array.from(radios).find(r => (r.closest('label')?.textContent || r.value || '').match(/その他/i)) || radios[0];
            if (target) { target.click(); filledFields.push({ label, value: 'radio' }); }
          } else if (det.type.match(/requiredSelect|inquiryType/)) {
            if (!req) return;
            let val = '';
            for (const opt of el.options) {
              if (opt.textContent.includes('その他')) { val = opt.value; break; }
            }
            if (!val) {
              for (const opt of el.options) {
                if (opt.value && !opt.textContent.includes('選択')) { val = opt.value; break; }
              }
            }
            if (val) { actions.push({ type: 'select', selector, value: val }); filledFields.push({ label, value: val }); }
          } else if (fieldInfo.tagName !== 'SELECT' && fieldInfo.type !== 'checkbox' && fieldInfo.type !== 'radio') {
            if (det.type.match(/prefecture|city|address|zip/) && !req) return;
            actions.push({ type: 'type', selector, value: det.value, x: rect.left, y: rect.top, fieldType: det.type });
            filledFields.push({ label: label || fieldInfo.name, value: det.value, fieldType: det.type });
          }
        }
      });

      // Post-process: 分割フィールド
      const telActs = actions.filter(a => a.fieldType && a.fieldType.match(/^tel/));
      if (telActs.length >= 2) {
        const sorted = [...telActs].sort((a, b) => a.x - b.x);
        const sameRow = sorted.filter(a => Math.abs(a.y - sorted[0].y) <= 30);
        if (sameRow.length === 3) {
          sameRow[0].value = senderInfo.tel1;
          sameRow[1].value = senderInfo.tel2;
          sameRow[2].value = senderInfo.tel3;
        }
      }
      const zipActs = actions.filter(a => a.fieldType === 'zip');
      if (zipActs.length === 2) {
        const sorted = zipActs.sort((a, b) => a.x - b.x);
        sorted[0].value = senderInfo.zip1;
        sorted[1].value = senderInfo.zip2;
      }
      const nameActs = actions.filter(a => a.fieldType === 'fullName');
      if (nameActs.length === 2) {
        const sorted = nameActs.sort((a, b) => a.x - b.x);
        sorted[0].value = senderInfo.lastName;
        sorted[1].value = senderInfo.firstName;
      }
      const kanaActs = actions.filter(a => a.fieldType === 'fullNameKana');
      if (kanaActs.length === 2) {
        const sorted = kanaActs.sort((a, b) => a.x - b.x);
        const isKat = kanaActs[0].value === senderInfo.fullNameKatakana;
        sorted[0].value = isKat ? senderInfo.lastNameKatakana : senderInfo.lastNameKana;
        sorted[1].value = isKat ? senderInfo.firstNameKatakana : senderInfo.firstNameKana;
      }

      return { filledFields, actions };
    }, SENDER_INFO);

    // アクション実行
    console.log(`   📝 実行: ${result.actions.length}件`);

    result.actions.sort((a, b) => (a.fieldType && a.fieldType.match(/zip/) ? 1 : 0) - (b.fieldType && b.fieldType.match(/zip/) ? 1 : 0));

    for (const act of result.actions) {
      try {
        const el = await page.$(act.selector);
        if (!el) continue;

        if (act.type === 'type') {
          await el.hover();
          await page.mouse.down();
          await page.mouse.up();
          await page.evaluate((sel, val) => {
            const e = document.querySelector(sel);
            e.value = val;
            e.dispatchEvent(new Event('input', { bubbles: true }));
            e.dispatchEvent(new Event('change', { bubbles: true }));
          }, act.selector, act.value);
        } else if (act.type === 'click') {
          await el.click().catch(() => {
            page.evaluate(sel => { document.querySelector(sel).checked = true; }, act.selector);
          });
        } else if (act.type === 'select') {
          await page.select(act.selector, act.value);
        }
        await new Promise(r => setTimeout(r, 150));
      } catch (e) {
        console.log(`   ❌ ${e.message}`);
      }
    }

    console.log(`   ✅ 完了: ${result.filledFields.length}項目`);
    result.filledFields.forEach(f => console.log(`      - ${f.label}: ${String(f.value).substring(0, 25)}`));

    return { success: true, url, company: companyName, filledCount: result.filledFields.length };
  } catch (err) {
    console.log(`   ❌ ${err.message}`);
    return { success: false, url, company: companyName, error: err.message, filledCount: 0 };
  }
}

// メイン
async function main() {
  console.log('🚀 フォーム自動入力 v2');
  console.log(`   ファイル: ${CONFIG.inputFile}`);
  console.log(`   開始: ${CONFIG.startFrom}, 件数: ${CONFIG.testLimit}\n`);

  if (!fs.existsSync(CONFIG.inputFile)) {
    console.error(`❌ ファイルなし: ${CONFIG.inputFile}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(CONFIG.inputFile, 'utf-8').split('\n').filter(l => l.trim());
  const browser = await puppeteer.launch({ headless: CONFIG.headless, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let processed = 0, success = 0;

  for (let i = CONFIG.startFrom - 1; i < lines.length && processed < CONFIG.testLimit; i++) {
    const cols = lines[i].split(',');
    const company = cols[0]?.replace(/"/g, '').trim() || `会社${i}`;
    const url = cols[2]?.replace(/"/g, '').trim() || '';

    if (!url || !url.startsWith('http')) continue;

    processed++;
    const res = await fillForm(page, url, company);
    if (res.success) success++;

    await new Promise(r => setTimeout(r, CONFIG.delayBetweenSubmissions));
  }

  console.log(`\n📊 完了: ${processed}件 (成功: ${success})`);
  await browser.close();
}

main().catch(console.error);
