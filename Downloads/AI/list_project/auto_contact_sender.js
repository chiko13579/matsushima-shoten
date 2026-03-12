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
  town: '祠峰',           // 町名
  street: '1-91',         // 番地のみ
  cityTown: '知多郡武豊町祠峰',  // 市町村+町名
  industry: 'マーケティング',
  position: '代表',  // 役職
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

// コマンドライン引数解析: node script.js <csvファイル> [--start N] [--limit N]
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
  screenshotDir: 'error_screenshots', // エラー時のスクリーンショット保存先
  testMode: true,
  testLimit: cmdArgs.testLimit, // コマンドラインまたはデフォルト17000件
  startFrom: cmdArgs.startFrom, // コマンドラインまたはデフォルト2（1行目はヘッダー）
  delayBetweenSubmissions: 1000, // 1秒間隔
  headless: false, // ブラウザ表示
  dryRun: true, // テストモード（送信しない）
  confirmBeforeSend: false // 確認なし
};

const readline = require('readline');

/**
 * ユーザーに確認を求める
 * @returns {Promise<string>} 'send' | 'skip' | 'quit'
 */
async function askConfirmation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('   👉 確認: [Enter]=送信, [s]=スキップ, [q]=終了 > ', (answer) => {
      rl.close();
      const input = answer.trim().toLowerCase();
      if (input === 's') {
        resolve('skip');
      } else if (input === 'q') {
        resolve('quit');
      } else {
        resolve('send');
      }
    });
  });
}

/**
 * フォーム項目の種類を判定
 */
