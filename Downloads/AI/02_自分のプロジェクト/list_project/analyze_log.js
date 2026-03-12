const fs = require('fs');

const logFile = '/Users/saeki/Downloads/img/list_project/全国のシステム開発会社リスト_営業OK_中小企業_入力ログ.txt';
const content = fs.readFileSync(logFile, 'utf-8');

// 各会社のエントリを分割
const entries = content.split(/={60}/);

const issues = [];

for (const entry of entries) {
  if (!entry.includes('📝')) continue;

  const lines = entry.trim().split('\n');
  const companyLine = lines.find(l => l.includes('📝'));
  const urlLine = lines.find(l => l.includes('URL:'));

  if (!companyLine) continue;

  const company = companyLine.replace('📝', '').trim();
  const url = urlLine ? urlLine.replace('URL:', '').trim() : '';

  // 入力完了の行を探す
  const completeLine = lines.find(l => l.includes('入力完了:'));

  // 問題パターンを検出
  const inputLines = lines.filter(l => l.includes('✅'));

  // 1. 同じフィールドに複数回入力されている
  const fieldCounts = {};
  for (const line of inputLines) {
    const match = line.match(/✅\s*([\w]+):/);
    if (match) {
      const field = match[1];
      fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    }
  }

  const duplicateFields = Object.entries(fieldCounts)
    .filter(([field, count]) => count > 1)
    .map(([field, count]) => `${field}(${count}回)`);

  if (duplicateFields.length > 0) {
    // messageやsubjectの重複は除外（複数のtextareaがある場合があるため）
    const realDuplicates = duplicateFields.filter(f =>
      !f.startsWith('message') && !f.startsWith('subject')
    );

    if (realDuplicates.length > 0) {
      issues.push({
        type: '重複入力',
        company,
        url,
        details: realDuplicates.join(', ')
      });
    }
  }

  // 2. 入力項目が1つだけ（不完全な入力）
  if (completeLine) {
    const match = completeLine.match(/(\d+)項目/);
    if (match && parseInt(match[1]) === 1) {
      issues.push({
        type: '入力項目が1つのみ',
        company,
        url,
        details: inputLines.map(l => l.trim()).join(', ')
      });
    }
  }

  // 3. emailが2回以上入力されている（確認用メールに同じ値が入っている可能性）
  if (fieldCounts['email'] > 2) {
    issues.push({
      type: 'email重複多数',
      company,
      url,
      details: `email ${fieldCounts['email']}回入力`
    });
  }

  // 4. telが3回以上入力されている
  if (fieldCounts['tel'] > 2) {
    issues.push({
      type: 'tel重複多数',
      company,
      url,
      details: `tel ${fieldCounts['tel']}回入力`
    });
  }

  // 5. companyが2回以上入力されている
  if (fieldCounts['company'] > 1) {
    issues.push({
      type: 'company重複',
      company,
      url,
      details: `company ${fieldCounts['company']}回入力`
    });
  }

  // 6. fullNameが2回以上入力されている
  if (fieldCounts['fullName'] > 1) {
    issues.push({
      type: 'fullName重複',
      company,
      url,
      details: `fullName ${fieldCounts['fullName']}回入力`
    });
  }
}

// 結果を出力
console.log('=== 入力がおかしい可能性のあるエントリ ===\n');

// タイプ別に集計
const byType = {};
for (const issue of issues) {
  if (!byType[issue.type]) byType[issue.type] = [];
  byType[issue.type].push(issue);
}

for (const [type, items] of Object.entries(byType)) {
  console.log(`\n【${type}】 ${items.length}件`);
  console.log('-'.repeat(60));
  for (const item of items.slice(0, 10)) { // 各タイプ最大10件表示
    console.log(`会社: ${item.company}`);
    console.log(`URL: ${item.url}`);
    console.log(`詳細: ${item.details}`);
    console.log('');
  }
  if (items.length > 10) {
    console.log(`... 他 ${items.length - 10}件`);
  }
}

console.log('\n=== サマリー ===');
for (const [type, items] of Object.entries(byType)) {
  console.log(`${type}: ${items.length}件`);
}
console.log(`\n合計: ${issues.length}件の問題を検出`);
