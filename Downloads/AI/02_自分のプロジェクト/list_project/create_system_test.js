const fs = require('fs');

// 元ファイルを読み込み
const content = fs.readFileSync('全国のシステム開発会社リスト_フィルタ済み.csv', 'utf-8');
const lines = content.trim().split('\n');

// ヘッダーをスキップして30件取得
const dataLines = lines.slice(1, 31);

// 新しい形式に変換
const output = ['会社名,サービスURL,住所,電話番号,お問い合わせURL'];

dataLines.forEach(line => {
  const parts = line.split(',');
  const city = parts[0] || '';
  const company = parts[1] || '';
  let url = parts[2] || '';

  // URLの末尾の/を確認し、/contact/を追加
  if (url && !url.includes('/contact')) {
    if (!url.endsWith('/')) url += '/';
    const contactUrl = url + 'contact/';
    output.push(`${company},${url},,,${contactUrl}`);
  }
});

fs.writeFileSync('test_system30.csv', output.join('\n'), 'utf-8');
console.log('✅ ' + (output.length - 1) + '件のテストファイルを作成しました');
