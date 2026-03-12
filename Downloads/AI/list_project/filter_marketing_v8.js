const fs = require('fs');

const INPUT_FILE = '全国のデジタルマーケティング会社リスト_進行中.csv';
const OUTPUT_FILE = '全国のデジタルマーケティング会社リスト_filtered.csv';
const EXCLUDED_FILE = '全国のデジタルマーケティング会社リスト_excluded.csv';

// 除外するドメイン（ポータル・求人・行政など）
const EXCLUDE_DOMAINS = [
  // 法人・会社情報ポータル
  'houjin.info', 'alarmbox.jp', 'baseconnect.in', 'kaisharesearch.com',
  'everytown.info', 'cnavi.g-search.or.jp', 'tdb.co.jp', 'bigcompany.jp', 'houjin.goo.to',
  // 地図・電話帳・ロケーター
  'mapion.co.jp', 'map.yahoo.co.jp', '24u.jp', 'itp.ne.jp', 'navitime.co.jp',
  'ekiten.jp', 'navitokyo.com', 'townpage.goo.ne.jp', 'locator.kubota.com',
  // 求人サイト
  'hello-work.info', 'hellowork', 'stanby.com', 'indeed.com', 'rikunabi.com',
  'mynavi.jp', 'doda.jp', 'en-japan.com', 'wantedly.com', 'job.tsite.jp',
  'ownedmaker.com', 'green-japan.com', 'bizreach.jp', 'type.jp', 'jobmedley.com',
  'careerjet.jp', 'job-terminal.com', 'findjob.net', 'jobnavi.org', 'kyotango-jobnavi',
  'hatarakitai.jp', 'sendaidehatarakitai.jp',
  // まとめ・比較サイト
  'imitsu.jp', 'comparebiz.net', 'meetsmore.com', 'kakaku.com', 'pitta-lab.com',
  '発注ナビ', 'ready-crew.jp', 'itreview.jp',
  // ブログプラットフォーム
  'note.com', 'qiita.com', 'ameblo.jp', 'jimdofree.com', 'hatena.ne.jp',
  'livedoor.blog', 'seesaa.net', 'fc2.com/blog', 'hatenablog.com',
  // SNS
  'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'x.com',
  // 行政
  '.lg.jp', '.go.jp',
  // ふるさと納税・通販モール
  'furusato', 'wowma.jp', 'rakuten.co.jp', 'amazon.co.jp',
  // ニュース・メディア
  'nikkei.com', 'nikkan.co.jp', 'prtimes.jp', 'keizai.biz', 'news.yahoo.co.jp',
  'chugoku-np.co.jp', 'digitalpr.jp', 'entamerush.jp',
  // 不動産
  'fudousan', 'suumo.jp', 'homes.co.jp', 'athome.co.jp', 'realestate', 'best-estate.jp',
  'live-home', 'locohome', 'sumitai.ne.jp',
  // 教育
  'shingakunet.com',
  // 商工会議所
  '-cci.or.jp', 'cci.or.jp',
  // 大企業（営業先ではない）
  'sega.co.jp', 'kubota.com', 'lagunatenbosch.co.jp',
  'toshibatec.co.jp', 'dai-ichi-life', 'toshiba.co.jp',
  // 大手広告代理店
  'hakuhodo', 'dentsu', 'adk', 'cyberagent',
  // その他ポータル
  'shobo.info', 'webcatplus.jp', 'tenant-shop.com', 'goguynet.jp',
  'y-labo.net', 'artificial.work', 'netj.jp',
  // 中小企業支援・商工会
  'smenet.or.jp', 'shokokai.or.jp',
  // 観光協会・観光サイト
  'kanko.jp', 'kankou.jp', '-kanko.com', 'kanko.com',
  // 通販モール
  'inkjetmall.co.jp',
  // マッチングサイト
  'shizumatch.jp',
  // 行政関連漏れ
  'g-reiki.net', '.tochigi.jp', '.mie.jp',
  // 選挙・政治
  'go2senkyo.com',
  // 銀行
  'zengin.ajtw.net',
  // 新聞社
  'shimotsuke.co.jp', 'shinmai.co.jp', 'jomo-news.co.jp',
  // イベント
  'adtech-tokyo.com',
  // 社会福祉協議会
  'syakyo.or.jp', 'shakyo.or.jp', 'fsyakyo.or.jp',
  // まとめ記事サイト
  'web-kanji.com', 'stock-sun.com', 'digimake.co.jp', 'douga-kanji.com',
  'sakufuri.jp', 'branding-works.jp', 'find-unique.co.jp', 'dejimachain.co.jp',
  'crexia.co.jp', 'koukoku-gyokai.info', 'dgtrends.com', 'rid-ad.com',
  'geo-code.co.jp', 'writing-corp.co.jp', 'zentsu-inc.co.jp', 'trevo-web.com',
  'dank-1.com', 'kame-rad.co.jp', 'mediaexceed.co.jp', 'mitu-mori.com',
  'kaba-design.jp', 'cactas.co.jp', 'banshuworld.com', 'nft-times.jp',
  'techtrends.jp', 'popinsight.jp', 'medical-link.co.jp', 'wk-partners.co.jp',
  'leadcreation.co.jp', 'maxa.jp',
  // 口コミ・評判サイト
  'kutikomi', 'hyouban', 'kuchikomi', 'review', 'reputation',
  // 税理士
  '-zei.jp', 'zei.jp',
  // 大企業
  'kddi.com', 'softbank.jp', 'docomo.ne.jp', 'au.com',
  // 造園・土木
  'zouen', 'doboku', 'green.co.jp',
  // クリーニング
  'clean.com', 'cleaning',
  // 段ボール・印刷（Web以外）
  'carton', 'danball',
  // 運送
  '-unso', 'unso.co', 'unsou',
  // 大学
  '.ac.jp',
  // 建設
  '-kensetsu', 'kensetsu.com',
  // 税理士（追加）
  '-tax.', 'tax.tkcnf',
  // 特産品・物産
  'tokusanhin', 'bussan',
];

