const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '全国の社会保険労務士リスト.csv');
const outputFile = path.join(__dirname, '全国の社会保険労務士リスト_重複削除済み.csv');

// CSVファイルを読み込む
const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

console.log(`総行数: ${lines.length}`);

// ヘッダーを取得
const header = lines[0];
const uniqueLines = new Set();
uniqueLines.add(header);

// 重複をチェック（ヘッダーを除く）
let duplicateCount = 0;
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();

  // 空行をスキップ
  if (line === '') continue;

  if (uniqueLines.has(line)) {
    duplicateCount++;
  } else {
    uniqueLines.add(line);
  }
}

// 結果を配列に変換して保存
const result = Array.from(uniqueLines).join('\n');
fs.writeFileSync(outputFile, result, 'utf8');

console.log(`重複削除前: ${lines.length}行`);
console.log(`重複削除後: ${uniqueLines.size}行`);
console.log(`削除された重複: ${duplicateCount}行`);
console.log(`出力ファイル: ${outputFile}`);
