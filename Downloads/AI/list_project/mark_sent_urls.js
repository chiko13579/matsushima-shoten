const fs = require('fs');

const CONFIG = {
  inputFile: '全国の税理士リスト_お問合せあり.csv',
  logFile: '送信結果ログ.csv',
  outputFile: '全国の税理士リスト_お問合せあり_送信済み.csv'
};

// 送信結果ログから送信済みURLを取得
const sentUrls = new Set();
if (fs.existsSync(CONFIG.logFile)) {
  const logContent = fs.readFileSync(CONFIG.logFile, 'utf-8');
  const logLines = logContent.split('\n').filter(line => line.trim());

  // ヘッダー行をスキップして、URLを抽出
  for (let i = 1; i < logLines.length; i++) {
    const parts = logLines[i].split(',');
    if (parts.length >= 2) {
      sentUrls.add(parts[1]); // URL列
    }
  }
  console.log(`📋 送信済みURL: ${sentUrls.size}件`);
}

// 元のCSVを読み込み
const content = fs.readFileSync(CONFIG.inputFile, 'utf-8');
const lines = content.split('\n');

const newLines = [];

// ヘッダー行に「送信済み」列を追加
if (lines.length > 0) {
  newLines.push(lines[0] + ',送信済み');
}

// データ行を処理
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = line.split(',');
  if (parts.length >= 4) {
    const contactUrl = parts[3];

    // 送信済みの場合は✓をつける
    if (sentUrls.has(contactUrl)) {
      newLines.push(line + ',✓');
    } else {
      newLines.push(line + ',');
    }
  }
}

// 新しいCSVを保存
fs.writeFileSync(CONFIG.outputFile, newLines.join('\n'), 'utf-8');

console.log(`✅ 送信済みマーク付きCSVを作成しました: ${CONFIG.outputFile}`);
console.log(`📊 送信済み: ${sentUrls.size}件にチェックをつけました`);
