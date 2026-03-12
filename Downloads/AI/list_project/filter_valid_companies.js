const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '全国の社会保険労務士リスト_重複削除済み.csv');
const outputFile = path.join(__dirname, '全国の社会保険労務士リスト_フィルター済み.csv');

// CSVファイルを読み込む
const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

console.log(`総行数: ${lines.length}`);

// ヘッダーを取得
const header = lines[0];
const validLines = [header];

// 除外するキーワード（名前に含まれる場合）
const excludeNameKeywords = [
  'おすすめ',
  '比較',
  'まとめ',
  '選を',
  '選!',
  '選|',
  '一覧',
  '検索',
  'ステーション',
  'ナビ',
  '社会保険労務士会',
  '支部',
  '協同組合',
  '統括',
  '記事',
  'ニュース',
  '求人',
  '募集',
  'について',
  'とは',
  '活動紹介',
  '登録・入会',
  '自主研究',
  '相談所',
  '110番',
  'エリア',
  'トピックス',
  'グループ',
  'pdf',
  'PDF',
  '税制改正',
  '労働基準法',
  '記事',
  'note',
  'ハローワーク',
  'ホラーナイト',
  '求人情報',
  '転職',
  '障害',
  'お話',
  '優しい企業',
  'Lgbt',
  '動物のはなし',
  '経験者募集',
  'テックキャンプ',
  '働き方',
  '周知されて',
  '内製化',
  '多様化',
  '予想される',
  'おススメ',
  '企業格付け',
  '賠償責任保険',
  '無料相談',
  '士業',
  '会長からの',
  '税理士',
  '行政書士',
  '件|',
  '件)',
  'ついでに',
  '口コミ',
  '評判',
  'Q&A',
  'q&a',
  '名簿',
  'マイカーが',
  '事情聴取',
  '正直な感想',
  'セミナー',
  '推進」',
  'アクションプラン',
  '使用者側弁護士',
  '買い物',
  'ご支援で',
  '開業会員',
  '変形労働',
  '実現に向けた',
  '考えてほしい',
  'プロに',
  '故障した',
  '労働移動',
  '業務で使用',
  '求められる',
  'とすべきか',
  '無料で相談',
  '連携 |'
];

// 除外するドメイン
const excludeDomains = [
  'freeconsul.co.jp',
  'biz.ne.jp',
  'lab0rs.co.jp',
  'sr-station.com',
  'syaroushikensaku.com',
  'koukensr.or.jp',
  'imitsu.jp',
  'shakaihokenroumushi.jp',
  'note.com',
  'prtimes.jp',
  'careerindex.jp',
  'toranet.jp',
  'hellowork-plus.com',
  '1150job.com',
  'ameblo.jp',
  'yahoo.co.jp',
  'news.yahoo.co.jp',
  'itp.ne.jp',
  'jiji.com',
  'en-gage.net',
  'woman-type.jp',
  'job-tama.jp',
  'chukidan.jp',
  'workwithpride.jp',
  'pitta-lab.com',
  'happytry.net',
  'jinjibu.jp',
  'prdesse.com',
  'nishinippon.co.jp',
  'espayroll.jp',
  'labor-management.net',
  'process-core.com',
  'aichi-sr.or.jp'
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

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();

  // 空行をスキップ
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

// 結果を保存
const result = validLines.join('\n');
fs.writeFileSync(outputFile, result, 'utf8');

console.log(`フィルター前: ${lines.length - 1}行（ヘッダー除く）`);
console.log(`フィルター後: ${validLines.length - 1}行（ヘッダー除く）`);
console.log(`除外された行: ${excludedCount}行`);
console.log(`出力ファイル: ${outputFile}`);
