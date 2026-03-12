const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '全国の中小企業診断士リスト.csv');
const duplicateRemovedFile = path.join(__dirname, '全国の中小企業診断士リスト_重複削除済み.csv');
const outputFile = path.join(__dirname, '全国の中小企業診断士リスト_フィルター済み.csv');

// CSVファイルを読み込む
const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

console.log(`総行数: ${lines.length}`);

// ステップ1: 重複削除
const header = lines[0];
const uniqueLines = new Set();
uniqueLines.add(header);

let duplicateCount = 0;
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line === '') continue;

  if (uniqueLines.has(line)) {
    duplicateCount++;
  } else {
    uniqueLines.add(line);
  }
}

console.log(`\n=== 重複削除 ===`);
console.log(`重複削除前: ${lines.length}行`);
console.log(`重複削除後: ${uniqueLines.size}行`);
console.log(`削除された重複: ${duplicateCount}行`);

// 重複削除済みファイルを保存
fs.writeFileSync(duplicateRemovedFile, Array.from(uniqueLines).join('\n'), 'utf8');

// ステップ2: フィルタリング
const validLines = [header];

// 除外するキーワード（名前に含まれる場合）
const excludeNameKeywords = [
  'おすすめ',
  '比較',
  'まとめ',
  '選!',
  '選|',
  '選び方',
  '一覧',
  '検索',
  'ランキング',
  'ナビ',
  '診断士協会',
  '診断士会',
  '支部',
  '養成課程',
  '試験について',
  '試験会場',
  '記事',
  'ニュース',
  '求人',
  '募集',
  'について',
  'とは',
  'FAQ',
  'faq',
  'Q&A',
  'q&a',
  '会長挨拶',
  '協会のご案内',
  '事業案内',
  'マスターコース',
  '研修',
  '更新',
  '入会',
  '運営者情報',
  'スケジュール',
  '研究会',
  '相談会',
  'サーチ',
  '仕事・求人',
  '求人ボックス',
  'LEC',
  'リーガルマインド',
  '独立行政法人',
  '中小企業庁',
  'ビジネスサポート',
  '経営相談事業',
  '三多摩',
  '城南',
  '城東',
  '城西',
  'サポート',
  'マッチング',
  '紹介',
  '資格',
  'セミナー',
  'コース',
  '講座',
  '養成',
  'スクール',
  '予備校',
  '通信教育',
  '教材',
  '受験',
  'への道',
  '勉強法',
  'のなり方',
  '合格',
  '対策',
  '申込',
  '募集要項',
  '士業交流会',
  '登録専門家',
  'プロコン勉強会',
  '実務従事',
  '実務補習',
  '専門家派遣',
  'よろず支援',
  '知識・スキル',
  '体験記',
  '青年部',
  'のご案内',
  '窓口相談',
  '公式ウェブサイト',
  '商工会議所',
  '一般社団法人',
  '登録された',
  '会員Link',
  '制度変更',
  'プロコン塾',
  'ページ!',
  'TAC',
  'デジタル相談窓口',
  '引継ぎ支援センター',
  '講演会',
  'PDF',
  'pdf',
  '補助金コンサルタント',
  '経営サポーター',
  '企業診断くまもと',
  '解答速報',
  'マネーフォワード',
  'マネー ...',
  '鹿児島県/',
  '熊本県/',
  '福岡県/',
  'かごしま中小企業',
  '調査・コンサルタント業',
  'に関する規則',
  '記念講演会',
  'のお知らせ',
  'お考えの方へ',
  '信用保証協会',
  'スタッフ -',
  'members_detail',
  'CompanyDetail',
  'phonebook',
  'elaws.jp',
  '県中小企業',
  'b-mall.ne.jp',
  '実績と評判',
  'データベース',
  '起業支援施設',
  'ゴミ',
  'の収集なら'
];

// 除外するドメイン
const excludeDomains = [
  't-smeca.com',
  'smrj.go.jp',
  'rmc-chuo.jp',
  'chusho.meti.go.jp',
  't-smeca.net',
  'lec-jp.com',
  'startup-support.metro.tokyo.lg.jp',
  'jf-cmca.jp',
  'smeca-search.com',
  'pcc-tokyo.org',
  'rmcjohnan.org',
  'joto-smeca.com',
  'jyosai-smeca.com',
  'santama-smeca.jp',
  'xn--pckua2a7gp15o89zb.com',
  'tac-school.co.jp',
  'foresight.jp',
  'studying.jp',
  'u-can.co.jp',
  'jmam.co.jp',
  'shindanshi.or.jp',
  'j-smeca.jp',
  'note.com',
  'jimdofree.com',
  'tokyo-kosha.or.jp',
  'tokyoyorozu.go.jp',
  'doomo.jp',
  'osaka-shindanshi.org',
  'member.osaka-cmca.jp',
  'osaka-cmca.jp',
  'shindanshi-youth.com',
  'xn--fiqzt41v39c0pqtofo30e.xn--3kqu8h87qyugk40a.jp',
  'asn-web.net',
  'nipc.or.jp',
  'city.nagoya.jp',
  'nagoya-cci.or.jp',
  'tms-c.jp',
  't-procon.com',
  'kain-t-smeca.jimdofree.com',
  'kuma-digi.jp',
  'kumamoto-hikitsugi.go.jp',
  'ninteishien.go.jp',
  'b-mall.ne.jp',
  'shindan-kumamoto.jp',
  'k-supporterz.jp',
  'kec.ne.jp',
  'biz.moneyforward.com',
  'pref.kagoshima.jp',
  'mapion.co.jp',
  'sr-kagoshima.jp',
  'elaws.jp',
  'kagoshimashi-shokokai.com',
  'kagoshima-cgc.or.jp',
  'shindan-kagoshima.com',
  'monodukuri-fukuoka.jp',
  'ktc.ksrp.or.jp',
  'pipit-onga.jp',
  'ichikawa-sangyo.co.jp'
];

// CSVの行を正しく解析する関数（ダブルクォート対応）
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

let excludedCount = 0;
const uniqueLinesArray = Array.from(uniqueLines);

for (let i = 1; i < uniqueLinesArray.length; i++) {
  const line = uniqueLinesArray[i].trim();
  if (line === '') continue;

  const parts = parseCSVLine(line);
  if (parts.length < 3) continue;

  const name = parts[1];
  const url = parts[2];

  // 名前に除外キーワードが含まれているかチェック
  let shouldExclude = false;
  for (const keyword of excludeNameKeywords) {
    if (name.includes(keyword)) {
      shouldExclude = true;
      break;
    }
  }

  // URLに除外ドメインが含まれているかチェック
  if (!shouldExclude) {
    for (const domain of excludeDomains) {
      if (url.includes(domain)) {
        shouldExclude = true;
        break;
      }
    }
  }

  if (!shouldExclude) {
    validLines.push(line);
  } else {
    excludedCount++;
  }
}

console.log(`\n=== フィルタリング ===`);
console.log(`フィルター前: ${uniqueLines.size - 1}行（ヘッダー除く）`);
console.log(`フィルター後: ${validLines.length - 1}行（ヘッダー除く）`);
console.log(`除外された行: ${excludedCount}行`);

// 結果を保存
const result = validLines.join('\n');
fs.writeFileSync(outputFile, result, 'utf8');

console.log(`\n出力ファイル: ${outputFile}`);