function detectFieldType(element) {
  const name = (element.name || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const label = element.label || '';
  const type = element.type || '';

  // 英語キーワード用（name, id, placeholder）
  const allText = `${name} ${id} ${placeholder}`.toLowerCase();
  // 日本語キーワード用（labelのみ）
  const labelText = label.toLowerCase();
  // name属性の元の値（日本語キーワード検出用）
  const nameAttr = element.name || '';

  // 最優先: name属性に日本語キーワードがある場合の早期検出
  // （ラベル取得がずれているフォーム対策）
  // ふりがなチェック（お名前より先にチェック）- ローマ字(hurigana/furigana/kana)も対応
  if (nameAttr.match(/ふりがな|フリガナ/) || name.match(/hurigana|furigana|hiragana/i)) {
    const isKatakana = nameAttr.match(/フリガナ/) || labelText.match(/カタカナ/) || name.match(/katakana/i);
    return { type: 'fullNameKana', value: isKatakana ? SENDER_INFO.fullNameKatakana : SENDER_INFO.fullNameKana };
  }
  // お名前チェック（「社名」「会社」を含まない場合のみ）
  if (nameAttr.match(/^お?名前$/) && !nameAttr.match(/社名|会社/)) {
    return { type: 'fullName', value: SENDER_INFO.fullName };
  }
  // 部署名はスキップ（空文字を返す）
  if (nameAttr === '部署名' || nameAttr === '部署' || name === 'department' || name === 'busho') {
    return null; // 入力しない
  }
  // 姓/名/セイ/メイの完全一致（ocean.jpn.com等のname属性が日本語のフォーム対応）
  if (nameAttr === '姓') {
    return { type: 'lastName', value: SENDER_INFO.lastName };
  }
  if (nameAttr === '名') {
    return { type: 'firstName', value: SENDER_INFO.firstName };
  }
  if (nameAttr === 'セイ') {
    return { type: 'lastNameKana', value: SENDER_INFO.lastNameKatakana };
  }
  if (nameAttr === 'メイ') {
    return { type: 'firstNameKana', value: SENDER_INFO.firstNameKatakana };
  }
  // メールアドレス/電話番号のname属性対応
  if (nameAttr === 'メールアドレス') {
    return { type: 'email', value: SENDER_INFO.email };
  }
  if (nameAttr === '電話番号') {
    return { type: 'tel', value: SENDER_INFO.tel };
  }
  // 会社名/担当者名/お問い合わせ内容のname属性対応（CURVA等）
  // キタイステクノロジーズ等：name="companyName" (小文字化されるので companyname)
  if (nameAttr === '会社名' || nameAttr === '御社名' || nameAttr === '貴社名' || name === 'companyname') {
    return { type: 'company', value: SENDER_INFO.company };
  }
  if (nameAttr.match(/担当者名|ご担当者名|お名前/) || name === 'yourname') {
    return { type: 'fullName', value: SENDER_INFO.fullName };
  }
  if (nameAttr.match(/お問い合わせ内容|お問合せ内容|問い合わせ内容/)) {
    return { type: 'message', value: SENDER_INFO.message };
  }
  // 役職のname属性対応（LBJ等）
  if (nameAttr === '役職') {
    return { type: 'position', value: SENDER_INFO.position };
  }
  // sei_mei, shimei などのフルネームを示すname属性（ビー・アンド・ディー等）
  // ※ _sei, _mei は分離名前なので除外
  if (name.match(/^sei_mei$|^shimei$|^seimei$/)) {
    return { type: 'fullName', value: SENDER_INFO.fullName };
  }
  // last_name / first_name パターンの早期検出（ad-rex, qoox等）
  // ※ラベルが「お名前」「氏名」等フルネームを示し、かつ括弧付きの「（姓）」「（名）」や単独の「姓」「名」を含まない場合は除外
  // （コロンバスプロジェクト等：name=lastnameでラベル=お名前 の実装バグ対策）
  const isFullNameLabel = labelText.match(/お名前|氏名|ご氏名|^名前$/) && !labelText.match(/[（(]姓[）)]|[（(]名[）)]|^姓$|^名$|せい$|めい$/);
  if ((name === 'last_name' || name === 'lastname' || name === 'last-name') && !isFullNameLabel) {
    return { type: 'lastName', value: SENDER_INFO.lastName };
  }
  if ((name === 'first_name' || name === 'firstname' || name === 'first-name') && !isFullNameLabel) {
    return { type: 'firstName', value: SENDER_INFO.firstName };
  }
  if (name === 'last_name_kana' || name === 'lastname_kana' || name === 'last-name-kana') {
    // ラベルまたはplaceholderに「カタカナ」や「セイ」があればカタカナ、なければひらがな
    const isKatakana = labelText.match(/カタカナ/) || placeholder.match(/セイ|カタカナ/);
    return { type: 'lastNameKana', value: isKatakana ? SENDER_INFO.lastNameKatakana : SENDER_INFO.lastNameKana };
  }
  if (name === 'first_name_kana' || name === 'firstname_kana' || name === 'first-name-kana') {
    const isKatakana = labelText.match(/カタカナ/) || placeholder.match(/メイ|カタカナ/);
    return { type: 'firstNameKana', value: isKatakana ? SENDER_INFO.firstNameKatakana : SENDER_INFO.firstNameKana };
  }

  // 優先順位0: お問合せ種別（selectやradio）- 「項目」があれば最優先
  // ※SELECTのラベルにオプション値が含まれる場合、会社名判定より先にチェック
  if ((element.tagName === 'select' || type === 'radio') &&
    (labelText.match(/項目|種別|区分|カテゴリ|事項|お問.*合|希望.*内容|ご希望/) || name.match(/inquiry|category|matters/))) {
    // ラジオボタンはrequiredRadioとして処理（requiredRadio内でisInquiryTypeチェックあり）
    if (type === 'radio') {
      return { type: 'requiredRadio', value: 'auto' };
    }
    return { type: 'inquiryType', value: 'other' };
  }

  // 優先順位1: 会社名（貴社、貴殿、組織、団体も含む）
  // coname = company name の略
  // ※「会社URL」「ホームページ」「サイト」等を含む場合は除外
  // ※ラベルに「担当者」「電話」「メール」「ふりがな」「お名前」等が含まれる場合は除外（company_person_name等のプレフィックス対策）
  if ((allText.match(/company|corp|organization|coname/) || labelText.match(/会社|法人|屋号|貴社|貴殿|組織|社名|団体/)) &&
      !allText.match(/url|website|homepage/) && !labelText.match(/url|ホームページ|サイト|アドレス/i) &&
      !labelText.match(/担当|電話|メール|ふりがな|フリガナ|お名前|氏名|問.*合.*せ|内容/)) {
    return { type: 'company', value: SENDER_INFO.company };
  }

  // 優先順位2: メールアドレス
  // ※「お問い合わせ内容」「Mail Contents」等のラベルは除外
  // ※mail_xxxプレフィックスパターンにマッチしないよう、emailまたは_mail、または単語境界で囲まれたmailのみを検出
  if (!labelText.match(/内容|contents/i) &&
      (type === 'email' || allText.match(/email|e-mail|_mail\b|\bmail\b/) || labelText.match(/メール|e-mail|mail/))) {
    return { type: 'email', value: SENDER_INFO.email };
  }

  // 優先順位3: 電話番号
  // allTextにも日本語の「電話」を含める（name属性に「電話番号[data][0]」のようなパターンがある場合）
  // ※「お問い合わせ内容」等のラベルは除外
  // ※ラベルに「フリガナ」が含まれる場合は除外（GIGA等：name=contacts__phoneだがLabel=フリガナ）
  // ※携帯番号が必須でない場合はスキップ（電話番号が既にあれば不要）
  if (labelText.match(/携帯/) && !labelText.match(/必須/) && allText.match(/mobile/)) {
    return { type: 'skip', value: '' };
  }
  if (!labelText.match(/内容|contents|フリガナ|ふりがな/i) &&
      (type === 'tel' || allText.match(/tel|phone|mobile|電話/) || labelText.match(/電話|携帯/))) {
    // 電話番号が分割されている場合（tel1, tel2, tel3など）- name属性での判定
    // [data][0], [data][1], [data][2] パターンも対応（例: 電話番号[data][0]）
    // tel_1, tel-1, phone_1, phone-1, mobile_1 等のアンダースコア・ハイフン区切りも対応
    // ※tel-388のような名前に誤マッチしないよう、数字の後に別の数字が続かないことを確認
    // FC2フォーム等: ラベルが「電話」で、name属性が _1, _2, _3 で終わる場合も対応
    // 電話番号分割検出：tel1, tel_1, phone-1等。ただしphone-3b8aa(UUID)やtel1;s等は除外
    // (?![a-zA-Z0-9;]) で数字・英字・セミコロンが後に続く場合を除外
    if (allText.match(/tel[_-]?1(?![a-zA-Z0-9;])|phone[_-]1(?![a-zA-Z0-9;])|mobile[_-]?1(?![a-zA-Z0-9;])|\[data\]\[0\]/) || labelText.match(/電話\s*1|携帯\s*1/) || (labelText.match(/電話|携帯/) && name.match(/_1$/))) {
      return { type: 'tel1', value: SENDER_INFO.tel1 };
    }
    if (allText.match(/tel[_-]?2(?![a-zA-Z0-9;])|phone[_-]2(?![a-zA-Z0-9;])|mobile[_-]?2(?![a-zA-Z0-9;])|\[data\]\[1\]/) || labelText.match(/電話\s*2|携帯\s*2/) || (labelText.match(/電話|携帯/) && name.match(/_2$/))) {
      return { type: 'tel2', value: SENDER_INFO.tel2 };
    }
    if (allText.match(/tel[_-]?3(?![a-zA-Z0-9;])|phone[_-]3(?![a-zA-Z0-9;])|mobile[_-]?3(?![a-zA-Z0-9;])|\[data\]\[2\]/) || labelText.match(/電話\s*3|携帯\s*3/) || (labelText.match(/電話|携帯/) && name.match(/_3$/))) {
      return { type: 'tel3', value: SENDER_INFO.tel3 };
    }
    // 単一フィールドの場合（位置ベースの3分割はpost-processingで処理）
    return { type: 'tel', value: SENDER_INFO.tel.replace(/-/g, '') };
  }

  // 優先順位4: 郵便番号
  // postcode パターンも検出（kaishahojin.com等）
  if (allText.match(/zip|postal|postcode/) || labelText.match(/郵便|〒/)) {
    // 郵便番号が分割されている場合（01, 1, 前半など）
    // postcode_1, postcode_2 パターンも対応
    if (allText.match(/zip.*01|zip.*1(?!\d)|postcode.*1(?!\d)/) || labelText.match(/郵便.*1|前半/)) {
      return { type: 'zip1', value: SENDER_INFO.zip1 };
    }
    if (allText.match(/zip.*02|zip.*2(?!\d)|postcode.*2(?!\d)/) || labelText.match(/郵便.*2|後半/)) {
      return { type: 'zip2', value: SENDER_INFO.zip2 };
    }
    // 単一フィールドの場合（ハイフンなしで統一 - 互換性が高い）
    return { type: 'zip', value: SENDER_INFO.zipNoHyphen };
  }

  // 優先順位5: 住所（日本語ラベルを先に判定 - より明確で信頼性が高い）
  // 都道府県
  if (labelText.match(/都道府県/) || allText.match(/prefecture|todohuken|todofuken|todouhuken|\bpref\b/)) {
    return { type: 'prefecture', value: SENDER_INFO.prefecture };
  }
  // 市区町村
  if ((labelText.match(/市区町村/) || allText.match(/\bcity\b/)) && !labelText.match(/都道府県/)) {
    return { type: 'city', value: SENDER_INFO.city };
  }
  // 番地以降
  if (labelText.match(/番地|町名/) || label.match(/住所[2-9]|住所.*詳細|詳細.*住所/) || allText.match(/street|block|\baddr\b/)) {
    return { type: 'street', value: SENDER_INFO.street };
  }
  // フル住所（最後にチェック）
  if (labelText.match(/住所|所在地/) || (allText.match(/address/) && !allText.match(/mail/))) {
    return { type: 'address', value: SENDER_INFO.address };
  }

  // 優先順位6: 業種
  if (allText.match(/industry/) || labelText.match(/業種|業界|業態/)) {
    // select/radioの場合は「その他」を選択
    if (element.tagName === 'select' || type === 'radio') {
      return { type: 'industrySelect', value: 'other' };
    }
    // textの場合は「マーケティング」を入力
    return { type: 'industry', value: SENDER_INFO.industry };
  }

  // 優先順位6.5: 役職
  if (allText.match(/position|title|job.*title/) || labelText.match(/役職|肩書|ポジション/)) {
    // select/radioの場合は自動選択
    if (element.tagName === 'select' || type === 'radio') {
      return { type: 'requiredSelect', value: 'auto' };
    }
    // textの場合は「代表」を入力
    return { type: 'position', value: SENDER_INFO.position };
  }

  // 優先順位7: お問合せ種別（selectやradio）
  if ((element.tagName === 'select' || type === 'radio') &&
    (allText.match(/type|category|attendance|aggregation|matters/) || labelText.match(/種別|区分|項目|カテゴリ|分類|お問.*合|事項/) || name.match(/inquiry/))) {
    return { type: 'inquiryType', value: 'other' }; // 「その他」を選択
  }

  // 優先順位7.3: 必須SELECTの汎用処理
  // 必須の場合は「その他」→最初の有効オプションを選択
  if (element.tagName === 'select') {
    return { type: 'requiredSelect', value: 'auto' };
  }

  // 優先順位7.4: 必須radioの汎用処理
  // 必須の場合は「その他」→最初のオプションを選択
  if (type === 'radio') {
    return { type: 'requiredRadio', value: 'auto' };
  }

  // 優先順位8: お問合せ内容（キーワードマッチのみ）※radio/checkboxは除外
  // ※TEXTAREAでも無条件には入力しない（国籍等の誤入力防止）
  // 除外: 日付・時間・住所・URL・人数・ファイル関連・国籍・担当者
  // 注意: inquiry は inquiry_item_name 等にマッチしてしまうため削除
  // 注意: question\d+ (FormStack等のQuestion1, Question2等) は個別フィールド名なのでmessageとして扱わない
  if (type !== 'radio' && type !== 'checkbox' &&
      !labelText.match(/希望日|日時|日付|予約|時間|時刻|詳細.*住所|住所.*詳細|url|ホームページ|サイト|人数|参加|添付|ファイル|国籍|担当者/) &&
      !name.match(/^question\d+$/i) &&
      (allText.match(/message|question|comment|remarks|note|description|body|content[^_]|_text/) ||
      labelText.match(/問.*合|相談|詳細|内容|ご質問|ご相談|備考|質問|コメント|ご意見|メッセージ|ご要望|ご用件|ご連絡|自由|補足|追記/))) {
    return { type: 'message', value: SENDER_INFO.message };
  }

  // 優先順位8.3: 同意チェックボックス（スパム防止チェックを含む）
  // ※汎用checkbox処理より前に配置する必要あり
  if (type === 'checkbox' && (allText.match(/accept|agree|privacy|spam/) || labelText.match(/同意|承諾|個人情報|スパム|チェック.*送信|確認.*送信/))) {
    return { type: 'agreement', value: true };
  }

  // 優先順位8.5: 必須checkboxの汎用処理
  // 必須の場合は「その他」→最初のオプションを選択
  if (type === 'checkbox') {
    return { type: 'requiredCheckbox', value: 'auto' };
  }

  // 優先順位9: ふりがな（分離）- 名前より先にチェック
  // カタカナ指定の検出
  const isKatakana = (allText.match(/kana/) || labelText.match(/カタカナ|フリガナ|カナ/)) && !labelText.match(/ひらがな|ふりがな/);

  // セイ/メイ単独も検出
  // furigana-sei, furigana-mei パターンも検出（yuigonsyo.biz等）
  if (label.match(/^セイ$|^せい$|^フリガナ$|^ふりがな$/) || (allText.match(/kana.*head|head.*kana|last.*kana|lastnamekana|last.*name.*kana|furigana.*sei/) || labelText.match(/せい.*かな|みょうじ.*かな|フリガナ.*セイ/)) && !labelText.match(/会社|法人|姓名/)) {
    return { type: 'lastNameKana', value: isKatakana ? SENDER_INFO.lastNameKatakana : SENDER_INFO.lastNameKana };
  }
  if (label.match(/^メイ$|^めい$/) || (allText.match(/kana.*body|body.*kana|first.*kana|firstnamekana|first.*name.*kana|furigana.*mei/) || labelText.match(/めい.*かな|フリガナ.*メイ/)) && !labelText.match(/会社|法人|姓名|氏名|お名前/)) {
    return { type: 'firstNameKana', value: isKatakana ? SENDER_INFO.firstNameKatakana : SENDER_INFO.firstNameKana };
  }

  // 優先順位10: 姓名（分離）
  // 姓/名単独も検出（ラベルで判定を優先）
  // onamae-sei, onamae-mei, username_sei, username_mei パターンも検出
  // ※「山田 太郎」のようなフルネーム形式のplaceholderはfullNameとして扱う
  // Name_Last, name_last, name-last 等も対応
  if (label.match(/^姓$|^苗字$/) || (allText.match(/lastname|last_name|name_last|name-last|name.*head|head.*name|name.*last|last.*name|onamae.*sei|_sei\b/) || labelText.match(/姓(?!.*名)|苗字/) || (placeholder && placeholder.match(/例[：:]?\s*山田$/) && !placeholder.match(/太郎|花子/))) && !labelText.match(/会社|法人/) && !allText.match(/kana|furigana/) && !labelText.match(/かな|ふりがな|フリガナ/)) {
    return { type: 'lastName', value: SENDER_INFO.lastName };
  }
  // firstName: _mei, username_mei, Name_First パターンは「氏名」「お名前」ラベルでも優先検出
  // 「部署」「部署名」は除外
  if ((allText.match(/_mei\b|onamae.*mei|name_first|name-first/) || (placeholder && placeholder.match(/例[：:]?\s*太郎/))) && !allText.match(/kana|furigana/) && !labelText.match(/かな|ふりがな|フリガナ|部署/)) {
    return { type: 'firstName', value: SENDER_INFO.firstName };
  }
  // firstName: 通常パターン
  // 「部署」「部署名」は除外
  if (label.match(/^名$/) || (allText.match(/firstname|first_name|name.*body|body.*name|name.*first|first.*name/) || labelText.match(/名(?!.*姓)(?!前)/)) && !labelText.match(/会社|法人|氏名|お名前|代表|担当|貴社|貴殿|ビル|マンション|部署/) && !allText.match(/building|mansion|kana|furigana|department|busho/) && !labelText.match(/かな|ふりがな|フリガナ/)) {
    return { type: 'firstName', value: SENDER_INFO.firstName };
  }

  // 優先順位10.5: フリガナ単独（「必須フリガナ」等にも対応）
  if (labelText.match(/ふりがな|フリガナ|よみがな|ヨミガナ/) && !labelText.match(/会社|法人|姓名|せい|めい/)) {
    const isKatakana = labelText.match(/カタカナ|フリガナ|ヨミガナ/);
    return { type: 'fullNameKana', value: isKatakana ? SENDER_INFO.fullNameKatakana : SENDER_INFO.fullNameKana };
  }

  // 優先順位11: フルネーム（代表者名を含む）
  // lastname, firstname, last, first, 姓, 苗字などを除外
  // 「紹介者」「利用したいサービス」「URL」等は除外
  if ((allText.match(/name/) || labelText.match(/名前|氏名|お名前|代表者|担当者/)) && !allText.match(/corp|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|service|url|website|homepage/) && !labelText.match(/会社|法人|貴社|貴殿|姓(?!名)|苗字|みょうじ|社名|屋号|組織|紹介|サービス|利用|url|ホームページ|サイト/i)) {
    if (allText.match(/kana/) || labelText.match(/かな|ふりがな|フリガナ/)) {
      return { type: 'fullNameKana', value: isKatakana ? SENDER_INFO.fullNameKatakana : SENDER_INFO.fullNameKana };
    }
    return { type: 'fullName', value: SENDER_INFO.fullName };
  }

  // 優先順位11.5: placeholderが全てひらがな → ふりがな
  if (element.placeholder && element.placeholder.match(/^[ぁ-ん\s　]+$/)) {
    return { type: 'fullNameKana', value: SENDER_INFO.fullNameKana };
  }
  // placeholderが全てカタカナ → フリガナ
  if (element.placeholder && element.placeholder.match(/^[ァ-ヶー\s　]+$/)) {
    return { type: 'fullNameKana', value: SENDER_INFO.fullNameKatakana };
  }
  // placeholderが日本人名パターン（山田太郎、例: 山田 太郎 等）→ fullName（meyco等）
  if (element.placeholder && element.placeholder.match(/^(例[：:]\s*)?[一-龥ぁ-んァ-ヶ]{1,5}[\s　]?[一-龥ぁ-んァ-ヶ]{1,5}$/)) {
    return { type: 'fullName', value: SENDER_INFO.fullName };
  }

  // その他は空欄
  return { type: 'other', value: '' };
}

/**
 * フォームに自動入力
 */
async function fillForm(page, url, companyName) {
  try {
    console.log(`\n📝 ${companyName} のフォームに入力中...`);
    console.log(`   URL: ${url}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, CONFIG.dryRun ? 500 : 2000)); // テスト:500ms, 本番:2000ms

    // iframeフォームの検出（FormMailer等の外部フォームサービス）
    const hasIframeForm = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        const src = iframe.src || '';
        // フォームサービスのiframeを検出
        if (src.includes('form-mailer') ||
            src.includes('formrun') ||
            src.includes('google.com/forms') ||
            src.includes('typeform') ||
            src.includes('formstack')) {
          return src;
        }
      }
      // ページ上にフォーム要素がなく、iframeがある場合もチェック
      const formElements = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
      if (formElements.length === 0 && iframes.length > 0) {
        return iframes[0].src || 'unknown';
      }
      return null;
    });

    if (hasIframeForm) {
      console.log(`   ⚠️  スキップ: フォームがiframe内にあります（${hasIframeForm.substring(0, 50)}...）`);
      return {
        success: false,
        url,
        company: companyName,
        error: 'iframeフォーム（非対応）',
        filledCount: 0,
        skippedCount: 0
      };
    }

    // reCAPTCHAの検出と待機
    const hasRecaptcha = await page.evaluate(() => {
      const isVisible = (elem) => {
        if (!elem) return false;
        const style = window.getComputedStyle(elem);
        const rect = elem.getBoundingClientRect();
        return style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 10 &&
          rect.height > 10;
      };

      const recaptcha = document.querySelector('.g-recaptcha') ||
        document.querySelector('iframe[src*="recaptcha"]') ||
        document.querySelector('iframe[src*="turnstile"]');

      return isVisible(recaptcha);
    });

    if (hasRecaptcha) {
      console.log(`   ⚠️  reCAPTCHAを検出しました。手動解決を待機します（${CONFIG.reCAPTCHA待機時間秒数 || 60}秒）...`);
      // ヘッドレスモードでない場合のみ待機
      if (!CONFIG.headless) {
        // await new Promise(resolve => setTimeout(resolve, (CONFIG.reCAPTCHA待機時間秒数 || 60) * 1000));
        console.log(`   ⏰ 待機スキップ（デバッグ中）。処理を再開します。`);
      } else {
        console.log(`   ⚠️  ヘッドレスモードのため待機をスキップします（失敗する可能性があります）`);
      }
    }

    // detectFieldType関数を毎回ページに注入（ナビゲーション後に失われる問題の対策）
    await page.evaluate((senderInfo) => {
      window.detectFieldType = function (element) {
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
          return { type: 'fullNameKana', value: isKatakana ? senderInfo.fullNameKatakana : senderInfo.fullNameKana };
        }
        if (nameAttr.match(/^お?名前$/) && !nameAttr.match(/社名|会社/)) {
          return { type: 'fullName', value: senderInfo.fullName };
        }
        // 部署名はスキップ
        if (nameAttr === '部署名' || nameAttr === '部署' || name === 'department' || name === 'busho') {
          return null;
        }
        if (nameAttr === '姓') return { type: 'lastName', value: senderInfo.lastName };
        if (nameAttr === '名') return { type: 'firstName', value: senderInfo.firstName };
        if (nameAttr === 'セイ') return { type: 'lastNameKana', value: senderInfo.lastNameKatakana };
        if (nameAttr === 'メイ') return { type: 'firstNameKana', value: senderInfo.firstNameKatakana };
        if (nameAttr === 'メールアドレス') return { type: 'email', value: senderInfo.email };
        if (nameAttr === '電話番号') return { type: 'tel', value: senderInfo.tel };
        if (nameAttr === '会社名' || nameAttr === '御社名' || nameAttr === '貴社名' || name === 'companyname') {
          return { type: 'company', value: senderInfo.company };
        }
        if (nameAttr.match(/担当者名|ご担当者名|お名前/) || name === 'yourname') {
          return { type: 'fullName', value: senderInfo.fullName };
        }
        if (nameAttr.match(/お問い合わせ内容|お問合せ内容|問い合わせ内容/)) {
          return { type: 'message', value: senderInfo.message };
        }
        if (nameAttr === '役職') return { type: 'position', value: senderInfo.position };
        if (name.match(/^sei_mei$|^shimei$|^seimei$/)) {
          return { type: 'fullName', value: senderInfo.fullName };
        }
        const isFullNameLabel = labelText.match(/お名前|氏名|ご氏名|^名前$/) && !labelText.match(/[（(]姓[）)]|[（(]名[）)]|^姓$|^名$|せい$|めい$/);
        if ((name === 'last_name' || name === 'lastname' || name === 'last-name') && !isFullNameLabel) {
          return { type: 'lastName', value: senderInfo.lastName };
        }
        if ((name === 'first_name' || name === 'firstname' || name === 'first-name') && !isFullNameLabel) {
          return { type: 'firstName', value: senderInfo.firstName };
        }
        if (name === 'last_name_kana' || name === 'lastname_kana' || name === 'last-name-kana') {
          const isKatakana = labelText.match(/カタカナ/) || placeholder.match(/セイ|カタカナ/);
          return { type: 'lastNameKana', value: isKatakana ? senderInfo.lastNameKatakana : senderInfo.lastNameKana };
        }
        if (name === 'first_name_kana' || name === 'firstname_kana' || name === 'first-name-kana') {
          const isKatakana = labelText.match(/カタカナ/) || placeholder.match(/メイ|カタカナ/);
          return { type: 'firstNameKana', value: isKatakana ? senderInfo.firstNameKatakana : senderInfo.firstNameKana };
        }

        // お問合せ種別
        if ((element.tagName === 'select' || type === 'radio') &&
          (labelText.match(/項目|種別|区分|カテゴリ|事項|お問.*合|希望.*内容|ご希望/) || name.match(/inquiry|category|matters/))) {
          if (type === 'radio') return { type: 'requiredRadio', value: 'auto' };
          return { type: 'inquiryType', value: 'other' };
        }

        // 会社名
        if ((allText.match(/company|corp|organization|coname/) || labelText.match(/会社|法人|屋号|貴社|貴殿|組織|社名|団体/)) &&
            !allText.match(/url|website|homepage/) && !labelText.match(/url|ホームページ|サイト|アドレス/i) &&
            !labelText.match(/担当|電話|メール|ふりがな|フリガナ|お名前|氏名|問.*合.*せ|内容/)) {
          return { type: 'company', value: senderInfo.company };
        }

        // メールアドレス
        if (!labelText.match(/内容|contents/i) &&
            (type === 'email' || allText.match(/email|e-mail|_mail\b|\bmail\b/) || labelText.match(/メール|e-mail|mail/))) {
          return { type: 'email', value: senderInfo.email };
        }

        // 電話番号
        if (labelText.match(/携帯/) && !labelText.match(/必須/) && allText.match(/mobile/)) {
          return { type: 'skip', value: '' };
        }
        if (!labelText.match(/内容|contents|フリガナ|ふりがな/i) &&
            (type === 'tel' || allText.match(/tel|phone|mobile|電話/) || labelText.match(/電話|携帯/))) {
          if (allText.match(/tel[_-]?1(?![a-zA-Z0-9;])|phone[_-]1(?![a-zA-Z0-9;])|mobile[_-]?1(?![a-zA-Z0-9;])|\[data\]\[0\]/) || labelText.match(/電話\s*1|携帯\s*1/) || (labelText.match(/電話|携帯/) && name.match(/_1$/))) {
            return { type: 'tel1', value: senderInfo.tel1 };
          }
          if (allText.match(/tel[_-]?2(?![a-zA-Z0-9;])|phone[_-]2(?![a-zA-Z0-9;])|mobile[_-]?2(?![a-zA-Z0-9;])|\[data\]\[1\]/) || labelText.match(/電話\s*2|携帯\s*2/) || (labelText.match(/電話|携帯/) && name.match(/_2$/))) {
            return { type: 'tel2', value: senderInfo.tel2 };
          }
          if (allText.match(/tel[_-]?3(?![a-zA-Z0-9;])|phone[_-]3(?![a-zA-Z0-9;])|mobile[_-]?3(?![a-zA-Z0-9;])|\[data\]\[2\]/) || labelText.match(/電話\s*3|携帯\s*3/) || (labelText.match(/電話|携帯/) && name.match(/_3$/))) {
            return { type: 'tel3', value: senderInfo.tel3 };
          }
          return { type: 'tel', value: senderInfo.tel.replace(/-/g, '') };
        }

        // 郵便番号
        if (allText.match(/zip|postal|postcode/) || labelText.match(/郵便|〒/)) {
          if (allText.match(/zip.*01|zip.*1(?!\d)|postcode.*1(?!\d)/) || labelText.match(/郵便.*1|前半/)) {
            return { type: 'zip1', value: senderInfo.zip1 };
          }
          if (allText.match(/zip.*02|zip.*2(?!\d)|postcode.*2(?!\d)/) || labelText.match(/郵便.*2|後半/)) {
            return { type: 'zip2', value: senderInfo.zip2 };
          }
          return { type: 'zip', value: senderInfo.zipNoHyphen };
        }

        // 住所
        if (labelText.match(/都道府県/) || allText.match(/prefecture|todohuken|todofuken|todouhuken|\bpref\b/)) {
          return { type: 'prefecture', value: senderInfo.prefecture };
        }
        if ((labelText.match(/市区町村/) || allText.match(/\bcity\b/)) && !labelText.match(/都道府県/)) {
          return { type: 'city', value: senderInfo.city };
        }
        if (labelText.match(/番地|町名/) || label.match(/住所[2-9]|住所.*詳細|詳細.*住所/) || allText.match(/street|block|\baddr\b/)) {
          return { type: 'street', value: senderInfo.street };
        }
        if (labelText.match(/住所|所在地/) || (allText.match(/address/) && !allText.match(/mail/))) {
          return { type: 'address', value: senderInfo.address };
        }

        // 業種
        if (allText.match(/industry/) || labelText.match(/業種|業界|業態/)) {
          if (element.tagName === 'select' || type === 'radio') return { type: 'industrySelect', value: 'other' };
          return { type: 'industry', value: senderInfo.industry };
        }

        // 役職
        if (allText.match(/position|title|job.*title/) || labelText.match(/役職|肩書|ポジション/)) {
          if (element.tagName === 'select' || type === 'radio') return { type: 'requiredSelect', value: 'auto' };
          return { type: 'position', value: senderInfo.position };
        }

        // お問合せ種別（汎用）
        if ((element.tagName === 'select' || type === 'radio') &&
          (allText.match(/type|category|attendance|aggregation|matters/) || labelText.match(/種別|区分|項目|カテゴリ|分類|お問.*合|事項/) || name.match(/inquiry/))) {
          return { type: 'inquiryType', value: 'other' };
        }

        // 必須SELECT/radio/checkbox
        if (element.tagName === 'select') return { type: 'requiredSelect', value: 'auto' };
        if (type === 'radio') return { type: 'requiredRadio', value: 'auto' };

        // メッセージ
        if (type !== 'radio' && type !== 'checkbox' &&
            !labelText.match(/希望日|日時|日付|予約|時間|時刻|詳細.*住所|住所.*詳細|url|ホームページ|サイト|人数|参加|添付|ファイル|国籍|担当者/) &&
            !name.match(/^question\d+$/i) &&
            (allText.match(/message|question|comment|remarks|note|description|body|content[^_]|_text/) ||
            labelText.match(/問.*合|相談|詳細|内容|ご質問|ご相談|備考|質問|コメント|ご意見|メッセージ|ご要望|ご用件|ご連絡|自由|補足|追記/))) {
          return { type: 'message', value: senderInfo.message };
        }

        // 同意チェックボックス
        if (type === 'checkbox' && (allText.match(/accept|agree|privacy|spam/) || labelText.match(/同意|承諾|個人情報|スパム|チェック.*送信|確認.*送信/))) {
          return { type: 'agreement', value: true };
        }
        if (type === 'checkbox') return { type: 'requiredCheckbox', value: 'auto' };

        // ふりがな（分離）
        const isKatakana = (allText.match(/kana/) || labelText.match(/カタカナ|フリガナ|カナ/)) && !labelText.match(/ひらがな|ふりがな/);
        if (label.match(/^セイ$|^せい$|^フリガナ$|^ふりがな$/) || (allText.match(/kana.*head|head.*kana|last.*kana|lastnamekana|last.*name.*kana|furigana.*sei/) || labelText.match(/せい.*かな|みょうじ.*かな|フリガナ.*セイ/)) && !labelText.match(/会社|法人|姓名/)) {
          return { type: 'lastNameKana', value: isKatakana ? senderInfo.lastNameKatakana : senderInfo.lastNameKana };
        }
        if (label.match(/^メイ$|^めい$/) || (allText.match(/kana.*body|body.*kana|first.*kana|firstnamekana|first.*name.*kana|furigana.*mei/) || labelText.match(/めい.*かな|フリガナ.*メイ/)) && !labelText.match(/会社|法人|姓名|氏名|お名前/)) {
          return { type: 'firstNameKana', value: isKatakana ? senderInfo.firstNameKatakana : senderInfo.firstNameKana };
        }

        // 姓名（分離）
        if (label.match(/^姓$|^苗字$/) || (allText.match(/lastname|last_name|name_last|name-last|name.*head|head.*name|name.*last|last.*name|onamae.*sei|_sei\b/) || labelText.match(/姓(?!.*名)|苗字/) || (placeholder && placeholder.match(/例[：:]?\s*山田$/) && !placeholder.match(/太郎|花子/))) && !labelText.match(/会社|法人/) && !allText.match(/kana|furigana/) && !labelText.match(/かな|ふりがな|フリガナ/)) {
          return { type: 'lastName', value: senderInfo.lastName };
        }
        if ((allText.match(/_mei\b|onamae.*mei|name_first|name-first/) || (placeholder && placeholder.match(/例[：:]?\s*太郎/))) && !allText.match(/kana|furigana/) && !labelText.match(/かな|ふりがな|フリガナ|部署/)) {
          return { type: 'firstName', value: senderInfo.firstName };
        }
        if (label.match(/^名$/) || (allText.match(/firstname|first_name|name.*body|body.*name|name.*first|first.*name/) || labelText.match(/名(?!.*姓)(?!前)/)) && !labelText.match(/会社|法人|氏名|お名前|代表|担当|貴社|貴殿|ビル|マンション|部署/) && !allText.match(/building|mansion|kana|furigana|department|busho/) && !labelText.match(/かな|ふりがな|フリガナ/)) {
          return { type: 'firstName', value: senderInfo.firstName };
        }

        // フリガナ単独
        if (labelText.match(/ふりがな|フリガナ|よみがな|ヨミガナ/) && !labelText.match(/会社|法人|姓名|せい|めい/)) {
          const isKat = labelText.match(/カタカナ|フリガナ|ヨミガナ/);
          return { type: 'fullNameKana', value: isKat ? senderInfo.fullNameKatakana : senderInfo.fullNameKana };
        }

        // フルネーム
        if ((allText.match(/name/) || labelText.match(/名前|氏名|お名前|代表者|担当者/)) && !allText.match(/corp|lastname|firstname|last_name|first_name|name_last|name_first|name.*head|name.*body|service|url|website|homepage/) && !labelText.match(/会社|法人|貴社|貴殿|姓(?!名)|苗字|みょうじ|社名|屋号|組織|紹介|サービス|利用|url|ホームページ|サイト/i)) {
          if (allText.match(/kana/) || labelText.match(/かな|ふりがな|フリガナ/)) {
            return { type: 'fullNameKana', value: isKatakana ? senderInfo.fullNameKatakana : senderInfo.fullNameKana };
          }
          return { type: 'fullName', value: senderInfo.fullName };
        }

        // placeholderベース
        if (element.placeholder && element.placeholder.match(/^[ぁ-ん\s　]+$/)) {
          return { type: 'fullNameKana', value: senderInfo.fullNameKana };
        }
        if (element.placeholder && element.placeholder.match(/^[ァ-ヶー\s　]+$/)) {
          return { type: 'fullNameKana', value: senderInfo.fullNameKatakana };
        }
        if (element.placeholder && element.placeholder.match(/^(例[：:]\s*)?[一-龥ぁ-んァ-ヶ]{1,5}[\s　]?[一-龥ぁ-んァ-ヶ]{1,5}$/)) {
          return { type: 'fullName', value: senderInfo.fullName };
        }

        return { type: 'other', value: '' };
      };
    }, SENDER_INFO);

    const result = await page.evaluate((senderInfo) => {
      const filledFields = [];
      const skippedFields = [];
      const requiredButUnfilled = [];
      const processedCheckboxGroups = new Set();
      const processedRadioGroups = new Set();
      let messageFieldFilled = false; // メッセージは1つだけ入力
      const actions = []; // Actions to be executed by Puppeteer

      // Submit button detection for position filtering
      // Find the "real" submit button (usually at the bottom, matching keywords)
      const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.button, a.btn'));
      let submitBtn = null;
      let submitY = Infinity;

      // 1. Try to find a button with "Send" keywords
      // 最初にマッチしたボタンを使用（重複フォームの場合、最初のフォームのみ入力するため）
      // ただし、非表示のボタンはスキップする
      for (const btn of allButtons) {
        const text = btn.textContent || btn.value || '';
        if (text.match(/送信|submit|send|確認|登録|apply/i) && !text.match(/検索|search|login|ログイン/i)) {
          // 可視性チェック: サイズが0なら非表示
          const rect = btn.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            continue; // 非表示ボタンはスキップ
          }
          // 最初の可視ボタンで停止
          submitBtn = btn;
          break;
        }
      }

      // If we found a specific submit button, use its position. 
      // If not found, we don't filter by position (Infinity).
      if (submitBtn) {
        const rect = submitBtn.getBoundingClientRect();
        submitY = rect.top + window.scrollY;
        console.log(`      🔍 Submit button found: "${submitBtn.textContent}" at Y=${submitY}`);
        // If the button is suspiciously high (e.g. header), ignore it?
        // But "Contact" link might be in header.
        // Let's assume if it matches "Send"/"Confirm" it's likely the form button.
        // But wait, "Contact" link in header matches "問合せ".
        // We should check if it's inside a <form> tag?
        // Or just check if it's an <input> or <button> rather than <a>?
        if (submitBtn.tagName === 'A') {
          // Links might be nav links. Ignore for filtering unless we are sure.
          // Let's prioritize INPUT/BUTTON.
          const realSubmit = allButtons.find(b =>
            (b.tagName === 'INPUT' || b.tagName === 'BUTTON') &&
            (b.textContent || b.value || '').match(/送信|submit|send|確認|登録|apply/i)
          );
          if (realSubmit) {
            submitBtn = realSubmit;
            const r = submitBtn.getBoundingClientRect();
            submitY = r.top + window.scrollY;
          } else {
            // If only link, maybe it's not a form page?
            submitY = Infinity;
          }
        }
      } else {
        // Fallback: use the last submit input/button on page if no keywords match?
        // No, that's risky (footer search).
        // Better to NOT filter if we aren't sure, than to filter everything.
        submitY = Infinity;
      }

      // 名前フィールド数をカウント（1つならfullName、2つならlastName+firstName）
      const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      let nameFieldCount = 0;
      allInputs.forEach(inp => {
        const n = (inp.name || '').toLowerCase();
        const lbl = (() => {
          if (inp.id) {
            const l = document.querySelector(`label[for="${inp.id}"]`);
            if (l) return l.textContent.toLowerCase();
          }
          const pl = inp.closest('label');
          if (pl) return pl.textContent.toLowerCase();
          const tr = inp.closest('tr');
          if (tr) {
            const th = tr.querySelector('th');
            if (th) return th.textContent.toLowerCase();
          }
          return '';
        })();
        // 名前関連フィールドをカウント（会社名、フリガナは除外）
        if ((n.match(/name|sei|mei/) || lbl.match(/名前|氏名|姓|名(?!.*(会社|法人|フリガナ|ふりがな|カナ))/))
            && !n.match(/company|corp|kana|furigana/)
            && !lbl.match(/会社|法人|フリガナ|ふりがな|カナ|かな/)) {
          nameFieldCount++;
        }
      });
      const isSingleNameField = nameFieldCount === 1;
      window.isSingleNameField = isSingleNameField; // detectFieldType内で参照
      console.log(`      📋 名前フィールド数: ${nameFieldCount} → ${isSingleNameField ? 'fullName' : 'lastName+firstName'}`);

      // すべてのフォーム要素を取得
      const elements = Array.from(document.querySelectorAll('input, textarea, select'));

      // デバッグ: 全フィールド一覧を表示
      console.log(`      🔍 フォーム要素数: ${elements.length}`);
      elements.forEach((el, i) => {
        console.log(`         [${i}] ${el.tagName} name="${el.name}" type="${el.type}" label="${el.getAttribute('aria-label') || ''}" required=${el.required}`);
      });

      // フォーム実装矛盾の検出（name属性とラベルが矛盾している場合はスキップ）
      // 例: name="email" なのにラベルが「名」のケース（ウィルビー等）
      const formMismatchCheck = () => {
        const getLabel = (el) => {
          if (el.id) {
            const labelEl = document.querySelector(`label[for="${el.id}"]`);
            if (labelEl) return labelEl.textContent.trim();
          }
          if (el.closest('label')) {
            return el.closest('label').textContent.trim();
          }
          // placeholder
          return el.placeholder || '';
        };

        for (const el of elements) {
          if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;
          const name = (el.name || '').toLowerCase();
          const label = getLabel(el);

          // name属性に「email」が含まれるのにラベルが「名」「姓」「氏名」系
          if (name.includes('email') && label.match(/^名$|^姓$|^氏名$|^お名前$/)) {
            return { hasMismatch: true, reason: `name="${el.name}" にラベル「${label}」が設定されています` };
          }
          // name属性に「name」が含まれるのにラベルが「メール」系
          if (name.match(/\bname\b/) && !name.includes('company') && label.match(/メール|email/i)) {
            return { hasMismatch: true, reason: `name="${el.name}" にラベル「${label}」が設定されています` };
          }
          // name属性に「tel」「phone」が含まれるのにラベルが住所系
          if (name.match(/tel|phone/) && label.match(/住所|郵便|address/i)) {
            return { hasMismatch: true, reason: `name="${el.name}" にラベル「${label}」が設定されています` };
          }
        }
        return { hasMismatch: false };
      };

      const mismatchResult = formMismatchCheck();
      if (mismatchResult.hasMismatch) {
        return {
          error: `フォーム実装エラー: ${mismatchResult.reason}`,
          filledFields: [],
          skippedFields: [],
          requiredButUnfilled: [],
          actions: [],
          formMismatch: true
        };
      }

      elements.forEach((element, index) => {
        // hidden, submit, buttonは除外
        if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') {
          return;
        }

        // reCAPTCHA、トークン、CSRFなどのシステムフィールドを除外
        const fieldName = (element.name || '').toLowerCase();
        const fieldId = (element.id || '').toLowerCase();
        if (fieldName.match(/recaptcha|captcha|token|csrf|_wpcf7|honeypot|bot/) ||
            fieldId.match(/recaptcha|captcha|token|csrf|_wpcf7|honeypot|bot/)) {
          return;
        }

        // 非表示フィールドをスキップ（タブ式フォーム対策）
        const elRect = element.getBoundingClientRect();
        if (elRect.width === 0 || elRect.height === 0) {
          console.log(`      ⚠️ Hidden Skip: ${element.name || element.id} (非表示フィールド)`);
          skippedFields.push({
            name: element.name,
            label: '',
            reason: '非表示フィールド（タブ/折りたたみ）'
          });
          return;
        }

        // Submitボタンより下の要素はスキップ（重複フォーム対策）
        const elY = elRect.top + window.scrollY;
        // submitY + 100pxのマージンを許容（ボタンと同じ行のフィールド用）
        if (submitY !== Infinity && elY > submitY + 100) {
           console.log(`      ⚠️ Position Skip: ${element.name || element.id} (Y=${Math.round(elY)} > submitY=${Math.round(submitY)}+100)`);
           return;
        }

        // 一意なIDを付与してPuppeteerから操作しやすくする
        const uniqueId = `puppeteer-target-${index}`;
        element.setAttribute('data-puppeteer-id', uniqueId);
        const selector = `[data-puppeteer-id="${uniqueId}"]`;

        // ラベルを取得
        let label = '';
        const isRadio = element.type === 'radio';
        const isCheckbox = element.type === 'checkbox';

        // ラジオ/チェックボックスの場合、先にTH（グループラベル）を確認
        if (isRadio || isCheckbox) {
          const tr = element.closest('tr');
          if (tr) {
            const th = tr.querySelector('th');
            if (th) label = th.textContent.trim();
          }
        }

        if (!label && element.id) {
          const labelElement = document.querySelector(`label[for="${element.id}"]`);
          if (labelElement) label = labelElement.textContent.trim();
        }
        if (!label) {
          const parentLabel = element.closest('label');
          if (parentLabel) {
            const parentText = parentLabel.textContent.trim();
            // ラジオ/チェックボックスで、親labelがvalueと同じ場合はスキップ（個別オプションラベル）
            if ((isRadio || isCheckbox) && parentText === element.value) {
              // Skip - this is the option label, not the group label
            } else {
              label = parentText;
            }
          }
        }
        // テーブル構造の場合、tr内のth要素からラベルを取得
        if (!label) {
          const tr = element.closest('tr');
          if (tr) {
            const th = tr.querySelector('th');
            if (th) label = th.textContent.trim();
          }
        }
        // 兄弟要素（前のp, span, div等）からラベルを取得
        // ※安全策: 短いテキスト（20文字以下）かつフォーム要素を含まない場合のみ
        if (!label) {
          let sibling = element.previousElementSibling;
          for (let i = 0; i < 2 && sibling; i++) {
            const tag = sibling.tagName.toLowerCase();
            if (['p', 'span', 'div', 'label', 'h2', 'h3', 'h4', 'h5'].includes(tag)) {
              // フォーム要素を含む場合はスキップ
              if (sibling.querySelector('input, textarea, select')) {
                sibling = sibling.previousElementSibling;
                continue;
              }
              const text = sibling.textContent.trim();
              // 短いテキストのみ（ラベルらしいもの：20文字以下）
              if (text.length > 0 && text.length <= 20) {
                label = text;
                break;
              }
            }
            sibling = sibling.previousElementSibling;
          }
        }
        // 親要素の前の兄弟要素からもラベルを取得（20文字以下）
        if (!label) {
          let parent = element.parentElement;
          if (parent) {
            let sibling = parent.previousElementSibling;
            if (sibling) {
              const tag = sibling.tagName.toLowerCase();
              if (['p', 'span', 'div', 'label', 'dt', 'h2', 'h3', 'h4', 'h5'].includes(tag)) {
                if (!sibling.querySelector('input, textarea, select')) {
                  const text = sibling.textContent.trim();
                  if (text.length > 0 && text.length <= 20) {
                    label = text;
                  }
                }
              }
            }
          }
        }
        // 親を複数階層辿って兄弟要素からラベルを取得（Contact Form 7、FC2フォーム等の複雑な構造対応）
        if (!label) {
          let parent = element.parentElement;
          for (let depth = 0; depth < 8 && parent && !label; depth++) {
            let sibling = parent.previousElementSibling;
            if (sibling) {
              // form-title クラスを持つ要素を優先的にチェック
              const formTitle = sibling.classList && sibling.classList.contains('form-title');
              if (formTitle || ['p', 'span', 'div', 'label', 'h2', 'h3', 'h4', 'h5', 'dt', 'td', 'th'].includes(sibling.tagName.toLowerCase())) {
                if (!sibling.querySelector('input, textarea, select')) {
                  const text = sibling.textContent.trim();
                  if (text.length > 0 && text.length <= 25) {
                    label = text;
                    break;
                  }
                }
              }
            }
            parent = parent.parentElement;
          }
        }

        // 必須チェック
        const nameAttrForRequired = element.name || '';
        let isRequired = element.required ||
          element.getAttribute('aria-required') === 'true' ||
          label.includes('必須') ||
          label.includes('*') ||
          label.includes('※') ||
          nameAttrForRequired.includes('必須');  // name属性に「必須」が含まれる場合（mylegal.jp等）

        // 親要素の近くに「必須」があるか、または親のクラスに'required'が含まれるかチェック
        if (!isRequired) {
          let parent = element.parentElement;
          for (let i = 0; i < 6 && parent; i++) {
            // 親要素のクラスに'required'が含まれるかチェック（cc-m-required等）
            if (parent.className && parent.className.toLowerCase().includes('required')) {
              isRequired = true;
              break;
            }

            // 親要素内に他のフォーム要素が5個以上ある場合はスキップ（大きなコンテナの可能性）
            const formElementsInParent = parent.querySelectorAll('input:not([type="hidden"]), textarea, select');
            if (formElementsInParent.length >= 5) {
              parent = parent.parentElement;
              continue;
            }
            // 直接のテキストノードまたはラベル的な要素のみチェック
            const directText = Array.from(parent.childNodes)
              .filter(n => {
                if (n.nodeType === Node.TEXT_NODE) return true;
                if (n.nodeType === Node.ELEMENT_NODE) {
                  // フォーム要素を含まない要素のテキストのみ（80文字以内）
                  return !n.querySelector('input, textarea, select') && n.textContent.length < 80;
                }
                return false;
              })
              .map(n => n.textContent || '')
              .join('');
            if (directText.includes('必須')) {
              isRequired = true;
              break;
            }
            parent = parent.parentElement;
          }
        }

        // DL/DT/DD構造の必須検出（ocean.jpn.com等のフォーム対応）
        if (!isRequired) {
          const dd = element.closest('dd');
          if (dd) {
            // 兄弟のDT要素を探す
            let sibling = dd.previousElementSibling;
            while (sibling && sibling.tagName !== 'DT') {
              sibling = sibling.previousElementSibling;
            }
            if (sibling && sibling.tagName === 'DT' && sibling.textContent.includes('必須')) {
              isRequired = true;
            }
          }
        }

        // LI構造で兄弟要素に--requiredクラスがある場合の検出（system-supply.net等のフォーム対応）
        if (!isRequired) {
          const li = element.closest('li');
          if (li) {
            // LI内のh3, h4, span, label等に--requiredクラスがあるかチェック
            const requiredElement = li.querySelector('.--required, [class*="--required"]');
            if (requiredElement) {
              isRequired = true;
            }
          }
        }

        // TABLE/TR/TD/TH構造の必須検出（legal-skmt.com等のフォーム対応）
        if (!isRequired) {
          const td = element.closest('td');
          if (td) {
            const tr = td.closest('tr');
            if (tr) {
              const th = tr.querySelector('th');
              if (th && th.textContent.includes('必須')) {
                isRequired = true;
              }
            }
          }
        }

        // SELECT要素で空デフォルト値がある場合は必須として扱う
        // 「選択してください」などのプレースホルダーがある場合、実質必須
        if (!isRequired && element.tagName === 'SELECT') {
          const firstOption = element.options[0];
          const firstText = firstOption ? firstOption.textContent.trim() : '';
          const firstValue = firstOption ? firstOption.value : '';
          // 空値、または「選択」を含むプレースホルダーは必須として扱う
          if (firstOption && (
            firstValue === '' ||
            firstValue.includes('選択') ||
            firstText.includes('選択') ||
            firstText.includes('以下から') ||
            firstText.match(/^[-—―]+/)
          )) {
            // 最初のオプションがプレースホルダーの場合、必須として扱う
            isRequired = true;
          }
        }

        // 位置情報を取得
        const rect = element.getBoundingClientRect();

        const fieldInfo = {
          tagName: element.tagName.toLowerCase(),
          type: element.type || 'text',
          name: element.name || '',
          id: element.id || '',
          placeholder: element.placeholder || '',
          label: label,
          required: isRequired,
          selector: selector,
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width)
        };

        // フィールドタイプを判定
        const detection = window.detectFieldType(fieldInfo);

        // 部署名などスキップすべきフィールドはnullが返る
        if (detection === null) {
          console.log(`      ⏭️ スキップ（対象外）: ${fieldInfo.label} [${fieldInfo.name}]`);
          return;
        }

        // Debug logging for specific fields of interest
        if (fieldInfo.label.includes('電話') || fieldInfo.label.includes('名') || fieldInfo.name.includes('tel') || fieldInfo.name.includes('name')) {
          console.log(`      🔍 Debug: ${fieldInfo.label} [${fieldInfo.name}] -> Type: ${detection.type}, Value: ${detection.value}`);
        }
        // Debug: SELECTボックスの検出を必ず出力
        if (fieldInfo.tagName === 'select') {
          console.log(`      🔍 SELECT: label="${fieldInfo.label}" name="${fieldInfo.name}" required=${fieldInfo.required} -> Type: ${detection.type}`);
        }

        if (detection.type !== 'other' && detection.value) {
          // メッセージフィールドは1つだけ入力
          if (detection.type === 'message') {
            if (messageFieldFilled) {
              console.log(`      ℹ️ メッセージは既に入力済みのためスキップ: ${fieldInfo.label}`);
              return;
            }
            messageFieldFilled = true;
          }

          try {
            if (fieldInfo.type === 'checkbox' && detection.type === 'agreement') {
              actions.push({ type: 'click', selector, label: '同意チェック' });
              filledFields.push({ ...fieldInfo, filledValue: 'checked' });
            } else if (detection.type === 'requiredCheckbox') {
              // 必須チェックボックスの汎用処理
              console.log(`      🔎 チェックボックスグループ検出: ${element.name}`);
              if (processedCheckboxGroups.has(element.name)) {
                console.log(`      ℹ️ 既に処理済み: ${element.name}`);
                return;
              }
              processedCheckboxGroups.add(element.name);

              // お問い合わせ項目系のチェックボックスグループは必須扱い
              // ※「相談」単体はマッチさせない（「攻めの相談」など一般的なテキストを除外するため）
              // ※「ご希望」も単体ではマッチさせない（サービス説明文を除外するため）
              const isInquiryType = element.name.match(/subject|inquiry|項目|種類|category|type|reply|返信|連絡/i) ||
                                    label.match(/お問い?合わせ(内容|種別|項目)?|ご用件|連絡方法|返信方法|分類|相談(内容|種別|項目)|ご希望(内容|項目|サービス)/);
              console.log(`      🔎 isRequired=${isRequired}, isInquiryType=${!!isInquiryType}`);

              if (!isRequired && !isInquiryType) {
                console.log(`      ℹ️ チェックボックス「${element.name}」は必須でないためスキップ`);
                return;
              }

              const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${element.name}"]`);
              let targetCheckbox = null;
              let targetLabel = '';

              // グループ内で「その他」を探す
              // value属性、親要素テキスト、親labelを優先して使う（同じIDを持つ場合の対策）
              checkboxes.forEach(cb => {
                let cbLabel = '';
                // 1. value属性をチェック（「その他」検出に最も信頼できる）
                if (cb.value) {
                  cbLabel = cb.value;
                }
                // 2. 親labelタグのテキスト
                if (!cbLabel) {
                  const parentLabel = cb.closest('label');
                  if (parentLabel) cbLabel = parentLabel.textContent.trim();
                }
                // 3. 親要素のテキスト（短いもののみ）
                if (!cbLabel && cb.parentElement) {
                  const parentText = cb.parentElement.textContent.trim();
                  if (parentText.length <= 30) cbLabel = parentText;
                }
                // 4. ID経由でlabel[for]（フォールバック、同一IDの場合は重複ラベルになるリスクあり）
                if (!cbLabel && cb.id) {
                  const labelEl = document.querySelector(`label[for="${cb.id}"]`);
                  if (labelEl) cbLabel = labelEl.textContent.trim();
                }
                if (cbLabel.match(/その他|other/i) && !targetCheckbox) {
                  targetCheckbox = cb;
                  targetLabel = 'その他';
                }
              });

              // 「その他」がなければ一番上を選択
              if (!targetCheckbox && checkboxes.length > 0) {
                targetCheckbox = checkboxes[0];
                let cbLabel = '';
                if (targetCheckbox.id) {
                  const labelEl = document.querySelector(`label[for="${targetCheckbox.id}"]`);
                  if (labelEl) cbLabel = labelEl.textContent.trim();
                }
                if (!cbLabel && targetCheckbox.parentElement) {
                  cbLabel = targetCheckbox.parentElement.textContent.trim().substring(0, 20);
                }
                targetLabel = cbLabel || '最初の選択肢';
              }

              if (targetCheckbox) {
                // 直接クリックを実行（セレクター問題を回避）
                targetCheckbox.click();
                // ラベルはグループ名またはTDの見出しから取得
                let groupLabel = element.name.replace(/\[\]$/, ''); // subject[] -> subject
                // 親TDのTHからラベルを取得
                const td = element.closest('td');
                if (td) {
                  const tr = td.closest('tr');
                  if (tr) {
                    const th = tr.querySelector('th');
                    if (th) {
                      groupLabel = th.textContent.trim().replace(/必須/g, '').trim().substring(0, 20);
                    }
                  }
                }
                filledFields.push({ ...fieldInfo, label: groupLabel || fieldInfo.label, filledValue: targetLabel });
                console.log(`      ✅ 必須チェックボックス選択: ${groupLabel}: ${targetLabel}`);
              }

            } else if (detection.type === 'requiredRadio') {
              // 必須ラジオボタンの汎用処理 - 必須でなければスキップ
              if (processedRadioGroups.has(element.name)) return;
              processedRadioGroups.add(element.name);

              // お問い合わせ項目系のラジオボタングループは必須扱い（チェックボックスと同様）
              // ※「相談」「ご希望」単体はマッチさせない
              const isInquiryType = element.name.match(/subject|inquiry|項目|種類|category|type|reply|返信|連絡/i) ||
                                    label.match(/お問い?合わせ(内容|種別|項目)?|ご用件|連絡方法|返信方法|分類|相談(内容|種別|項目)|ご希望(内容|項目|サービス)/);

              if (!isRequired && !isInquiryType) {
                console.log(`      ℹ️ ラジオボタン「${element.name}」は必須でないためスキップ`);
                return;
              }

              const radios = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
              let targetRadio = null;
              let targetLabel = '';

              // 「その他」を探す
              // value属性、親要素テキスト、親labelを優先して使う（同じIDを持つ場合の対策）
              radios.forEach(r => {
                let rLabel = '';
                // 1. value属性をチェック（「その他」検出に最も信頼できる）
                if (r.value) {
                  rLabel = r.value;
                }
                // 2. 親labelタグのテキスト
                if (!rLabel) {
                  const parentLabel = r.closest('label');
                  if (parentLabel) rLabel = parentLabel.textContent.trim();
                }
                // 3. 親要素のテキスト（短いもののみ）
                if (!rLabel && r.parentElement) {
                  const parentText = r.parentElement.textContent.trim();
                  if (parentText.length <= 30) rLabel = parentText;
                }
                // 4. ID経由でlabel[for]（フォールバック）
                if (!rLabel && r.id) {
                  const labelEl = document.querySelector(`label[for="${r.id}"]`);
                  if (labelEl) rLabel = labelEl.textContent.trim();
                }
                if (rLabel.match(/その他|other/i) && !targetRadio) {
                  targetRadio = r;
                  targetLabel = 'その他';
                }
              });

              // 「その他」がなければ一番上を選択
              if (!targetRadio && radios.length > 0) {
                targetRadio = radios[0];
                let rLabel = '';
                if (targetRadio.id) {
                  const labelEl = document.querySelector(`label[for="${targetRadio.id}"]`);
                  if (labelEl) rLabel = labelEl.textContent.trim();
                }
                if (!rLabel && targetRadio.parentElement) {
                  rLabel = targetRadio.parentElement.textContent.trim().substring(0, 20);
                }
                targetLabel = rLabel || '最初の選択肢';
              }

              if (targetRadio) {
                // 直接クリックを実行（セレクター問題を回避）
                targetRadio.click();
                filledFields.push({ ...fieldInfo, filledValue: targetLabel });
                console.log(`      ✅ 必須ラジオボタン選択: ${targetLabel}`);
              }

            } else if (detection.type === 'requiredSelect' || detection.type === 'inquiryType' || detection.type === 'industrySelect') {
              // 必須SELECTの汎用処理 - 必須でなければスキップ
              // ただし、inquiryType（お問い合わせ種別）は必須でなくても入力する
              if (!isRequired && detection.type !== 'inquiryType') {
                console.log(`      ℹ️ SELECT「${element.name}」は必須でないためスキップ`);
                return;
              }

              const options = element.options;
              let valueToSelect = '';
              let labelToSelect = '';

              // 「その他」や「どちらでも」を探す
              for (let i = 0; i < options.length; i++) {
                const optText = options[i].textContent.trim();
                if (optText.includes('その他') || optText.includes('Other') || optText.includes('どちらでも')) {
                  valueToSelect = options[i].value;
                  labelToSelect = optText;
                  break;
                }
              }

              // 「その他」がなければ最初の有効なオプションを選択（プレースホルダー以外）
              if (!valueToSelect) {
                for (let i = 0; i < options.length; i++) {
                  const optText = options[i].textContent.trim();
                  const optValue = options[i].value;
                  // 空値、または「選択」を含むプレースホルダーをスキップ
                  const isPlaceholder = optValue === '' ||
                    optText.includes('選択') ||
                    optText.includes('以下から') ||
                    optText.match(/^[-—―]+/);
                  if (!isPlaceholder) {
                    valueToSelect = optValue;
                    labelToSelect = optText;
                    break;
                  }
                }
              }

              if (valueToSelect) {
                actions.push({ type: 'select', selector: `[name="${element.name}"]`, value: valueToSelect, label: `必須SELECT(${labelToSelect})` });
                filledFields.push({ ...fieldInfo, filledValue: labelToSelect });
              }

            } else if (detection.type === 'prefecture' || detection.type === 'city' || detection.type === 'street' || detection.type === 'address' || detection.type === 'zip1' || detection.type === 'zip2' || detection.type === 'zip') {
              // 住所・郵便番号は必須の場合のみ入力
              if (!isRequired) {
                console.log(`      ℹ️ 住所/郵便番号「${fieldInfo.label}」は必須でないためスキップ`);
                return;
              }
              if (fieldInfo.tagName === 'select') {
                // Find value for prefecture/city
                let valueToSelect = '';
                const options = element.options;
                for (let i = 0; i < options.length; i++) {
                  if (options[i].textContent.includes(detection.value) || options[i].value === detection.value) {
                    valueToSelect = options[i].value;
                    break;
                  }
                }
                if (valueToSelect) {
                  actions.push({ type: 'select', selector, value: valueToSelect, label: detection.value, isAddress: detection.isAddress, required: fieldInfo.required });
                  filledFields.push({ ...fieldInfo, filledValue: detection.value });
                }
              } else {
                actions.push({ type: 'type', selector, value: detection.value, label: detection.value, x: fieldInfo.x, y: fieldInfo.y, isAddress: detection.isAddress, required: fieldInfo.required });
                filledFields.push({ ...fieldInfo, filledValue: detection.value, fieldType: detection.type });
              }
            } else if (fieldInfo.type !== 'checkbox' && fieldInfo.tagName !== 'select') {
              // Standard Text Input
              actions.push({ type: 'type', selector, value: detection.value, label: detection.value, x: fieldInfo.x, y: fieldInfo.y, isAddress: detection.isAddress, required: fieldInfo.required });
              filledFields.push({ ...fieldInfo, filledValue: detection.value, fieldType: detection.type });
            }
          } catch (e) {
            skippedFields.push({ ...fieldInfo, reason: e.message });
          }
        } else {
          // 値が不明な場合 - 入力せずにスキップ
          if (fieldInfo.required) {
            requiredButUnfilled.push({ ...fieldInfo, reason: '必須だが検出できず' });
          }
          // 必須でない場合も入力しない
        }
      });

      // Post-processing: 電話番号フィールドを位置ベースで判定
      // 電話番号関連のアクションを取得
      const telActions = actions.filter(a =>
        a.value === senderInfo.tel ||
        a.value === senderInfo.tel.replace(/-/g, '') ||
        a.value === senderInfo.tel1 ||
        a.value === senderInfo.tel2 ||
        a.value === senderInfo.tel3
      );

      if (telActions.length >= 2) {
        // 位置でグループ化（Y座標が近い = 同じ行）
        const yTolerance = 30; // 30px以内なら同じ行とみなす
        const sortedByX = [...telActions].sort((a, b) => (a.x || 0) - (b.x || 0));

        // 同じY座標にあるフィールドをカウント
        const firstY = sortedByX[0].y || 0;
        const sameRowFields = sortedByX.filter(a => Math.abs((a.y || 0) - firstY) <= yTolerance);

        if (sameRowFields.length === 3) {
          // 3つ横並び → 分割入力
          console.log('      ℹ️ 3つの電話番号フィールドを検出（横並び）。分割して入力します。');
          sameRowFields[0].value = senderInfo.tel1;
          sameRowFields[0].label += ' (分割1)';
          sameRowFields[1].value = senderInfo.tel2;
          sameRowFields[1].label += ' (分割2)';
          sameRowFields[2].value = senderInfo.tel3;
          sameRowFields[2].label += ' (分割3)';
        } else if (sameRowFields.length === 2 && telActions.length === 3) {
          // 2つ横並び + 1つ別行 → 分割入力
          console.log('      ℹ️ 3つの電話番号フィールドを検出（混合配置）。分割して入力します。');
          sortedByX[0].value = senderInfo.tel1;
          sortedByX[0].label += ' (分割1)';
          sortedByX[1].value = senderInfo.tel2;
          sortedByX[1].label += ' (分割2)';
          sortedByX[2].value = senderInfo.tel3;
          sortedByX[2].label += ' (分割3)';
        }
        // 1つだけの場合は完全な番号のまま
      }

      // Post-processing: Check for multiple 'zip' (full) actions and split them
      // 注意: 検出時に zipNoHyphen が設定されるので、それでフィルタリング
      const zipActions = actions.filter(a => a.value === senderInfo.zipNoHyphen);
      if (zipActions.length === 2) {
        console.log('      ℹ️ 2つの郵便番号フィールドを検出しました。位置ベースで分割します。');
        // X座標でソートして左から順に割り当て
        const sortedByX = zipActions.sort((a, b) => a.x - b.x);
        sortedByX[0].value = senderInfo.zip1;
        sortedByX[0].label += ' (分割1)';
        sortedByX[1].value = senderInfo.zip2;
        sortedByX[1].label += ' (分割2)';
      }

      // Post-processing: zip + zip1 パターンの検出（legal-skmt.com等）
      // zipNoHyphen(フル郵便番号)とzip1(前半3桁)が設定されている場合、再割り当て
      const zipFullAction = actions.find(a => a.value === senderInfo.zipNoHyphen);
      const zip1Action = actions.find(a => a.value === senderInfo.zip1);
      if (zipFullAction && zip1Action && zipFullAction !== zip1Action) {
        // zipNoHyphen → zip1（前半3桁）
        zipFullAction.value = senderInfo.zip1;
        zipFullAction.label += ' (前半修正)';
        // zip1 → zip2（後半4桁）
        zip1Action.value = senderInfo.zip2;
        zip1Action.label += ' (後半修正)';
      }

      // Post-processing: お名前フィールドを位置ベースで判定（2つある場合は姓/名に分割）
      const nameActions = actions.filter(a => a.value === senderInfo.fullName);
      if (nameActions.length === 2) {
        console.log('      ℹ️ 2つのお名前フィールドを検出しました。位置ベースで姓/名に分割します。');
        const sortedByX = nameActions.sort((a, b) => (a.x || 0) - (b.x || 0));
        sortedByX[0].value = senderInfo.lastName;
        sortedByX[0].label += ' (姓)';
        sortedByX[1].value = senderInfo.firstName;
        sortedByX[1].label += ' (名)';
      }

      // Post-processing: フリガナフィールドを位置ベースで判定（2つある場合はセイ/メイに分割）
      const kanaActions = actions.filter(a =>
        a.value === senderInfo.fullNameKana ||
        a.value === senderInfo.fullNameKatakana
      );
      if (kanaActions.length === 2) {
        console.log('      ℹ️ 2つのフリガナフィールドを検出しました。位置ベースでセイ/メイに分割します。');
        const sortedByX = kanaActions.sort((a, b) => (a.x || 0) - (b.x || 0));
        // カタカナかひらがなかを判定（最初のフィールドの値で判定）
        const isKatakana = kanaActions[0].value === senderInfo.fullNameKatakana;
        sortedByX[0].value = isKatakana ? senderInfo.lastNameKatakana : senderInfo.lastNameKana;
        sortedByX[0].label += ' (セイ)';
        sortedByX[1].value = isKatakana ? senderInfo.firstNameKatakana : senderInfo.firstNameKana;
        sortedByX[1].label += ' (メイ)';
      }

      // Post-processing: 住所フィールドを位置ベースで判定
      // 住所関連のアクションを取得（isAddressフラグでフィルタリング）
      const addressActions = actions.filter(a => a.isAddress === true);

      // 住所フィールドが1つも必須でなければ全てスキップ
      const hasRequiredAddress = addressActions.some(a => a.required === true);
      if (!hasRequiredAddress && addressActions.length > 0) {
        console.log('      ℹ️ 住所フィールドは全て任意のためスキップします。');
        // 住所アクションを全て削除
        for (const addr of addressActions) {
          const index = actions.indexOf(addr);
          if (index > -1) {
            actions.splice(index, 1);
          }
        }
      } else if (addressActions.length >= 2) {
        const yTolerance = 30; // 30px以内なら同じ行とみなす

        // Y座標でソート（上から下）
        const sortedByY = [...addressActions].sort((a, b) => (a.y || 0) - (b.y || 0));
        const firstY = sortedByY[0].y || 0;

        // 横並びチェック（同じY座標にあるフィールドをカウント）
        const sameRowFields = sortedByY.filter(a => Math.abs((a.y || 0) - firstY) <= yTolerance);
        const belowRowFields = sortedByY.filter(a => Math.abs((a.y || 0) - firstY) > yTolerance);

        if (sameRowFields.length >= 2) {
          // 横並びパターン（+ 下に追加フィールドがある場合も対応）
          const sortedByX = [...sameRowFields].sort((a, b) => (a.x || 0) - (b.x || 0));

          if (belowRowFields.length > 0) {
            // 混合パターン: 2つ横並び + 下にフィールドあり
            console.log(`      ℹ️ ${sortedByX.length}つの住所フィールド（横並び）+ ${belowRowFields.length}つ（下）を検出。分割して入力します。`);
            sortedByX[0].value = senderInfo.prefecture;
            sortedByX[0].label += ' (都道府県)';
            sortedByX[1].value = senderInfo.city;
            sortedByX[1].label += ' (市区町村)';
            // 下のフィールドに町名と番地を入れる
            if (belowRowFields.length >= 2) {
              // 下に2つ以上: 町名 / 番地
              belowRowFields[0].value = senderInfo.town || '';
              belowRowFields[0].label += ' (町名)';
              belowRowFields[1].value = senderInfo.street;
              belowRowFields[1].label += ' (番地)';
              // さらに下がある場合は空欄
              for (let i = 2; i < belowRowFields.length; i++) {
                belowRowFields[i].value = '';
                belowRowFields[i].label += ' (空欄)';
              }
            } else {
              // 下に1つ: 町名+番地
              belowRowFields[0].value = (senderInfo.town || '') + senderInfo.street;
              belowRowFields[0].label += ' (町名+番地)';
            }
          } else if (sortedByX.length === 3) {
            // 3つ横並び: 都道府県 / 市区町村+町名 / 番地
            console.log(`      ℹ️ 3つの住所フィールドを検出（横並び）。分割して入力します。`);
            sortedByX[0].value = senderInfo.prefecture;
            sortedByX[0].label += ' (都道府県)';
            sortedByX[1].value = senderInfo.cityTown || (senderInfo.city + (senderInfo.town || ''));
            sortedByX[1].label += ' (市区町村+町名)';
            sortedByX[2].value = senderInfo.street;
            sortedByX[2].label += ' (番地)';
          } else if (sortedByX.length === 2) {
            // 2つ横並び: 都道府県 / 市区町村+町名+番地
            console.log(`      ℹ️ 2つの住所フィールドを検出（横並び）。分割して入力します。`);
            sortedByX[0].value = senderInfo.prefecture;
            sortedByX[0].label += ' (都道府県)';
            sortedByX[1].value = (senderInfo.cityTown || senderInfo.city) + senderInfo.street;
            sortedByX[1].label += ' (市区町村+町名+番地)';
          }
        } else {
          // 縦並びパターン
          console.log(`      ℹ️ ${sortedByY.length}つの住所フィールドを検出（縦並び）。分割して入力します。`);

          if (sortedByY.length >= 4) {
            // 4つ以上: 都道府県 / 市区町村 / 町名 / 番地
            sortedByY[0].value = senderInfo.prefecture;
            sortedByY[0].label += ' (都道府県)';
            sortedByY[1].value = senderInfo.city;
            sortedByY[1].label += ' (市区町村)';
            sortedByY[2].value = senderInfo.town || '';
            sortedByY[2].label += ' (町名)';
            sortedByY[3].value = senderInfo.street;
            sortedByY[3].label += ' (番地)';
            // 5つ以上あれば空欄
            for (let i = 4; i < sortedByY.length; i++) {
              sortedByY[i].value = '';
              sortedByY[i].label += ' (空欄)';
            }
          } else if (sortedByY.length === 3) {
            // 3つ: 都道府県 / 市区町村+町名 / 番地
            sortedByY[0].value = senderInfo.prefecture;
            sortedByY[0].label += ' (都道府県)';
            sortedByY[1].value = senderInfo.cityTown || (senderInfo.city + (senderInfo.town || ''));
            sortedByY[1].label += ' (市区町村+町名)';
            sortedByY[2].value = senderInfo.street;
            sortedByY[2].label += ' (番地)';
          } else if (sortedByY.length === 2) {
            // 2つ: 都道府県 / 市区町村+町名+番地
            sortedByY[0].value = senderInfo.prefecture;
            sortedByY[0].label += ' (都道府県)';
            sortedByY[1].value = (senderInfo.cityTown || senderInfo.city) + senderInfo.street;
            sortedByY[1].label += ' (市区町村+町名+番地)';
          }
        }
        // 1つだけの場合はフル住所のまま
      }

      return { filledFields, skippedFields, requiredButUnfilled, actions };
    }, SENDER_INFO);

    // フォーム実装矛盾が検出された場合はスキップ
    if (result.formMismatch) {
      console.log(`   ⚠️  スキップ: ${result.error}`);
      return {
        success: false,
        url,
        company: companyName,
        error: result.error,
        filledCount: 0,
        skippedCount: 0
      };
    }

    // --- Execution Phase (Node.js) ---
    console.log(`   📝 実行プラン: ${result.actions.length}件の操作を実行します...`);

    // 郵便番号入力で住所が自動入力されるサイト対策：
    // 郵便番号(zip)を最後に入力するようにソート
    result.actions.sort((a, b) => {
      const aIsZip = a.label && a.label.match(/zip|郵便/i);
      const bIsZip = b.label && b.label.match(/zip|郵便/i);
      if (aIsZip && !bIsZip) return 1;  // zipを後ろへ
      if (!aIsZip && bIsZip) return -1; // zip以外を前へ
      return 0;
    });

    for (const action of result.actions) {
      try {
        const elementHandle = await page.$(action.selector);
        if (!elementHandle) {
          console.log(`      ⚠️ 要素が見つかりません: ${action.selector}`);
          continue;
        }

        if (action.type === 'type') {
          // Human-like typing with persistence check
          await elementHandle.hover();
          await page.mouse.down();
          await page.mouse.up();
          await new Promise(r => setTimeout(r, 200));

          // 一括入力（高速）
          await page.evaluate((sel, val) => {
            const el = document.querySelector(sel);
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          }, action.selector, action.value);

          await new Promise(r => setTimeout(r, 100));

        } else if (action.type === 'click') {
          // チェックボックスが非表示(display:none)の場合はラベルをクリックするか、JS経由で設定
          const isHidden = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            const style = window.getComputedStyle(el);
            return style.display === 'none' || el.offsetWidth === 0 || el.offsetHeight === 0;
          }, action.selector);

          if (isHidden) {
            // 非表示の場合: ラベルをクリックするか、JS経由でchecked=trueを設定
            const clicked = await page.evaluate((sel) => {
              const el = document.querySelector(sel);
              if (!el) return false;
              // ラベルを探す
              if (el.id) {
                const label = document.querySelector(`label[for="${el.id}"]`);
                if (label && label.offsetWidth > 0) {
                  label.click();
                  return true;
                }
              }
              // ラベルが見つからない場合はJS経由で設定
              el.checked = true;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }, action.selector);
            if (!clicked) {
              throw new Error('チェックボックスの設定に失敗');
            }
          } else {
            await elementHandle.hover();
            await elementHandle.click();
          }
        } else if (action.type === 'select') {
          await page.select(action.selector, action.value);
        }

        await new Promise(r => setTimeout(r, 500)); // Pause between fields

      } catch (e) {
        console.log(`      ❌ 操作エラー (${action.label}): ${e.message}`);
      }
    }

    console.log(`   ✅ 入力完了: ${result.filledFields.length}項目`);
    result.filledFields.forEach(field => {
      const typeLabel = field.fieldType ? ` (${field.fieldType})` : '';
      console.log(`      - ${field.label || field.name || field.placeholder}${typeLabel}: ${field.filledValue}`);
    });

    if (result.skippedFields.length > 0) {
      console.log(`   ⚠️  スキップ: ${result.skippedFields.length}項目`);
      result.skippedFields.forEach(field => {
        console.log(`      - ${field.label || field.name}: ${field.reason}`);
      });
    }

    if (result.requiredButUnfilled && result.requiredButUnfilled.length > 0) {
      console.log(`   ❗ 必須項目で未入力: ${result.requiredButUnfilled.length}項目`);
      result.requiredButUnfilled.forEach(field => {
        console.log(`      - ${field.label || field.name || field.placeholder} (${field.type})`);
      });
    }

    // 送信ボタンを探してクリック（2段階対応）
    // button, input[type="submit"], input[type="button"] に加え、aタグも検索
    const submitResult = await page.evaluate(() => {
      // まずbutton/inputを検索
      const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
      for (const button of buttons) {
        const text = button.textContent || button.value || '';
        if (text.match(/送信|submit|send|確認|登録|apply|問.*合|お問合せ|問い合わせ|無料相談|相談する/i)) {
          return {
            found: true,
            text: text.trim(),
            type: button.tagName.toLowerCase(),
            isLink: false
          };
        }
      }
      // button/inputで見つからない場合はaタグを検索
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = link.textContent || '';
        // aタグの場合、クラス名やhrefも考慮
        const className = link.className || '';
        if ((text.match(/送信|submit|send|確認|登録|apply|問.*合|お問合せ|問い合わせ|無料相談|相談する/i) ||
             className.match(/submit|confirm|send/i)) &&
            link.offsetWidth > 0 && link.offsetHeight > 0) {
          return {
            found: true,
            text: text.trim(),
            type: 'a',
            isLink: true,
            className: className
          };
        }
      }
      return { found: false };
    });

    if (submitResult.found) {
      console.log(`   📤 第1ボタン発見: "${submitResult.text}"`);

      // 確認ボタンか最終送信ボタンかを判定
      const isConfirmButton = submitResult.text.match(/確認|内容.*確認|確定|check/i);

      if (isConfirmButton) {
        console.log(`   📋 確認画面へ遷移します...`);
      }

      // 送信前確認モード
      if (CONFIG.confirmBeforeSend && !CONFIG.dryRun) {
        console.log(`\n   ⚠️  入力内容をブラウザで確認してください`);
        const userChoice = await askConfirmation();

        if (userChoice === 'skip') {
          console.log(`   ⏭️  スキップしました`);
          return {
            success: false,
            url,
            company: companyName,
            error: 'ユーザーがスキップ',
            filledCount: result.filledFields.length,
            skippedCount: result.skippedFields.length
          };
        } else if (userChoice === 'quit') {
          console.log(`   🛑 終了します`);
          return { quit: true };
        }
        console.log(`   ✅ 送信を実行します...`);
      }

      console.log(`   ⏰ 待機中...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.dryRun ? 300 : 2000)); // テスト:300ms, 本番:2000ms

      // 第1ボタンをクリック
      if (!CONFIG.dryRun) {
        await page.evaluate((isLink) => {
          // button/inputを検索
          const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
          for (const button of buttons) {
            const text = button.textContent || button.value || '';
            if (text.match(/送信|submit|send|確認|登録|apply|問.*合|お問合せ|問い合わせ|無料相談|相談する/i)) {
              button.click();
              return;
            }
          }
          // aタグを検索（button/inputで見つからない場合）
          if (isLink) {
            const links = document.querySelectorAll('a');
            for (const link of links) {
              const text = link.textContent || '';
              const className = link.className || '';
              if ((text.match(/送信|submit|send|確認|登録|apply|問.*合|お問合せ|問い合わせ|無料相談|相談する/i) ||
                   className.match(/submit|confirm|send/i)) &&
                  link.offsetWidth > 0 && link.offsetHeight > 0) {
                link.click();
                return;
              }
            }
          }
        }, submitResult.isLink);
        console.log(`   ✅ 第1ボタンクリック完了`);
      } else {
        console.log(`   🛑 テストモードのため第1ボタンクリックをスキップしました`);
      }
      await new Promise(resolve => setTimeout(resolve, CONFIG.dryRun ? 500 : 3000)); // テスト:500ms, 本番:3000ms

      // 確認画面に遷移した場合、最終送信ボタンを探す
      if (isConfirmButton) {
        console.log(`   📤 最終送信ボタンを探しています...`);

        const finalSubmitResult = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.button, a.btn');

          // 優先順位1: 「送信」系のボタン（「確認」を含まない、FAQリンク等を除外）
          for (const button of buttons) {
            const text = button.textContent || button.value || '';
            if (text.match(/送信|submit|登録|apply|問.*合|お問合せ|問い合わせ/i) && !text.match(/確認|check|戻る|back|よくある|FAQ|faq|質問/i)) {
              // リンク(a)タグは除外（ナビゲーションリンクの可能性が高い）
              if (button.tagName.toLowerCase() === 'a') continue;
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
          console.log(`   ⏰ 待機中...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.dryRun ? 300 : 2000)); // テスト:300ms, 本番:2000ms

          // 最終送信実行
          if (!CONFIG.dryRun) {
            await page.evaluate(() => {
              const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.button, a.btn');

              // 優先順位1: 「送信」系のボタン
              for (const button of buttons) {
                const text = button.textContent || button.value || '';
                if (text.match(/送信|submit|登録|apply|問.*合|お問合せ|問い合わせ/i) && !text.match(/確認|check|戻る|back/i)) {
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
          } else {
            console.log(`   🛑 テストモードのため最終送信をスキップしました`);
          }
          await new Promise(resolve => setTimeout(resolve, CONFIG.dryRun ? 500 : 3000)); // テスト:500ms, 本番:3000ms

          // 送信成功の判定
          const successCheck = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            const successKeywords = ['完了', '送信', 'ありがとう', '受け付け', '承り', 'complete', 'success', 'sent', 'thank'];
            const errorKeywords = ['エラー', '失敗', '必須', '入力してください', 'error', 'required', 'invalid'];

            // エラーメッセージが表示されているか確認
            const hasError = errorKeywords.some(keyword => bodyText.includes(keyword) && document.body.innerText.length < 5000); // 短いテキスト内でのエラー検出を優先

            // 成功メッセージまたはURLの変化（ここではURL変化は外側で判定）
            const hasSuccess = successKeywords.some(keyword => bodyText.includes(keyword));

            return { hasSuccess, hasError, bodyTextLength: bodyText.length };
          });

          const currentUrl = page.url();
          const isUrlChanged = currentUrl !== url;

          if (successCheck.hasError && !isUrlChanged) {
            console.log(`   ⚠️  送信後にエラーメッセージを検出したか、画面遷移しませんでした。`);
            return {
              success: false,
              url,
              company: companyName,
              error: '送信後にエラーまたは画面遷移なし',
              filledCount: result.filledFields.length,
              skippedCount: result.skippedFields.length
            };
          }

          if (isUrlChanged || successCheck.hasSuccess) {
            console.log(`   🎉 送信成功と判定しました（URL遷移: ${isUrlChanged}, キーワード検出: ${successCheck.hasSuccess}）`);
          } else {
            console.log(`   ⚠️  送信成功か判定できませんでした（ログには成功として記録しますが要注意）`);
          }

        } else {
          console.log(`   ⚠️  最終送信ボタンが見つかりませんでした（確認画面で完了の可能性）`);
        }
      }

      return {
        success: true,
        url,
        company: companyName,
        filledCount: result.filledFields.length,
        skippedCount: result.skippedFields.length,
        filledFields: result.filledFields  // 入力内容を記録
      };
    } else {
      console.log(`   ❌ 送信ボタンが見つかりませんでした`);

      // エラー時のスクリーンショットを保存
      let screenshotPath = null;
      try {
        if (!fs.existsSync(CONFIG.screenshotDir)) {
          fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = companyName.replace(/[^a-zA-Z0-9ぁ-んァ-ヶー一-龯]/g, '_');
        screenshotPath = `${CONFIG.screenshotDir}/${safeName}_nosubmit_${timestamp}.png`;

        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`   📸 エラー画面を保存: ${screenshotPath}`);
      } catch (screenshotError) {
        console.error(`   ⚠️  スクリーンショット保存失敗: ${screenshotError.message}`);
      }

      return {
        success: false,
        url,
        company: companyName,
        error: '送信ボタンが見つかりませんでした',
        screenshot: screenshotPath
      };
    }

  } catch (error) {
    console.error(`   ❌ エラー: ${error.message}`);

    // エラー時のスクリーンショットを保存
    let screenshotPath = null;
    try {
      if (!fs.existsSync(CONFIG.screenshotDir)) {
        fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeName = companyName.replace(/[^a-zA-Z0-9ぁ-んァ-ヶー一-龯]/g, '_');
      screenshotPath = `${CONFIG.screenshotDir}/${safeName}_${timestamp}.png`;

      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   📸 エラー画面を保存: ${screenshotPath}`);
    } catch (screenshotError) {
      console.error(`   ⚠️  スクリーンショット保存失敗: ${screenshotError.message}`);
    }

    return {
      success: false,
      url,
      company: companyName,
      error: error.message,
      screenshot: screenshotPath
    };
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 お問合せフォーム自動送信を開始します\n');
  console.log(`📋 送信者: ${SENDER_INFO.fullName} (${SENDER_INFO.company})`);
  console.log(`📧 連絡先: ${SENDER_INFO.email}`);
  console.log(`🧪 テストモード: ${CONFIG.testMode ? 'ON (最大' + CONFIG.testLimit + '件)' : 'OFF'}\n`);

  // 送信済みURLを読み込む
  const sentUrls = new Set();
  if (fs.existsSync(CONFIG.logFile)) {
    const logContent = fs.readFileSync(CONFIG.logFile, 'utf-8');
    const logLines = logContent.split('\n').filter(line => line.trim());

    // ヘッダー行をスキップして、URLを抽出
    for (let i = 1; i < logLines.length; i++) {
      const parts = logLines[i].split(',');
      if (parts.length >= 2) {
        sentUrls.add(parts[1]); // URL列
      }
    }
    console.log(`📋 送信済み: ${sentUrls.size}件をスキップします\n`);
  }

  // CSVを読み込む
  const content = fs.readFileSync(CONFIG.inputFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // ヘッダーを解析してカラムインデックスを取得
  const header = lines[0].split(',');
  let companyIndex = 0;
  let contactUrlIndex = -1;

  let sentCheckIndex = -1; // 送信済みチェック列

  header.forEach((col, idx) => {
    const colName = col.trim().toLowerCase();
    if (colName.includes('会社') || colName === '会社名') {
      companyIndex = idx;
    }
    if (colName.includes('お問合せurl') || colName.includes('問い合わせurl') || colName === 'contacturl') {
      contactUrlIndex = idx;
    }
    if (colName.includes('送信済み') || colName.includes('送信済') || colName.includes('チェック')) {
      sentCheckIndex = idx;
    }
  });

  // お問合せURLカラムが見つからない場合、最後のURLっぽいカラムを使う
  if (contactUrlIndex === -1) {
    // 従来の動作: 5カラム目（index 4）または最後のカラム
    if (header.length >= 5) {
      contactUrlIndex = 4;
    } else {
      contactUrlIndex = header.length - 1;
    }
  }

  console.log(`📋 CSV形式: 会社名[${companyIndex}], お問合せURL[${contactUrlIndex}]`);

  const targets = [];
  const startIndex = CONFIG.startFrom ? CONFIG.startFrom : 1; // startFromが指定されていればその行から開始
  console.log(`📍 開始行: ${startIndex}`);

  for (let i = startIndex; i < lines.length; i++) {
    if (CONFIG.testMode && targets.length >= CONFIG.testLimit) break;

    const parts = lines[i].split(',');
    if (parts.length > contactUrlIndex) {
      const contactUrl = parts[contactUrlIndex].trim();

      // URLが空またはhttp始まりでない場合はスキップ
      if (!contactUrl || !contactUrl.startsWith('http')) {
        continue;
      }

      // 送信済みURLはスキップ
      if (sentUrls.has(contactUrl)) {
        console.log(`⏭️  スキップ: ${parts[companyIndex]} (送信済み)`);
        continue;
      }

      // 送信済みチェック列に○があればスキップ
      if (sentCheckIndex !== -1 && parts[sentCheckIndex] && parts[sentCheckIndex].trim() === '○') {
        console.log(`⏭️  スキップ: ${parts[companyIndex]} (チェック済み)`);
        continue;
      }

      targets.push({
        company: parts[companyIndex].trim(),
        contactUrl: contactUrl
      });
    }
  }

  console.log(`📊 送信対象: ${targets.length}件\n`);

  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 300000  // 5分（クラッシュ防止）
  });

  let page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // detectFieldType関数をページに注入
  await page.evaluateOnNewDocument((senderInfo) => {
    window.detectFieldType = function (element) {
      const name = (element.name || '').toLowerCase();
      const id = (element.id || '').toLowerCase();
      const placeholder = (element.placeholder || '').toLowerCase();
      const label = element.label || '';
      const type = element.type || '';

      // 英語キーワード用（name, id, placeholder）
      const allText = `${name} ${id} ${placeholder}`.toLowerCase();
      // 日本語キーワード用（labelのみ）
      const labelText = label.toLowerCase();
      // name属性の元の値（日本語キーワード検出用）
      const nameAttr = element.name || '';

      // 最優先: name属性に日本語キーワードがある場合の早期検出
      // （ラベル取得がずれているフォーム対策）
      // ふりがなチェック（お名前より先にチェック）- ローマ字(hurigana/furigana/kana)も対応
      if (nameAttr.match(/ふりがな|フリガナ/) || name.match(/hurigana|furigana|hiragana/)) {
        const isKatakana = nameAttr.match(/フリガナ/) || labelText.match(/カタカナ/) || name.match(/katakana/);
        return { type: 'fullNameKana', value: isKatakana ? senderInfo.fullNameKatakana : senderInfo.fullNameKana };
      }
      // お名前チェック（「社名」「会社」を含まない場合のみ）
      if (nameAttr.match(/^お?名前$/) && !nameAttr.match(/社名|会社/)) {
        return { type: 'fullName', value: senderInfo.fullName };
      }
      // 部署名はスキップ
      if (nameAttr === '部署名' || nameAttr === '部署' || name === 'department' || name === 'busho') {
        return null;
      }
      // 姓/名/セイ/メイの完全一致（ocean.jpn.com等のname属性が日本語のフォーム対応）
      if (nameAttr === '姓') {
        return { type: 'lastName', value: senderInfo.lastName };
      }
      if (nameAttr === '名') {
        return { type: 'firstName', value: senderInfo.firstName };
      }
      if (nameAttr === 'セイ') {
        return { type: 'lastNameKana', value: senderInfo.lastNameKatakana };
      }
      if (nameAttr === 'メイ') {
        return { type: 'firstNameKana', value: senderInfo.firstNameKatakana };
      }
      // メールアドレス/電話番号のname属性対応
      if (nameAttr === 'メールアドレス') {
        return { type: 'email', value: senderInfo.email };
      }
      if (nameAttr === '電話番号') {
        return { type: 'tel', value: senderInfo.tel };
      }
      // 会社名/担当者名/お問い合わせ内容のname属性対応（CURVA等）
      // キタイステクノロジーズ等：name="companyName" (小文字化されるので companyname)
      if (nameAttr === '会社名' || nameAttr === '御社名' || nameAttr === '貴社名' || name === 'companyname') {
        return { type: 'company', value: senderInfo.company };
      }
      if (nameAttr.match(/担当者名|ご担当者名|お名前/) || name === 'yourname') {
        return { type: 'fullName', value: senderInfo.fullName };
      }
      if (nameAttr.match(/お問い合わせ内容|お問合せ内容|問い合わせ内容/)) {
        return { type: 'message', value: senderInfo.message };
      }
      // 役職のname属性対応（LBJ等）
      if (nameAttr === '役職') {
        return { type: 'position', value: senderInfo.position };
      }
      // sei_mei, shimei などのフルネームを示すname属性（ビー・アンド・ディー等）
      // ※ _sei, _mei は分離名前なので除外
      if (name.match(/^sei_mei$|^shimei$|^seimei$/)) {
        return { type: 'fullName', value: senderInfo.fullName };
      }
      // last_name / first_name パターンの早期検出（ad-rex, qoox等）
      // ※ラベルが「お名前」「氏名」等フルネームを示し、かつ括弧付きの「（姓）」「（名）」や単独の「姓」「名」を含まない場合は除外
      // （コロンバスプロジェクト等：name=lastnameでラベル=お名前 の実装バグ対策）
      const isFullNameLabel = labelText.match(/お名前|氏名|ご氏名|^名前$/) && !labelText.match(/[（(]姓[）)]|[（(]名[）)]|^姓$|^名$|せい$|めい$/);
      if ((name === 'last_name' || name === 'lastname' || name === 'last-name') && !isFullNameLabel) {
        return { type: 'lastName', value: senderInfo.lastName };
      }
      if ((name === 'first_name' || name === 'firstname' || name === 'first-name') && !isFullNameLabel) {
        return { type: 'firstName', value: senderInfo.firstName };
      }
      if (name === 'last_name_kana' || name === 'lastname_kana' || name === 'last-name-kana') {
        // ラベルまたはplaceholderに「カタカナ」や「セイ」があればカタカナ、なければひらがな
        const isKatakana = labelText.match(/カタカナ/) || placeholder.match(/セイ|カタカナ/);
        return { type: 'lastNameKana', value: isKatakana ? senderInfo.lastNameKatakana : senderInfo.lastNameKana };
      }
      if (name === 'first_name_kana' || name === 'firstname_kana' || name === 'first-name-kana') {
        const isKatakana = labelText.match(/カタカナ/) || placeholder.match(/メイ|カタカナ/);
        return { type: 'firstNameKana', value: isKatakana ? senderInfo.firstNameKatakana : senderInfo.firstNameKana };
      }

      // 優先順位0: お問合せ種別（selectやradio）- 「項目」があれば最優先
      // ※SELECTのラベルにオプション値が含まれる場合、会社名判定より先にチェック
      if ((element.tagName === 'select' || type === 'radio') &&
        (labelText.match(/項目|種別|区分|カテゴリ|事項|お問.*合|希望.*内容|ご希望/) || name.match(/inquiry|category|matters/))) {
        // ラジオボタンはrequiredRadioとして処理（requiredRadio内でisInquiryTypeチェックあり）
        if (type === 'radio') {
          return { type: 'requiredRadio', value: 'auto' };
        }
        return { type: 'inquiryType', value: 'other' };
      }

      // 優先順位1: 会社名（coname = company name の略）
      // ※「会社URL」「ホームページ」「サイト」等を含む場合は除外
      // ※ラベルに「担当者」「電話」「メール」「ふりがな」「お名前」等が含まれる場合は除外（company_person_name等のプレフィックス対策）
      if ((allText.match(/company|corp|organization|coname/) || labelText.match(/会社|法人|屋号|貴社|貴殿|組織|社名|団体/)) &&
          !allText.match(/url|website|homepage/) && !labelText.match(/url|ホームページ|サイト|アドレス/i) &&
          !labelText.match(/担当|電話|メール|ふりがな|フリガナ|お名前|氏名|問.*合.*せ|内容/)) {
        return { type: 'company', value: senderInfo.company };
      }

      // 優先順位2: メールアドレス
      // ※「お問い合わせ内容」「Mail Contents」等のラベルは除外
      // ※mail_xxxプレフィックスパターンにマッチしないよう、emailまたは_mail、または単語境界で囲まれたmailのみを検出
      if (!labelText.match(/内容|contents/i) &&
          (type === 'email' || allText.match(/email|e-mail|_mail\b|\bmail\b/) || labelText.match(/メール|e-mail|mail/))) {
        return { type: 'email', value: senderInfo.email };
      }

      // 優先順位3: 電話番号
      // キーワードのみで判定（type="tel"は信頼性が低いため除外）
      // allTextにも日本語の「電話」を含める（name属性に「電話番号[data][0]」のようなパターンがある場合）
      // ※「お問い合わせ内容」等のラベルは除外
      // ※ラベルに「フリガナ」が含まれる場合は除外（GIGA等：name=contacts__phoneだがLabel=フリガナ）
      // ※携帯番号が必須でない場合はスキップ（電話番号が既にあれば不要）
      if (labelText.match(/携帯/) && !labelText.match(/必須/) && allText.match(/mobile/)) {
        return { type: 'skip', value: '' };
      }
      if (!labelText.match(/内容|contents|フリガナ|ふりがな/i) &&
          (allText.match(/tel|phone|mobile|電話/) || labelText.match(/電話|携帯|連絡先/))) {
        // 電話番号が分割されている場合（tel1, tel2, tel3など）
        // [data][0], [data][1], [data][2] パターンも対応（例: 電話番号[data][0]）
        // tel_1, tel-1, phone_1, phone-1, mobile_1 等のアンダースコア・ハイフン区切りも対応
        // ※tel-388のような名前に誤マッチしないよう、数字の後に別の数字が続かないことを確認
        // FC2フォーム等: ラベルが「電話」で、name属性が _1, _2, _3 で終わる場合も対応
        // 電話番号分割検出：tel1, tel_1, phone-1等。ただしphone-3b8aa(UUID)やtel1;s等は除外
        // (?![a-zA-Z0-9;]) で数字・英字・セミコロンが後に続く場合を除外
        if (allText.match(/tel[_-]?1(?![a-zA-Z0-9;])|phone[_-]1(?![a-zA-Z0-9;])|mobile[_-]?1(?![a-zA-Z0-9;])|\[data\]\[0\]/) || labelText.match(/電話\s*1|携帯\s*1/) || (labelText.match(/電話|携帯/) && name.match(/_1$/))) {
          return { type: 'tel1', value: senderInfo.tel1 };
        }
        if (allText.match(/tel[_-]?2(?![a-zA-Z0-9;])|phone[_-]2(?![a-zA-Z0-9;])|mobile[_-]?2(?![a-zA-Z0-9;])|\[data\]\[1\]/) || labelText.match(/電話\s*2|携帯\s*2/) || (labelText.match(/電話|携帯/) && name.match(/_2$/))) {
          return { type: 'tel2', value: senderInfo.tel2 };
        }
        if (allText.match(/tel[_-]?3(?![a-zA-Z0-9;])|phone[_-]3(?![a-zA-Z0-9;])|mobile[_-]?3(?![a-zA-Z0-9;])|\[data\]\[2\]/) || labelText.match(/電話\s*3|携帯\s*3/) || (labelText.match(/電話|携帯/) && name.match(/_3$/))) {
          return { type: 'tel3', value: senderInfo.tel3 };
        }
        return { type: 'tel', value: senderInfo.tel };
      }

      // 優先順位4: 郵便番号
      // postcode パターンも検出（kaishahojin.com等）
      if (allText.match(/zip|postal|postcode/) || labelText.match(/郵便|〒/)) {
        // 郵便番号が分割されている場合（01, 1, 前半など）
        // postcode_1, postcode_2 パターンも対応
        if (allText.match(/zip.*01|zip.*1(?!\d)|postcode.*1(?!\d)/) || labelText.match(/郵便.*1|前半/)) {
          return { type: 'zip1', value: senderInfo.zip1 };
        }
        if (allText.match(/zip.*02|zip.*2(?!\d)|postcode.*2(?!\d)/) || labelText.match(/郵便.*2|後半/)) {
          return { type: 'zip2', value: senderInfo.zip2 };
        }
        // 単一フィールドの場合（ハイフンなしで統一 - 互換性が高い）
        return { type: 'zip', value: senderInfo.zipNoHyphen };
      }

      // 優先順位5: 住所
      // 単独の「住所」ラベル → フル住所を優先
      if (label.match(/^住所$|^ご住所$|^住所必須$/)) {
        return { type: 'address', value: senderInfo.address, isAddress: true };
      }
      // 都道府県（日本語ラベルを先に判定）
      if (labelText.match(/都道府県/) || allText.match(/prefecture|todohuken|todofuken|todouhuken|\bpref\b/)) {
        return { type: 'prefecture', value: senderInfo.prefecture, isAddress: true };
      }
      // 市区町村・番地がセットになっている場合
      if ((labelText.match(/市区町村/) && labelText.match(/番地/)) || allText.match(/city.*block|city.*street/)) {
        return { type: 'cityStreet', value: senderInfo.city + senderInfo.street, isAddress: true };
      }
      // 市区町村（日本語ラベルを先に判定）
      if ((labelText.match(/市区町村/) || allText.match(/\bcity\b/)) && !labelText.match(/都道府県/)) {
        return { type: 'city', value: senderInfo.city, isAddress: true };
      }
      // 番地以降（日本語ラベルを先に判定）
      if (labelText.match(/番地|町名/) || label.match(/住所[2-9]|住所.*詳細|詳細.*住所/) || allText.match(/street|block|\baddr\b/)) {
        return { type: 'street', value: senderInfo.street, isAddress: true };
      }
      // 建物名
      if (allText.match(/building|apt|apartment/) || labelText.match(/ビル|建物/)) {
        return { type: 'building', value: '', isAddress: true };
      }
      // フル住所（日本語ラベルを先に判定）
      if (labelText.match(/住所|所在地/) || (allText.match(/address/) && !allText.match(/mail/))) {
        return { type: 'address', value: senderInfo.address, isAddress: true };
      }

      // 優先順位6: 業種
      if (allText.match(/industry/) || labelText.match(/業種|業界|業態/)) {
        return { type: 'industry', value: senderInfo.industry };
      }

      // 優先順位6.5: 役職
      if (allText.match(/position|title|job.*title/) || labelText.match(/役職|肩書|ポジション/)) {
        // select/radioの場合は自動選択
        if (element.tagName === 'select' || type === 'radio') {
          return { type: 'requiredSelect', value: 'auto' };
        }
        // textの場合は「代表」を入力
        return { type: 'position', value: senderInfo.position };
      }

      // 優先順位6.6: 件名・題名（checkbox/radioは除外）
      // 注意: title は ext_title_XX 等の汎用IDにマッチしてしまうため、より限定的なパターンに
      if (type !== 'checkbox' && type !== 'radio' && (allText.match(/subject|^title$|_title$/) || labelText.match(/件名|題名|タイトル/)) && !labelText.match(/会社|法人|お名前|氏名/)) {
        return { type: 'subject', value: senderInfo.subject };
      }

      // 優先順位7: お問合せ種別（selectやradio）
      if ((element.tagName === 'select' || type === 'radio') &&
        (allText.match(/type|category|matters/) || labelText.match(/種別|区分|項目|カテゴリ|分類|事項|お問.*合/) || name.match(/inquiry/))) {
        return { type: 'inquiryType', value: 'other' }; // 「その他」を選択
      }

      // 優先順位7.3: 必須SELECTの汎用処理
      if (element.tagName === 'select') {
        return { type: 'requiredSelect', value: 'auto' };
      }

      // 優先順位7.4: 必須radioの汎用処理
      if (type === 'radio') {
        return { type: 'requiredRadio', value: 'auto' };
      }

      // 優先順位8: お問合せ内容（キーワードマッチのみ）※radio/checkboxは除外
      // ※TEXTAREAでも無条件には入力しない（国籍等の誤入力防止）
      // 除外: 日付・時間・住所・URL・人数・ファイル関連・国籍・担当者・お名前・フリガナ
      // 注意: inquiry は inquiry_item_name 等にマッチしてしまうため削除
      // 注意: question\d+ (FormStack等のQuestion1, Question2等) は個別フィールド名なのでmessageとして扱わない
      if (type !== 'radio' && type !== 'checkbox' &&
          !labelText.match(/希望日|日時|日付|予約|時間|時刻|詳細.*住所|住所.*詳細|url|ホームページ|サイト|人数|参加|添付|ファイル|国籍|担当者|お名前|氏名|ふりがな|フリガナ/) &&
          !name.match(/^question\d+$/i) &&
          (allText.match(/message|question|comment|remarks|note|description|body|content[^_]|_text/) ||
          labelText.match(/問.*合|相談|詳細|内容|ご質問|ご相談|備考|質問|コメント|ご意見|メッセージ|ご要望|ご用件|ご連絡|自由|補足|追記/))) {
        return { type: 'message', value: senderInfo.message };
      }

      // 優先順位8.3: 同意チェックボックス（スパム防止チェックを含む）
      // ※汎用checkbox処理より前に配置する必要あり
      if (type === 'checkbox' && (allText.match(/accept|agree|privacy|spam/) || labelText.match(/同意|承諾|個人情報|スパム|チェック.*送信|確認.*送信/))) {
        return { type: 'agreement', value: true };
      }

      // 優先順位8.5: 必須checkboxの汎用処理
      if (type === 'checkbox') {
        return { type: 'requiredCheckbox', value: 'auto' };
      }

      // 優先順位9: ふりがな（フルネーム用）- 「ふりがな」「フリガナ」を含むラベル（「必須フリガナ」等にも対応）
      if (labelText.match(/ふりがな|フリガナ|よみがな|ヨミガナ/) && !labelText.match(/会社|法人|姓名|せい|めい/)) {
        const isKatakana = labelText.match(/カタカナ|フリガナ|ヨミガナ/);
        return { type: 'fullNameKana', value: isKatakana ? senderInfo.fullNameKatakana : senderInfo.fullNameKana };
      }

      // 優先順位9.5: ふりがな（分離）- 名前より先にチェック
      if ((allText.match(/kana.*head|head.*kana|last.*kana/) || labelText.match(/せい.*かな|みょうじ.*かな/)) && !labelText.match(/会社|法人/)) {
        return { type: 'lastNameKana', value: senderInfo.lastNameKana };
      }
      if ((allText.match(/kana.*body|body.*name|first.*kana/) || labelText.match(/めい.*かな/)) && !labelText.match(/会社|法人|氏名|お名前/)) {
        return { type: 'firstNameKana', value: senderInfo.firstNameKana };
      }

      // 優先順位10: 氏名（フルネーム）- 「氏名」を先に判定
      if (label.match(/^氏名$|^お名前$|^ご氏名$|^お名前必須$/)) {
        return { type: 'fullName', value: senderInfo.fullName };
      }

      // 優先順位10.5: 姓名（分離）
      // ラベルが「名」だけの場合
      if (label === '名') {
        return { type: 'firstName', value: senderInfo.firstName };
      }
      if (label === '姓' || label === '苗字') {
        // 名前フィールドが1つの場合はfullNameとして扱う
        if (window.isSingleNameField) {
          return { type: 'fullName', value: senderInfo.fullName };
        }
        return { type: 'lastName', value: senderInfo.lastName };
      }
      // ラベルが「セイ」「メイ」（カタカナ/ひらがな）の場合はカナを返す
      if (label === 'メイ' || label === 'めい') {
        return { type: 'firstNameKana', value: senderInfo.firstNameKatakana };
      }
      if (label === 'セイ' || label === 'せい') {
        return { type: 'lastNameKana', value: senderInfo.lastNameKatakana };
      }

      // 姓（lastName）検出: _sei, username_sei, onamae_sei, Name_Last 等のパターンも対応
      // ※「山田 太郎」のようなフルネーム形式のplaceholderはfullNameとして扱う
      if ((allText.match(/name.*head|head.*name|last.*name|name_last|name-last|^sei\b|_sei\b|onamae.*sei/) || labelText.match(/姓(?!.*名)|苗字|みょうじ/) || (placeholder && placeholder.match(/例[：:]?\s*山田$/) && !placeholder.match(/太郎|花子/))) && !labelText.match(/会社|法人/)) {
        // 名前フィールドが1つの場合はfullNameとして扱う
        if (window.isSingleNameField) {
          return { type: 'fullName', value: senderInfo.fullName };
        }
        return { type: 'lastName', value: senderInfo.lastName };
      }
      // firstName: _mei, username_mei, Name_First パターンは「氏名」「お名前」ラベルでも優先検出
      if (allText.match(/_mei\b|onamae.*mei|name_first|name-first/) || (placeholder && placeholder.match(/例[：:]?\s*太郎/))) {
        return { type: 'firstName', value: senderInfo.firstName };
      }
      // firstName: 通常パターン（「氏名」「お名前」を除外）
      if ((allText.match(/name.*body|body.*name|first.*name|^mei\b/)) && !labelText.match(/会社|法人|代表|氏名|お名前/)) {
        return { type: 'firstName', value: senderInfo.firstName };
      }

      // 優先順位11: フルネーム（代表者名を含む）
      // "部署"、"紹介者"、"サービス"、"URL"が含まれる場合は除外
      // name属性が日本語の場合（例: name="氏名"）もallTextでマッチ
      if ((allText.match(/name|氏名|名前/) || labelText.match(/名前|氏名|お名前|代表者|担当者/)) && !allText.match(/corp|会社|法人|社名|屋号|組織|部署|紹介|service|url|website|homepage/) && !labelText.match(/会社|法人|社名|屋号|組織|部署|紹介|サービス|利用|url|ホームページ|サイト/i)) {
        if (allText.match(/kana|フリガナ|ふりがな/) || labelText.match(/かな|ふりがな|フリガナ/)) {
          return { type: 'fullNameKana', value: senderInfo.fullNameKana };
        }
        return { type: 'fullName', value: senderInfo.fullName };
      }

      // 優先順位11.5: placeholderが全てひらがな → ふりがな
      if (placeholder && placeholder.match(/^[ぁ-ん\\s　]+$/)) {
        return { type: 'fullNameKana', value: senderInfo.fullNameKana };
      }
      // placeholderが全てカタカナ → フリガナ
      if (placeholder && placeholder.match(/^[ァ-ヶー\\s　]+$/)) {
        return { type: 'fullNameKana', value: senderInfo.fullNameKatakana };
      }
      // placeholderが日本人名パターン（山田太郎、例: 山田 太郎 等）→ fullName（meyco等）
      if (placeholder && placeholder.match(/^(例[：:]\\s*)?[一-龥ぁ-んァ-ヶ]{1,5}[\\s　]?[一-龥ぁ-んァ-ヶ]{1,5}$/)) {
        return { type: 'fullName', value: senderInfo.fullName };
      }

      // Debug logging
      // console.log(`Field: ${name} (${type}), Label: ${label}, AllText: ${allText}`);

      return { type: 'other', value: '' };
    };
  }, SENDER_INFO);

  const results = [];

  // ページリカバリー関数
  async function ensurePageValid() {
    try {
      // ページが有効かチェック
      await page.evaluate(() => true);
      return true;
    } catch (e) {
      console.log('   🔄 ページを再作成中...');
      try {
        await page.close();
      } catch (closeErr) {
        // 閉じられなくても無視
      }
      page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      return false;
    }
  }

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    console.log(`\n[${i + 1}/${targets.length}] ${target.company}`);

    // ページが有効か確認、無効なら再作成
    await ensurePageValid();

    const result = await fillForm(page, target.contactUrl, target.company);

    // ユーザーが終了を選択した場合
    if (result.quit) {
      console.log(`\n🛑 ユーザーにより終了しました`);
      break;
    }

    results.push(result);

    // 送信成功時に元CSVの「送信済み」列に○をつける（本番のみ）
    if (result.success && !CONFIG.dryRun) {
      try {
        const csvContent = fs.readFileSync(CONFIG.inputFile, 'utf-8');
        const lines = csvContent.split('\n');
        let updated = false;
        for (let j = 0; j < lines.length; j++) {
          // 会社名でマッチング（完全一致または含む）
          if (lines[j].includes(result.company) || lines[j].includes(target.contactUrl)) {
            const parts = lines[j].split(',');
            // 4列目（送信済み列）があれば更新、なければ追加
            if (parts.length >= 4) {
              parts[3] = '○';
              lines[j] = parts.join(',');
            } else if (parts.length === 3) {
              lines[j] = lines[j] + ',○';
            }
            updated = true;
            break;
          }
        }
        if (updated) {
          fs.writeFileSync(CONFIG.inputFile, lines.join('\n'), 'utf-8');
          console.log(`   ✅ CSVに送信済みマーク(○)を追加しました`);
        }
      } catch (e) {
        console.log(`   ⚠️ CSV更新エラー: ${e.message}`);
      }
    }

    // リアルタイムで入力ログを追記保存
    const detailLogFile = CONFIG.inputFile.replace('.csv', '_入力ログ.txt');
    const detailLines = [];
    detailLines.push(`【${result.company}】`);
    detailLines.push(`URL: ${result.url}`);
    detailLines.push(`結果: ${result.success ? '成功' : '失敗'}`);
    if (result.error) detailLines.push(`エラー: ${result.error}`);
    if (result.filledFields && result.filledFields.length > 0) {
      detailLines.push(`入力内容:`);
      result.filledFields.forEach(f => {
        const value = f.filledValue || '';
        const shortValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
        detailLines.push(`  - ${f.label || f.fieldType || 'unknown'}: ${shortValue}`);
      });
    }
    detailLines.push('');
    fs.appendFileSync(detailLogFile, detailLines.join('\n') + '\n', 'utf-8');

    if (i < targets.length - 1) {
      console.log(`   ⏳ ${CONFIG.delayBetweenSubmissions / 1000}秒待機...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenSubmissions));
    }
  }

  await browser.close();

  // 結果を追記保存
  const logLines = [];

  // ファイルが存在しない場合はヘッダーを追加
  if (!fs.existsSync(CONFIG.logFile)) {
    logLines.push('会社名,URL,結果,入力項目数,スキップ項目数,入力詳細,エラー');
  }

  // 結果行を追加
  results.forEach(r => {
    // 入力詳細を整形（項目名:値 の形式で | 区切り）
    let inputDetail = '';
    if (r.filledFields && r.filledFields.length > 0) {
      inputDetail = r.filledFields.map(f => {
        const label = f.label || f.fieldType || 'unknown';
        const value = (f.filledValue || '').substring(0, 30).replace(/,/g, '，').replace(/\n/g, ' ');
        return `${label}:${value}`;
      }).join(' | ');
    }
    logLines.push(`${r.company},${r.url},${r.success ? '成功' : '失敗'},${r.filledCount || 0},${r.skippedCount || 0},"${inputDetail}",${r.error || ''}`);
  });

  // ファイルに追記
  if (logLines.length > 0) {
    const existingContent = fs.existsSync(CONFIG.logFile) ? fs.readFileSync(CONFIG.logFile, 'utf-8') : '';
    const newContent = existingContent + (existingContent ? '\n' : '') + logLines.join('\n');
    fs.writeFileSync(CONFIG.logFile, newContent, 'utf-8');
  }

  // 失敗・スキップリストを別CSVに保存（次回再送信用）
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    const failedFile = CONFIG.inputFile.replace('.csv', '_失敗リスト.csv');
    const failedLines = ['会社名,サービスURL,お問合せURL,理由'];
    failedResults.forEach(r => {
      failedLines.push(`${r.company},,${r.url},${r.error || ''}`);
    });
    fs.writeFileSync(failedFile, failedLines.join('\n'), 'utf-8');
    console.log(`\n📋 失敗・スキップリスト: ${failedFile} (${failedResults.length}件)`);
  }

  // 入力内容の詳細ログを保存
  const detailLogFile = CONFIG.inputFile.replace('.csv', '_入力ログ.txt');
  const detailLines = [];
  detailLines.push(`=== 送信ログ ${new Date().toLocaleString('ja-JP')} ===\n`);

  results.forEach(r => {
    detailLines.push(`【${r.company}】`);
    detailLines.push(`URL: ${r.url}`);
    detailLines.push(`結果: ${r.success ? '成功' : '失敗'}`);
    if (r.error) detailLines.push(`エラー: ${r.error}`);
    if (r.filledFields && r.filledFields.length > 0) {
      detailLines.push(`入力内容:`);
      r.filledFields.forEach(f => {
        const value = f.filledValue || '';
        // 長いテキストは50文字で切る
        const shortValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
        detailLines.push(`  - ${f.label || f.fieldType || 'unknown'}: ${shortValue}`);
      });
    }
    detailLines.push('');
  });

  fs.appendFileSync(detailLogFile, detailLines.join('\n') + '\n', 'utf-8');
  console.log(`📝 入力ログ: ${detailLogFile}`);

  console.log(`\n\n✅ 完了！`);
  console.log(`📊 成功: ${results.filter(r => r.success).length}件`);
  console.log(`📊 失敗: ${results.filter(r => !r.success).length}件`);
  console.log(`📄 ログ: ${CONFIG.logFile}`);
}

main();
