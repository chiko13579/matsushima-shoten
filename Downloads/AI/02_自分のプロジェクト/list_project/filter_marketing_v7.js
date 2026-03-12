const fs = require('fs');

const INPUT_FILE = '全国のデジタルマーケティング会社リスト_進行中.csv';
const OUTPUT_FILE = '全国のデジタルマーケティング会社リスト_filtered.csv';
const EXCLUDED_FILE = '全国のデジタルマーケティング会社リスト_excluded.csv';

// 確実なマーケティングキーワード（部分一致でOK）
const SURE_MARKETING_KEYWORDS = [
  // マーケティング系
  'マーケティング', 'marketing', 'マーケ',
  '広告', 'advertising', 'アドバタイジング', 'アド',
  'プロモーション', 'promotion',
  'ブランディング', 'branding',
  'コンサルティング', 'consulting', 'コンサル',
  // デザイン・クリエイティブ系
  'クリエイティブ', 'creative',
  'デザイン', 'design',
  'グラフィック', 'graphic',
  'アートディレクション', 'art direction',
  // Web制作系
  'web制作', 'ウェブ制作', 'ホームページ制作', 'サイト制作', 'hp制作',
  'webサイト', 'ウェブサイト', 'ホームページ',
  'webデザイン', 'ウェブデザイン',
  'コーディング', 'coding',
  'フロントエンド', 'frontend', 'バックエンド', 'backend',
  // SEO・広告運用
  'seo', 'リスティング', 'sns運用', 'sns代行',
  'google広告', 'yahoo広告', 'facebook広告', 'instagram広告',
  'ppc', 'sem', 'meo',
  // 代理店
  '代理店', 'agency', 'エージェンシー',
  // 企画・プランニング
  '企画', 'プランニング', 'planning',
  '集客', '販促', '販売促進',
  // 動画・映像
  '動画制作', '映像制作', '動画編集', '映像編集',
  'youtube', 'ユーチューブ',
  // コンテンツ
  'コンテンツ', 'content',
  'ライティング', 'writing', 'ライター',
  'コピーライティング', 'コピーライター',
  // メディア
  'メディア', 'media',
  // デジタル・IT
  'デジタル', 'digital',
  'プロダクション', 'production',
  'ソリューション', 'solution',
  'システム開発', 'ソフトウェア', 'アプリ開発',
  'it企業', 'it会社', 'テック', 'tech',
  // EC関連
  'ecサイト', 'eコマース', 'ecommerce', 'ネットショップ', 'オンラインショップ',
  'shopify', 'ec構築',
  // その他
  'cms', 'wordpress', 'ワードプレス',
  'ui', 'ux', 'ui/ux',
  'lp制作', 'ランディングページ',
  'バナー制作', 'バナー広告',
  '印刷', 'print', 'プリント',
  'dtp', '編集', 'エディトリアル',
  'スタジオ', 'studio',
  'ラボ', 'lab',
];

// 短いキーワード（単語境界でマッチ）
const WORD_BOUNDARY_KEYWORDS = [
  'web', 'pr', 'ec', 'dx', 'crm', 'cms', 'erp',
];

