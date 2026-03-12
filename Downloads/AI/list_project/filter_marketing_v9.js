const fs = require('fs');

const INPUT_FILE = '全国のデジタルマーケティング会社リスト_進行中.csv';
const OUTPUT_FILE = '全国のデジタルマーケティング会社リスト_filtered.csv';
const EXCLUDED_FILE = '全国のデジタルマーケティング会社リスト_excluded.csv';

// マーケティング会社を示すキーワード（タイトルまたはURLに含まれていれば優先的に残す）
const MARKETING_KEYWORDS = [
  // Web制作・デザイン
  'web制作', 'ウェブ制作', 'ホームページ制作', 'hp制作', 'サイト制作',
  'webデザイン', 'ウェブデザイン', 'デザイン会社', 'デザイン事務所',
  'クリエイティブ', 'creative',
  // マーケティング
  'マーケティング', 'marketing', 'マーケ',
  '広告代理店', '広告会社', 'advertising', 'アドバタイジング',
  'プロモーション', 'promotion',
  'ブランディング', 'branding',
  // SEO・広告運用
  'seo対策', 'seo会社', 'リスティング広告', 'sns運用', 'sns代行',
  'web広告', 'ネット広告', 'インターネット広告',
  // コンサル・企画
  'webコンサル', 'itコンサル', 'デジタルコンサル',
  '企画会社', 'プランニング',
  // 制作会社
  '制作会社', 'プロダクション', 'production',
  '映像制作', '動画制作', '動画編集',
  // IT・システム
  'システム開発', 'アプリ開発', 'ソフトウェア開発',
  'it企業', 'tech', 'テック',
  // EC
  'ecサイト制作', 'ec構築', 'ネットショップ制作',
];

// 除外するドメイン
const EXCLUDE_DOMAINS = [
  // 法人・会社情報ポータル
  'houjin.info', 'alarmbox.jp', 'baseconnect.in', 'kaisharesearch.com',
  'everytown.info', 'cnavi.g-search.or.jp', 'tdb.co.jp', 'bigcompany.jp', 'houjin.goo.to',
  // 地図・電話帳
  'mapion.co.jp', 'map.yahoo.co.jp', '24u.jp', 'itp.ne.jp', 'navitime.co.jp',
  'ekiten.jp', 'navitokyo.com', 'townpage.goo.ne.jp', 'locator.kubota.com',
  // 求人サイト
  'hello-work.info', 'hellowork', 'stanby.com', 'indeed.com', 'rikunabi.com',
  'mynavi.jp', 'doda.jp', 'en-japan.com', 'wantedly.com', 'job.tsite.jp',
  'ownedmaker.com', 'green-japan.com', 'bizreach.jp', 'type.jp', 'jobmedley.com',
  'careerjet.jp', 'job-terminal.com', 'findjob.net', 'jobnavi.org', 'en-gage.net',
  'xn--pckua2a7gp15o89zb.com', 'career-bank.co.jp',
  // まとめ・比較サイト
  'imitsu.jp', 'comparebiz.net', 'meetsmore.com', 'kakaku.com', 'pitta-lab.com',
  'itreview.jp', 'ready-crew.jp',
  // ブログプラットフォーム
  'note.com', 'qiita.com', 'ameblo.jp', 'jimdofree.com', 'hatena.ne.jp',
  'livedoor.blog', 'seesaa.net', 'fc2.com', 'hatenablog.com',
  // SNS
  'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'x.com', 'youtube.com',
  // 行政
  '.lg.jp', '.go.jp', '.city.', '.pref.',
  // ふるさと納税・通販モール
  'furusato', 'wowma.jp', 'rakuten.co.jp', 'amazon.co.jp',
  // ニュース・メディア
  'nikkei.com', 'nikkan.co.jp', 'prtimes.jp', 'keizai.biz', 'news.yahoo.co.jp',
  'chugoku-np.co.jp', 'digitalpr.jp', 'shimotsuke.co.jp', 'shinmai.co.jp', 'jomo-news.co.jp',
  // 商工会議所・商工会
  '-cci.or.jp', 'cci.or.jp', '-cci.com', 'shokokai.or.jp', 'smenet.or.jp',
  // 観光協会
  'kanko.jp', 'kankou.jp', '-kanko.com', 'kanko.com',
  // 社会福祉協議会
  'syakyo.or.jp', 'shakyo.or.jp', 'fsyakyo.or.jp',
  // 大企業
  'sega.co.jp', 'kubota.com', 'toshiba.co.jp', 'toshibatec.co.jp',
  'hakuhodo', 'dentsu', 'adk', 'cyberagent',
  'kddi.com', 'softbank.jp', 'docomo.ne.jp', 'au.com',
  'bandainamco', 'canon-its.co.jp',
  // 大学
  '.ac.jp',
  // 選挙
  'go2senkyo.com',
  // 銀行
  'zengin.ajtw.net',
  // 税理士
  '-zei.jp', 'zei.jp', '-tax.', 'tax.tkcnf',
  // Wikipedia
  'wikipedia.org',
  // 科学・研究機関
  '-sci.or.jp',
  // バス・交通
  'bus.co.jp', 'kibus.co.jp', 'shinkibus.co.jp',
  // 商店街・組合
  'shotengai', 'kumiai',
  // ナビ・ポータル
  '-navi.com', '-navi.jp',
  // 旅行サイト
  'tripadvisor', 'jalan.net', 'booking.com', 'agoda.com', 'expedia',
  // テイクアウト・飲食
  'takeout', 'tabelog.com', 'hotpepper', 'gnavi.co.jp', 'retty.me',
  // ロボット・製造メディア
  'robot-digest.com', 'monoist.jp',
  // 会社検索ポータル
  'komantarebu.com',
  // softopia（ソフトピア）
  'softopia.or.jp',
  // 地域情報
  'fyneat.com',
  // 行政系（追加）
  'e-map.', '.iwate.jp', '.akita.jp', '.yamagata.jp',
  // 判子・印鑑
  'hanko', 'hankohiroba',
  // 地域マルシェ
  'marche', 'ichiba.com',
  // ジョブプラットフォーム
  'jbplt.jp',
  // 観光情報
  'kankou', 'kankouzyouhou', 'iiyudana',
  // 税理士関連
  '.tax',
  // 商店
  'shouten.com',
  // エクステリア・外構
  'exterior', 'gaiko',
  // 印刷（Web以外）
  'insatsu.com', 'insatsu.net', 'insatsu.jp',
  // 人材ネット
  'jinzainet',
  // 北陸人材
  'hokurikujinzai',
  // ブログ追加
  'jimdosite.com', 'jimdo.com', 'wixsite.com', 'webnode.jp',
  // JA（農協）
  'ja-', '.ja.or.jp',
  // リサイクル
  'recycle',
  // 木材・建材
  '-wood.co', 'wood.co.jp', 'mokuzai',
  // 食器・陶器
  'shokki', 'touki',
  // サイトインデックス系
  'siteindices', 'siteindex',
  // 蒸留所
  'distillery',
  // 工業
  'kougyou.jp', 'kogyo.jp',
  // 不動産
  'fudousan.jp', 'fudousan.com', 'fudosan',
  // 林業
  'ringyo', 'shinrin',
  // 観光（追加）
  'kanko-',
  // 製作所
  'seisakusho', 'seisakujo',
];

