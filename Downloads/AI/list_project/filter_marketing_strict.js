const fs = require('fs');

const INPUT_FILE = '全国のデジタルマーケティング会社リスト_進行中.csv';
const OUTPUT_FILE = '全国のデジタルマーケティング会社リスト_filtered.csv';
const EXCLUDED_FILE = '全国のデジタルマーケティング会社リスト_excluded.csv';

// 確実なマーケティング会社キーワード（タイトル/URLのみでマッチ）
const CORE_MARKETING_KEYWORDS = [
  // 会社名に含まれやすいキーワード（厳選）
  'マーケティング', 'marketing',
  '広告', 'advertising',
  'デザイン', 'design',
  'クリエイティブ', 'creative',
  'web制作', 'ウェブ制作', 'ホームページ制作',
  'seo',
  '代理店', 'agency',
  'プロダクション', 'production',
  'コンサルティング', 'consulting',
  'デジタル', 'digital',
  'スタジオ', 'studio',
];

// URLがトップページまたは会社概要ページかチェック
function isCompanyPage(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();

    // トップページ
    if (path === '/' || path === '') return true;

    // 会社概要ページ
    if (path.includes('/company') || path.includes('/about') ||
        path.includes('/profile') || path.includes('/corporate')) return true;

    // サービスページ
    if (path.includes('/service') || path.includes('/business')) return true;

    return false;
  } catch {
    return false;
  }
}

// 除外するドメイン
const EXCLUDE_DOMAINS = [
  // 法人・会社情報ポータル
  'houjin.info', 'alarmbox.jp', 'baseconnect.in', 'kaisharesearch.com',
  'everytown.info', 'cnavi.g-search.or.jp', 'tdb.co.jp', 'bigcompany.jp',
  'houjin.goo.to', 'kaishalist.com',
  // 地図・電話帳
  'mapion.co.jp', 'map.yahoo.co.jp', '24u.jp', 'itp.ne.jp', 'navitime.co.jp',
  'ekiten.jp', 'townpage.goo.ne.jp',
  // 求人サイト
  'hello-work.info', 'hellowork', 'stanby.com', 'indeed.com', 'rikunabi.com',
  'mynavi.jp', 'doda.jp', 'en-japan.com', 'wantedly.com', 'job.tsite.jp',
  'green-japan.com', 'bizreach.jp', 'type.jp', 'jobmedley.com', 'en-gage.net',
  '求人ボックス', 'xn--pckua2a7gp15o89zb.com',
  // まとめ・比較サイト
  'imitsu.jp', 'comparebiz.net', 'meetsmore.com', 'kakaku.com', 'pitta-lab.com',
  'itreview.jp', '発注ナビ', 'ready-crew.jp',
  // ブログ・メディアプラットフォーム
  'note.com', 'qiita.com', 'ameblo.jp', 'jimdofree.com', 'hatena.ne.jp',
  'hatenablog.com', 'livedoor.blog', 'seesaa.net', 'fc2.com',
  // SNS
  'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'x.com',
  'youtube.com',
  // 行政
  '.lg.jp', '.go.jp', '.tochigi.jp', '.mie.jp', 'g-reiki.net',
  // ニュース・メディア
  'nikkei.com', 'nikkan.co.jp', 'prtimes.jp', 'keizai.biz', 'news.yahoo.co.jp',
  'shimotsuke.co.jp', 'shinmai.co.jp', 'jomo-news.co.jp', 'chugoku-np.co.jp',
  // 大企業・大手代理店
  'hakuhodo', 'dentsu', 'adk', 'cyberagent', 'sega.co.jp', 'kubota.com',
  'toshiba.co.jp', 'bandainamco', 'canon-its.co.jp',
  // 商工会議所・観光協会
  'cci.or.jp', 'shokokai.or.jp', 'kanko.jp', 'kankou.jp', '-kanko.com',
  // 社会福祉
  'syakyo.or.jp', 'shakyo.or.jp', 'fsyakyo.or.jp',
  // 不動産
  'fudousan', 'suumo.jp', 'homes.co.jp', 'athome.co.jp', 'live-home',
  // その他ポータル
  'furusato', 'rakuten.co.jp', 'amazon.co.jp', 'wikipedia.org',
  'goguynet.jp', 'netj.jp', 'shizumatch.jp', 'go2senkyo.com',
];

