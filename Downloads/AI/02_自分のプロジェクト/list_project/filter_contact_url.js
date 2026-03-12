const fs = require('fs');
const path = '/Users/saeki/Downloads/img/list_project/全国の広告代理店リスト_営業OK.csv';
const content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

let removed = 0;
const filteredLines = dataLines.filter(line => {
  if (!line.trim()) return false;

  // CSVをパースして3列目（お問合せURL）をチェック
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  // 3列目（インデックス2）がお問合せURL
  const contactUrl = parts[2] ? parts[2].replace(/^"|"$/g, '').trim() : '';

  if (!contactUrl) {
    removed++;
    return false;
  }
  return true;
});

const result = [header, ...filteredLines].join('\n');
fs.writeFileSync(path, result);
console.log('削除した件数:', removed);
console.log('残り件数:', filteredLines.length);
