const fs = require('fs');

const inputFile = '全国の社労士リスト_v2_ホームページ付き.csv';
const outputFile = '全国の社労士リスト_簡易版.csv';

console.log('🚀 社労士リストから会社名とURLのみを抽出します\n');

const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n').filter(line => line.trim());

console.log(`📄 入力: ${lines.length - 1}件`);

const results = [];
const seen = new Set();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // CSVパース（簡易版）
  const parts = line.split(',');
  if (parts.length < 4) continue;

  const name = parts[1];
  const homepageUrl = parts[3];

  // 無効な会社名をスキップ
  const invalidNames = ['名称不明', '詳細はこちら', ''];
  if (invalidNames.includes(name.trim())) {
    continue;
  }

  // ホームページURLがある場合のみ
  if (homepageUrl && homepageUrl.trim() !== '') {
    // 重複チェック（URLのみで重複判定）
    if (!seen.has(homepageUrl)) {
      seen.add(homepageUrl);
      results.push({ name, url: homepageUrl });
    }
  }
}

// CSV出力
const csvLines = ['会社名,URL'];
results.forEach(item => {
  // CSVエスケープ
  let escapedName = item.name;
  if (escapedName.includes(',') || escapedName.includes('"') || escapedName.includes('\n')) {
    escapedName = `"${escapedName.replace(/"/g, '""')}"`;
  }
  csvLines.push(`${escapedName},${item.url}`);
});

fs.writeFileSync(outputFile, csvLines.join('\n'), 'utf-8');

console.log(`\n✅ 完了！ ${outputFile} に保存しました`);
console.log(`📊 ホームページありの会社: ${results.length}件`);
console.log(`📊 重複削除済み`);
