const fs = require('fs');

const logFile = '/Users/saeki/Downloads/img/list_project/全国の広告代理店リスト_営業OK_入力ログ_最終テスト.txt';
const csvFile = '/Users/saeki/Downloads/img/list_project/全国の広告代理店リスト_営業OK.csv';
const outputFile = '/Users/saeki/Downloads/img/list_project/送信結果ログ_復元.csv';

const logContent = fs.readFileSync(logFile, 'utf-8');
const csvContent = fs.readFileSync(csvFile, 'utf-8');

// CSVから会社名とお問合せURLの対応を取得（3列目がお問合せURL）
const csvLines = csvContent.split('\n').slice(1);
const companyData = {};
csvLines.forEach(line => {
  // CSVの形式: 会社名,ホームページURL,お問合せURL,営業OK
  const parts = line.split(',');
  if (parts.length >= 3) {
    const name = parts[0].replace(/"/g, '').trim();
    const contactUrl = parts[2].replace(/"/g, '').trim();
    companyData[name] = contactUrl;
  }
});

// ログから処理済み会社を抽出
const results = [];
const companyPattern = /^\[(\d+)\/\d+\]\s+(.+)$/gm;
let match;
const companies = [];

while ((match = companyPattern.exec(logContent)) !== null) {
  companies.push({
    index: parseInt(match[1]),
    name: match[2].trim()
  });
}

// 各会社の結果を判定
for (let i = 0; i < companies.length; i++) {
  const company = companies[i];
  const nextIndex = i + 1 < companies.length ? logContent.indexOf(`[${companies[i+1].index}/`) : logContent.length;
  const currentIndex = logContent.indexOf(`[${company.index}/`);
  const section = logContent.substring(currentIndex, nextIndex);

  let result = '成功';
  let error = '';

  if (section.includes('スキップ: フォームがiframe内')) {
    result = '失敗';
    error = 'iframe内フォーム';
  } else if (section.includes('スキップ: フォーム実装エラー')) {
    result = '失敗';
    error = 'フォーム実装エラー';
  } else if (section.includes('送信ボタンが見つかりませんでした')) {
    result = '失敗';
    error = '送信ボタンなし';
  } else if (section.includes('🎉 送信成功と判定')) {
    result = '成功';
  } else if (section.includes('✅ 入力完了')) {
    result = '成功';
  }

  // 入力項目数を抽出
  const inputMatch = section.match(/✅ 入力完了: (\d+)項目/);
  const inputCount = inputMatch ? inputMatch[1] : '0';

  // スキップ項目数を抽出
  const skipMatch = section.match(/⚠️  スキップ: (\d+)項目/);
  const skipCount = skipMatch ? skipMatch[1] : '0';

  const url = companyData[company.name] || '';

  results.push({
    name: company.name,
    url: url,
    result: result,
    inputCount: inputCount,
    skipCount: skipCount,
    details: '',
    error: error
  });
}

// スキップされた会社も追加
const skipPattern = /⏭️\s+スキップ:\s+(.+?)\s+\((送信済み|チェック済み)\)/g;
while ((match = skipPattern.exec(logContent)) !== null) {
  if (match[1]) {
    const name = match[1].trim();
    if (!results.find(r => r.name === name)) {
      results.unshift({
        name: name,
        url: companyData[name] || '',
        result: '成功',
        inputCount: '0',
        skipCount: '0',
        details: '',
        error: 'スキップ(処理済み)'
      });
    }
  }
}

// CSVに書き出し
let csvOutput = '会社名,URL,結果,入力項目数,スキップ項目数,入力詳細,エラー\n';
results.forEach(r => {
  const escapedName = r.name.includes(',') ? `"${r.name}"` : r.name;
  csvOutput += `${escapedName},${r.url},${r.result},${r.inputCount},${r.skipCount},${r.details},${r.error}\n`;
});

fs.writeFileSync(outputFile, csvOutput);

const successCount = results.filter(r => r.result === '成功').length;
const failCount = results.filter(r => r.result === '失敗').length;

console.log(`処理完了: ${results.length}件を 送信結果ログ_復元.csv に書き込みました`);
console.log(`成功: ${successCount}件`);
console.log(`失敗: ${failCount}件`);