// 除外するURLパターン
const EXCLUDE_URL_PATTERNS = [
  '/recruit/', '/job/', '/career/', '/employment/', '/採用/',
  '.pdf',
  '/facility/',
  '/news/', '/press/', '/release/',
  '/blog/', '/column/', '/article/', '/post/', '/posts/',
  '/category/', '/tag/', '/archive/',
  '/search?', '/search/',
  'wikipedia.org',
  '/area/', '/region/', '/prefecture/',
  '/ranking/', '/comparison/', '/recommend/', '/list/',
  '/magazine/',
  '/page/',
  '/works/', '/portfolio/', '/case/',
  '/media/', '/service/', '/services/',
  '/interview/', '/voice/',
  '/event/', '/seminar/',
  '/download/',
  '/info/', '/information/',
  '/detail/', '/item/',
  '/guide/', '/faq/',
  '/member/', '/staff/',
  '/access/', '/contact/',
  '/product/', '/products/',
  '/solution/', '/solutions/',
  '/topics/', '/topic/',
  '/report/', '/reports/',
  '/movie/', '/video/',
  '/catalog/', '/brochure/',
  '/support/',
];

// 明らかに違う業種キーワード（タイトルに含まれていたら除外）
const EXCLUDE_KEYWORDS = [
  // 医療・福祉
  '病院', 'クリニック', '医院', '歯科', '薬局', '介護', '福祉', '看護', '医療法人', 'tsukui',
  // 不動産
  '不動産', '賃貸', '物件', 'マンション', '戸建', '土地売買',
  // 美容
  '美容室', '美容院', 'ヘアサロン', 'エステ', 'ネイルサロン', '理容',
  // 士業（営業先ではない）
  '弁護士事務所', '税理士事務所', '司法書士事務所', '行政書士事務所',
  // 冠婚葬祭
  '葬儀', '葬祭', '結婚式場', 'ブライダル',
  // 運送・物流
  '運送', '運輸', '引越', '物流', '配送',
  // 飲食
  'レストラン', '居酒屋', 'ラーメン', 'カフェ', '食堂', '寿司', '焼肉',
  // 建設（Web制作ではない）
  '建設株式会社', '建築株式会社', '工務店', 'リフォーム', '塗装', '内装工事',
  // 自動車
  '自動車販売', '車検', 'モータース', 'カーディーラー',
  // 教育（塾など）
  '学習塾', '予備校', '幼稚園', '保育園', '小学校', '中学校', '高校',
  // 宿泊・レジャー施設
  'ホテル', '旅館', '温泉', 'リゾート', '民宿', 'テーマパーク', '遊園地', 'テンボス',
  // 農業
  '農業', '農園', '農協',
  // スポーツ・レジャー
  'スノーボード', 'スキー場', 'ゴルフ場', 'フィットネス', 'ジム',
  // 製造業
  '工場', '製造株式会社', '製作所', '金属加工',
  // 小売
  'スーパー', 'ドラッグストア', 'コンビニ',
  // 求人ページ
  '求人', '募集要項', '採用情報',
  // ゲーム会社（大企業）
  'セガ', 'SEGA', 'バンダイ', 'コナミ', 'カプコン',
  // 自動車コーティング等
  'コーティング',
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
    const path = urlObj.pathname.replace(/\/$/, ''); // 末尾スラッシュ除去
    if (!path || path === '') return 0;
    return path.split('/').filter(p => p).length;
  } catch {
    return 0;
  }
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

  // 除外キーワード
  for (const kw of EXCLUDE_KEYWORDS) {
    if (titleLower.includes(kw.toLowerCase())) {
      return { exclude: true, reason: `除外KW: ${kw}` };
    }
  }

  // URLの深さチェック（2階層以上は除外）
  const depth = getUrlDepth(url);
  if (depth > 1) {
    return { exclude: true, reason: `深いURL: ${depth}階層` };
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

  for (const line of dataLines) {
    const [city, title, url] = parseCSVLine(line);

    const excludeResult = shouldExclude(title || '', url || '');
    if (excludeResult.exclude) {
      excludedCompanies.push(line);
      excludeReasons[excludeResult.reason] = (excludeReasons[excludeResult.reason] || 0) + 1;
      continue;
    }

    keepCompanies.push(line);
  }

  console.log(`✅ 残す: ${keepCompanies.length}件`);
  console.log(`❌ 除外: ${excludedCompanies.length}件\n`);

  console.log('除外理由の内訳（上位20件）:');
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
