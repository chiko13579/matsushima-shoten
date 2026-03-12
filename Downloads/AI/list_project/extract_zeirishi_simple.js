const fs = require('fs');

const inputFile = '全国の税理士リスト_imitsu.csv';
const outputFile = '全国の税理士リスト_簡易版.csv';

console.log('🚀 税理士リストから会社名、URL、住所のみを抽出します\n');

const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n').filter(line => line.trim());

console.log(`📄 入力: ${lines.length - 1}件`);

const results = [];
const seen = new Set();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // CSVパース（カンマで分割）
  const parts = line.split(',');
  if (parts.length < 4) continue;

  const companyName = parts[0];
  const serviceUrl = parts[2]; // サービスURL（会社のURL）
  const address = parts[3];

  // 会社名とURLが有効な場合のみ
  if (companyName && companyName.trim() !== '' &&
      serviceUrl && serviceUrl.trim() !== '') {

    // 重複チェック（URLのみで重複判定）
    if (!seen.has(serviceUrl)) {
      seen.add(serviceUrl);
      results.push({
        name: companyName,
        url: serviceUrl,
        address: address || ''
      });
    }
  }
}

// CSV出力
const csvLines = ['会社名,URL,住所'];
results.forEach(item => {
  // CSVエスケープ
  const escapeName = (str) => {
    if (!str) return '';
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  csvLines.push(`${escapeName(item.name)},${item.url},${escapeName(item.address)}`);
});

fs.writeFileSync(outputFile, csvLines.join('\n'), 'utf-8');

console.log(`\n✅ 完了！ ${outputFile} に保存しました`);
console.log(`📊 有効な税理士会社: ${results.length}件`);
console.log(`📊 重複削除済み`);