// 除外するURLパターン（記事・ブログ・一覧ページ）
const EXCLUDE_URL_PATTERNS = [
  '/recruit/', '/job/', '/career/', '/employment/', '/採用/',
  '.pdf',
  '/news/', '/press/', '/release/',
  '/blog/', '/column/', '/article/', '/post/', '/posts/',
  '/category/', '/tag/', '/archive/',
  '/search', '/page/',
  '/magazine/', '/media/',
  '/area/', '/region/', '/prefecture/',
  '/ranking/', '/comparison/', '/recommend/',
];

// 除外キーワード（タイトルに含まれていたら除外）
const EXCLUDE_KEYWORDS = [
  // 医療・福祉
  '病院', 'クリニック', '医院', '歯科', '薬局', '介護', '福祉', '看護',
  // 不動産
  '不動産', '賃貸', '物件', 'マンション',
  // 美容
  '美容室', '美容院', 'ヘアサロン', 'エステ', 'ネイル',
  // 士業
  '弁護士', '税理士', '司法書士', '行政書士', '社労士', '労務', '社会保険労務士',
  // 冠婚葬祭
  '葬儀', '葬祭', '結婚式場', 'ブライダル',
  // 運送
  '運送', '運輸', '引越', '物流', '配送',
  // 飲食
  'レストラン', '居酒屋', 'ラーメン', 'カフェ', '食堂',
  // 建設
  '建設', '建築', '工務店', 'リフォーム', '塗装',
  // 自動車
  '自動車', '車検', 'モータース', 'カーディーラー',
  // 教育
  '学習塾', '予備校', '幼稚園', '保育園',
  // 宿泊
  'ホテル', '旅館', '温泉', 'リゾート',
  // 農業・製造
  '農業', '農園', '工場', '製造', '製作所',
  // スポーツ
  'スノーボード', 'スキー', 'ゴルフ場', 'フィットネス',
  // 求人関連
  '求人', '募集', '採用情報',
  // 記事・まとめ系
  'おすすめ', 'ランキング', '比較', '選び方', '一覧', 'まとめ',
  '○選', '選', '件を', '社を',
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
  for (const kw of CORE_MARKETING_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
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

  // ドメイン除外
  for (const excludeDomain of EXCLUDE_DOMAINS) {
    if (domain.includes(excludeDomain) || urlLower.includes(excludeDomain)) {
      return { exclude: true, reason: `除外ドメイン: ${excludeDomain}` };
    }
  }

  // URL除外パターン
  for (const pattern of EXCLUDE_URL_PATTERNS) {
    if (urlLower.includes(pattern.toLowerCase())) {
      return { exclude: true, reason: `除外URL: ${pattern}` };
    }
  }

  // 行政サイト
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
    const [city, title, url] = parseCSVLine(line);
    // タイトルとURLのみでチェック（検索キーワードは無視）
    const combined = (title || '') + ' ' + (url || '');

    // 除外ドメイン/URLチェック
    const excludeResult = shouldExclude(title || '', url || '');
    if (excludeResult.exclude) {
      excludedCompanies.push(line);
      excludeReasons[excludeResult.reason] = (excludeReasons[excludeResult.reason] || 0) + 1;
      continue;
    }

    // トップページ/会社概要ページのみを優先
    if (!isCompanyPage(url || '')) {
      excludedCompanies.push(line);
      excludeReasons['記事・下層ページ'] = (excludeReasons['記事・下層ページ'] || 0) + 1;
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
