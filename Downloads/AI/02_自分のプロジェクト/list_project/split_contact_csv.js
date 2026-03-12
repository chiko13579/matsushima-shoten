const fs = require('fs');

const inputFile = '全国の税理士リスト_コンタクト付き.csv';
const withContactFile = '全国の税理士リスト_お問合せあり.csv';
const withoutContactFile = '全国の税理士リスト_お問合せなし.csv';

console.log('🚀 お問合せURLの有無でファイルを分割します\n');

const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n').filter(line => line.trim());

console.log(`📄 入力: ${lines.length - 1}件`);

const header = lines[0];
const withContact = [header];
const withoutContact = [header];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];

  // CSVの4番目のカラム（お問合せURL）をチェック
  const parts = line.split(',');

  // お問合せURLが4番目のカラム
  // 住所にカンマが含まれる場合を考慮して、最後のカラムをチェック
  const hasContactUrl = parts.length >= 4 && parts[3] && parts[3].trim() !== '';

  if (hasContactUrl) {
    withContact.push(line);
  } else {
    withoutContact.push(line);
  }
}

// ファイルに保存
fs.writeFileSync(withContactFile, withContact.join('\n'), 'utf-8');
fs.writeFileSync(withoutContactFile, withoutContact.join('\n'), 'utf-8');

console.log(`\n✅ 完了！`);
console.log(`📊 お問合せあり: ${withContact.length - 1}件 → ${withContactFile}`);
console.log(`📊 お問合せなし: ${withoutContact.length - 1}件 → ${withoutContactFile}`);