// 除外するURLパターン
const EXCLUDE_URL_PATTERNS = [
  '/recruit/', '/job/', '/career/', '/employment/', '/採用/',
  '.pdf',
  '/news/', '/press/', '/release/',
  '/blog/', '/column/', '/article/', '/post/', '/posts/',
  '/category/', '/tag/', '/archive/',
  '/search', '/page/',
  '/works/', '/portfolio/', '/case/',
  '/interview/', '/voice/',
  '/event/', '/seminar/',
  '/member/', '/staff/', '/team/',
  '/company/', '/about/', '/corporate/', '/profile/',
  '/access/', '/contact/',
];

// 除外キーワード（タイトルに含まれていたら除外）
const EXCLUDE_KEYWORDS = [
  // 医療・福祉
  '病院', 'クリニック', '医院', '歯科', '薬局', '介護', '福祉', '看護', '医療法人',
  // 不動産
  '不動産', '賃貸', '物件', 'マンション', '戸建',
  // 美容
  '美容室', '美容院', 'ヘアサロン', 'エステ', 'ネイル', '理容',
  // 士業
  '弁護士', '税理士', '司法書士', '行政書士', '社労士', '労務士',
  // 冠婚葬祭
  '葬儀', '葬祭', '結婚式場', 'ブライダル',
  // 運送・物流
  '運送', '運輸', '引越', '物流', '配送', '宅配',
  // 飲食
  'レストラン', '居酒屋', 'ラーメン', 'カフェ', '食堂', '寿司', '焼肉', '飲食店',
  // 建設
  '建設', '建築', '工務店', 'リフォーム', '塗装', '内装工事', '土木',
  // 自動車
  '自動車', '車検', 'モータース', 'カーディーラー', 'コーティング',
  // 教育
  '学習塾', '予備校', '幼稚園', '保育園', '小学校', '中学校', '高校',
  // 宿泊・レジャー
  'ホテル', '旅館', '温泉', 'リゾート', '民宿', 'テーマパーク', '遊園地',
  // 農業
  '農業', '農園', '農協', '農産',
  // スポーツ
  'スノーボード', 'スキー場', 'ゴルフ場', 'フィットネス', 'ジム', 'スポーツクラブ',
  // 製造業
  '工場', '製造', '製作所', '金属加工', '機械',
  // 小売
  'スーパー', 'ドラッグストア', 'コンビニ', '百貨店',
  // 求人
  '求人', '募集要項', '採用情報', '転職',
  // ゲーム会社
  'セガ', 'SEGA', 'バンダイ', 'コナミ', 'カプコン',
  // 銀行・金融
  '銀行', '信用金庫', '信用組合', '証券',
  // 保険
  '保険会社', '生命保険', '損害保険',
  // 市役所・行政
  '市役所', '町役場', '村役場', '県庁', '市公式',
  // 商工会議所
  '商工会議所', '商工会',
  // バス・交通
  'バス会社', '交通', '鉄道', '電鉄',
  // 電力・ガス
  '電力', 'ガス会社', '水道',
  // 清掃・廃棄物
  '清掃', '廃棄物', 'クリーニング',
  // 警備
  '警備', 'セキュリティ会社',
  // 派遣
  '派遣会社', '人材派遣',
  // おすすめ・まとめ記事
  'おすすめ', 'ランキング', '比較', '選び方', '○選', '件を厳選', '社を厳選',
  // 塗装
  '塗装', 'tosou', 'tosou.', 'tosou.net',
  // 防災
  '防災', 'bousai',
  // 興業・産業
  '興業', '産業株式会社',
  // 判子・印鑑
  '判子', '印鑑', 'はんこ',
  // マルシェ・市場
  'マルシェ',
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

function getUrlDepth(url) {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname.replace(/\/$/, '');
    // .htmlや.phpなどの拡張子を除去
    path = path.replace(/\.(html|htm|php|asp|aspx)$/i, '');
    if (!path || path === '') return 0;
    return path.split('/').filter(p => p).length;
  } catch {
    return 0;
  }
}

