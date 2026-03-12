const fs = require('fs');

const content = fs.readFileSync('全国の社労士リスト_簡易版.csv', 'utf-8');
const lines = content.trim().split('\n');

// ヘッダーをスキップして30件取得
const dataLines = lines.slice(1, 31);

const output = ['会社名,サービスURL,住所,電話番号,お問い合わせURL'];

dataLines.forEach(line => {
  const parts = line.split(',');
  const company = parts[0] || '';
  let url = parts[1] || '';
  
  if (url) {
    // HTTPSに変換
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }
    if (!url.endsWith('/')) url += '/';
    const contactUrl = url + 'contact/';
    output.push(`${company},${url},,,${contactUrl}`);
  }
});

fs.writeFileSync('test_sr30.csv', output.join('\n'), 'utf-8');
console.log('✅ ' + (output.length - 1) + '件のテストファイルを作成しました');
