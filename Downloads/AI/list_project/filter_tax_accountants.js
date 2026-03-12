const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '全国の税理士リスト.csv');
const duplicateRemovedFile = path.join(__dirname, '全国の税理士リスト_重複削除済み.csv');
const outputFile = path.join(__dirname, '全国の税理士リスト_フィルター済み.csv');

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
  '税理士会',
  '協同組合',
  '懇話会',
  '記事',
  'ニュース',
  '求人',
  '募集',
  'について',
  'とは',
  'ログイン',
  '申請手続き',
  '納税者の方へ',
  '会員',
  'セミナー',
  '件中',
  '件|',
  '件)',
  '口コミ',
  '評判',
  'Q&A',
  'q&a',
  'ガイド',
  '紹介センター',
  '相談所',
  'マッチング',
  'ミツモア',
  'みんなの',
  '厳選',
  '最新版',
  '最新】',
  'ドットコム',
  '組織概要',
  '各種申請',
  '費用面',
  '徹底比較',
  '優良',
  'freee',
  '起業開業',
  'のための'
];

// 除外するドメイン
const excludeDomains = [
  'biz.ne.jp',
  'freeconsul.co.jp',
  'tatiage.com',
  'zeiri4.com',
  'tax0us.co.jp',
  'minnano-zeirishi.jp',
  'meetsmore.com',
  'zeirishi-plus.com',
  'zeirishi.jpn.org',
  'tokyozeirishikai.or.jp',
  'search-advisors.freee.co.jp',
  'tozeikyo.or.jp',
  'instagram.com',
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'gtc-zeirishi.info'
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