// 除外するドメイン
const EXCLUDE_DOMAINS = [
  // 法人・会社情報
  'houjin.info', 'alarmbox.jp', 'baseconnect.in', 'kaisharesearch.com',
  'everytown.info', 'cnavi.g-search.or.jp', 'tdb.co.jp', 'bigcompany.jp', 'houjin.goo.to',
  // 地図・電話帳
  'mapion.co.jp', 'map.yahoo.co.jp', '24u.jp', 'itp.ne.jp', 'navitime.co.jp', 'ekiten.jp',
  'locator.kubota.com', 'townpage.goo.ne.jp',
  // 求人
  'hello-work.info', 'hellowork', 'stanby.com', 'indeed.com', 'rikunabi.com',
  'mynavi.jp', 'doda.jp', 'en-japan.com', 'wantedly.com', 'job.tsite.jp',
  'ownedmaker.com', 'green-japan.com', 'bizreach.jp', 'type.jp', 'jobmedley.com',
  'jobnavi.org', 'hatarakitai.jp', '求人ボックス', 'xn--pckua2a7gp15o89zb.com', 'en-gage.net',
  // まとめ・比較
  'imitsu.jp', 'comparebiz.net', 'meetsmore.com', 'kakaku.com', 'pitta-lab.com', 'itreview.jp',
  // ブログプラットフォーム
  'note.com', 'qiita.com', 'ameblo.jp', 'jimdofree.com', 'hatena.ne.jp', 'hatenablog.com',
  // SNS
  'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'x.com',
  // 行政
  '.lg.jp', '.go.jp', '.tochigi.jp', '.mie.jp', 'g-reiki.net',
  // ふるさと納税・通販モール
  'furusato', 'wowma.jp', 'rakuten.co.jp', 'amazon.co.jp',
  // 教育ポータル
  'shingakunet.com',
  // ニュース・メディア
  'nikkei.com', 'nikkan.co.jp', 'prtimes.jp', 'keizai.biz', 'news.yahoo.co.jp',
  'chugoku-np.co.jp', 'digitalpr.jp', 'entamerush.jp', 'shimotsuke.co.jp', 'shinmai.co.jp', 'jomo-news.co.jp',
  // 書籍
  'book.cm-marketing.jp',
  // 大企業
  'bandainamco', 'canon-its.co.jp', 'sega.co.jp', 'kubota.com', 'lagunatenbosch.co.jp',
  'toshibatec.co.jp', 'dai-ichi-life', 'toshiba.co.jp',
  // 大手広告代理店
  'hakuhodo', 'dentsu', 'adk', 'cyberagent',
  // メディア
  'discoverjapan', 'g-press.net',
  // スポーツ・レジャー
  'dmksnowboard', 'snowboard',
  // ものづくり・工場
  'totsukuru.jp', 'jihatsu.net', 'kjss.or.jp',
  // 中小企業支援・商工会・観光協会
  'smenet.or.jp', 'shokokai.or.jp', 'kanko.jp', 'kankou.jp',
  // 社会福祉協議会
  'syakyo.or.jp', 'shakyo.or.jp', 'fsyakyo.or.jp',
  // 選挙・銀行
  'go2senkyo.com', 'zengin.ajtw.net',
  // その他ポータル
  'korps.jp', 'kinabal.co.jp', 'web-bugyo.com', 'shobo.info', 'webcatplus.jp',
  'tenant-shop.com', 'goguynet.jp', 'netj.jp', 'doraever.jp', 'shizumatch.jp',
];

// 除外するURLパターン
const EXCLUDE_URL_PATTERNS = [
  '/recruit/', '/job/', '/career/', '/employment/',
  '.pdf',
  '/facility/',
];

// 明らかに違う業種キーワード
const EXCLUDE_KEYWORDS = [
  '病院', 'クリニック', '医院', '歯科', '薬局', '介護', '福祉', '看護',
  '不動産', '賃貸', '物件',
  '美容室', '美容院', 'ヘアサロン', 'エステ', 'ネイル',
  '弁護士', '税理士', '司法書士', '行政書士',
  '葬儀', '葬祭',
  '運送', '運輸', '引越', '物流',
  'レストラン', '居酒屋', 'ラーメン', 'カフェ',
  '建設', '建築', '工務店', 'リフォーム',
  '自動車', '車検', 'モータース',
  '学習塾', '予備校', '幼稚園', '保育園',
  'ホテル', '旅館', '温泉', 'リゾート',
  '農業', '農園',
  'スノーボード', 'スキー', 'ゴルフ場',
  '工場', '製造業', '製作所',
  '産業株式会社',
];