// トップページかどうかをチェック
function isTopPage(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.replace(/\/$/, '').toLowerCase();
    // トップページ
    if (!path || path === '' || path === '/index' || path === '/index.html') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function hasMarketingKeyword(text) {
  const lower = (text || '').toLowerCase();
  for (const kw of MARKETING_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      return { found: true, keyword: kw };
    }
  }
  return { found: false };
}

function shouldExclude(title, url) {
  const domain = getDomain(url);
  const urlLower = url.toLowerCase();
  const titleLower = (title || '').toLowerCase();

  // ドメイン除外チェック
  for (const excludeDomain of EXCLUDE_DOMAINS) {
    if (domain.includes(excludeDomain) || urlLower.includes(excludeDomain)) {
      return { exclude: true, reason: `除外ドメイン: ${excludeDomain}` };
    }
  }

  // 行政サイト（より厳格）
  if (domain.endsWith('.lg.jp') || domain.endsWith('.go.jp') ||
      domain.includes('.city.') || domain.includes('.pref.') ||
      domain.startsWith('city.') || domain.startsWith('www.city.') ||
      /city\.[a-z]+\.jp/.test(domain)) {
    return { exclude: true, reason: '行政サイト' };
  }

  // URL除外パターン
  for (const pattern of EXCLUDE_URL_PATTERNS) {
    if (urlLower.includes(pattern.toLowerCase())) {
      return { exclude: true, reason: `除外URL: ${pattern}` };
    }
  }

  // 除外キーワード
  for (const kw of EXCLUDE_KEYWORDS) {
    if (titleLower.includes(kw.toLowerCase())) {
      return { exclude: true, reason: `除外KW: ${kw}` };
    }
  }

  // トップページのみ許可（より厳格）
  if (!isTopPage(url)) {
    const depth = getUrlDepth(url);
    if (depth > 0) {
      return { exclude: true, reason: `下層ページ: ${depth}階層` };
    }
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
    const combined = (title || '') + ' ' + (url || '');

    // 除外チェック
    const excludeResult = shouldExclude(title || '', url || '');
    if (excludeResult.exclude) {
      excludedCompanies.push(line);
      excludeReasons[excludeResult.reason] = (excludeReasons[excludeResult.reason] || 0) + 1;
      continue;
    }

    // マーケティングキーワードチェック（オプション：より厳格にする場合）
    const marketingResult = hasMarketingKeyword(combined);
    if (marketingResult.found) {
      matchedKeywords[marketingResult.keyword] = (matchedKeywords[marketingResult.keyword] || 0) + 1;
    }

    keepCompanies.push(line);
  }

  console.log(`✅ 残す: ${keepCompanies.length}件`);
  console.log(`❌ 除外: ${excludedCompanies.length}件\n`);

  console.log('マッチしたマーケキーワード（上位20件）:');
  const sortedKeywords = Object.entries(matchedKeywords).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [kw, count] of sortedKeywords) {
    console.log(`  ${kw}: ${count}件`);
  }

  console.log('\n除外理由の内訳（上位20件）:');
  const sortedReasons = Object.entries(excludeReasons).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [reason, count] of sortedReasons) {
    console.log(`  ${reason}: ${count}件`);
  }

  fs.writeFileSync(OUTPUT_FILE, [header, ...keepCompanies].join('\n'), 'utf-8');
  console.log(`\n💾 保存完了: ${OUTPUT_FILE}`);

  fs.writeFileSync(EXCLUDED_FILE, [header, ...excludedCompanies].join('\n'), 'utf-8');
  console.log(`💾 除外リスト: ${EXCLUDED_FILE}`);
}

main();