function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function hasMarketingKeyword(text) {
  const lower = text.toLowerCase();

  // 確実なキーワード
  for (const kw of SURE_MARKETING_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      return { found: true, keyword: kw };
    }
  }

  // 単語境界キーワード（前後が英数字でない）
  for (const kw of WORD_BOUNDARY_KEYWORDS) {
    const regex = new RegExp(`(?<![a-z0-9])${kw}(?![a-z0-9])`, 'i');
    if (regex.test(text)) {
      return { found: true, keyword: kw };
    }
  }

  return { found: false };
}

function hasExcludeKeyword(text) {
  const lower = text.toLowerCase();
  for (const kw of EXCLUDE_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      return { found: true, keyword: kw };
    }
  }
  return { found: false };
}

function shouldExclude(title, url) {
  const domain = getDomain(url);
  const urlLower = url.toLowerCase();

  for (const excludeDomain of EXCLUDE_DOMAINS) {
    if (domain.includes(excludeDomain) || urlLower.includes(excludeDomain)) {
      return { exclude: true, reason: `除外ドメイン: ${excludeDomain}` };
    }
  }

  for (const pattern of EXCLUDE_URL_PATTERNS) {
    if (urlLower.includes(pattern)) {
      return { exclude: true, reason: `除外URL: ${pattern}` };
    }
  }

  if (domain.endsWith('.lg.jp') || domain.endsWith('.go.jp') ||
      domain.includes('.city.') || domain.includes('.pref.')) {
    return { exclude: true, reason: '行政サイト' };
  }

  return { exclude: false };
}

function main() {
  console.log('📂 ファイル読み込み中...');
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const header = lines[0];
  const dataLines = lines.slice(1);

  console.log(`📊 入力データ: ${dataLines.length}件\n`);

  const keepCompanies = [];
  const excludedCompanies = [];
  const excludeReasons = {};
  const matchedKeywords = {};

  for (const line of dataLines) {
    const [city, title, url, searchKeyword] = parseCSVLine(line);
    const combined = (title || '') + ' ' + (url || '') + ' ' + (searchKeyword || '');

    // 除外ドメイン/URLチェック
    const excludeResult = shouldExclude(title || '', url || '');
    if (excludeResult.exclude) {
      excludedCompanies.push(line);
      excludeReasons[excludeResult.reason] = (excludeReasons[excludeResult.reason] || 0) + 1;
      continue;
    }

    // マーケティングキーワードチェック
    const marketingResult = hasMarketingKeyword(combined);
    if (!marketingResult.found) {
      excludedCompanies.push(line);
      excludeReasons['マーケキーワードなし'] = (excludeReasons['マーケキーワードなし'] || 0) + 1;
      continue;
    }

    // 除外キーワードチェック
    const excludeKwResult = hasExcludeKeyword(combined);
    if (excludeKwResult.found) {
      excludedCompanies.push(line);
      excludeReasons[`除外KW: ${excludeKwResult.keyword}`] = (excludeReasons[`除外KW: ${excludeKwResult.keyword}`] || 0) + 1;
      continue;
    }

    keepCompanies.push(line);
    matchedKeywords[marketingResult.keyword] = (matchedKeywords[marketingResult.keyword] || 0) + 1;
  }

  console.log(`✅ 残す（マーケ会社）: ${keepCompanies.length}件`);
  console.log(`❌ 除外: ${excludedCompanies.length}件\n`);

  console.log('マッチしたキーワード（上位20件）:');
  const sortedKeywords = Object.entries(matchedKeywords).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [kw, count] of sortedKeywords) {
    console.log(`  ${kw}: ${count}件`);
  }

  console.log('\n除外理由の内訳（上位15件）:');
  const sortedReasons = Object.entries(excludeReasons).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [reason, count] of sortedReasons) {
    console.log(`  ${reason}: ${count}件`);
  }

  fs.writeFileSync(OUTPUT_FILE, [header, ...keepCompanies].join('\n'), 'utf-8');
  console.log(`\n💾 保存完了: ${OUTPUT_FILE}`);

  fs.writeFileSync(EXCLUDED_FILE, [header, ...excludedCompanies].join('\n'), 'utf-8');
  console.log(`💾 除外リスト: ${EXCLUDED_FILE}`);
}

main();
