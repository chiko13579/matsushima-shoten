const fs = require('fs');

const content = fs.readFileSync('/Users/saeki/Downloads/img/list_project/全国のシステム開発会社リスト_営業OK_中小企業_入力ログ.txt', 'utf-8');

// 各エントリを分割
const entries = content.split('============================================================').filter(e => e.trim());

const noInputList = [];      // 送信できなかったもの
const mismatchList = [];     // 項目と入力値の不一致
const successList = [];      // 値が正しく入ったもの

entries.forEach((entry, index) => {
    const lines = entry.trim().split('\n');

    // ヘッダー部分はスキップ
    if (entry.includes('システム開発会社テスト送信ログ') || entry.includes('送信対象:')) {
        return;
    }

    // URLを取得
    const urlLine = lines.find(l => l.includes('URL:'));
    const url = urlLine ? urlLine.replace(/.*URL:\s*/, '').trim() : '';

    // タイトルを取得
    const titleLine = lines.find(l => l.includes('📝'));
    const title = titleLine ? titleLine.replace(/.*📝\s*/, '').trim() : '';

    if (!title && !url) return;

    // 入力完了項目数を取得
    const completedMatch = entry.match(/📊 入力完了: (\d+)項目/);
    const completedCount = completedMatch ? parseInt(completedMatch[1]) : 0;

    // 1. 入力できなかったもの
    if (entry.includes('⚠️ 入力できる項目がありませんでした')) {
        noInputList.push({
            title,
            url,
            reason: '入力できる項目なし'
        });
        return;
    }

    // 入力された項目を抽出
    const inputLines = lines.filter(l => l.includes('✅') && l.includes(':'));

    // 2. 重複入力チェック
    const fieldCounts = {};
    inputLines.forEach(line => {
        const match = line.match(/✅\s+(\w+):/);
        if (match && match[1] !== 'チェックボックス' && match[1] !== 'ラジオボタン') {
            const field = match[1];
            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        }
    });

    const issues = [];
    Object.entries(fieldCounts).forEach(([field, count]) => {
        if (count >= 3) {
            issues.push(`${field}が${count}回重複入力`);
        }
    });

    // 3. 必須項目チェック
    const hasName = entry.includes('fullName:') || entry.includes('name:');
    const hasEmail = entry.includes('email:');
    const hasMessage = entry.includes('message:');
    const hasCompany = entry.includes('company:');

    if (completedCount > 0 && completedCount <= 2) {
        issues.push(`入力項目が少ない(${completedCount}項目のみ)`);
    }

    // 必須項目が欠けている場合
    const missingFields = [];
    if (!hasName && completedCount > 0) missingFields.push('名前');
    if (!hasEmail && completedCount > 0) missingFields.push('メール');
    if (!hasMessage && completedCount > 0) missingFields.push('メッセージ');

    if (missingFields.length >= 2) {
        issues.push(`${missingFields.join('・')}未入力`);
    }

    if (issues.length > 0) {
        mismatchList.push({
            title,
            url,
            completedCount,
            issues
        });
    } else if (completedCount >= 3 && hasEmail) {
        // 正常に入力できたもの
        successList.push({
            title,
            url,
            completedCount,
            hasName,
            hasEmail,
            hasMessage,
            hasCompany
        });
    } else {
        // その他の問題
        mismatchList.push({
            title,
            url,
            completedCount,
            issues: ['入力が不十分']
        });
    }
});

// 結果を出力
console.log('========================================');
console.log('入力結果の分類');
console.log('========================================\n');

console.log(`【1】送信できなかった: ${noInputList.length}件`);
console.log(`【2】項目と入力値の不一致/不完全: ${mismatchList.length}件`);
console.log(`【3】値が正しく入った: ${successList.length}件`);
console.log(`合計: ${noInputList.length + mismatchList.length + successList.length}件\n`);

// CSV出力 - 送信できなかったもの
const noInputCsv = ['タイトル,URL,理由'];
noInputList.forEach(item => {
    const escapedTitle = `"${item.title.replace(/"/g, '""')}"`;
    const escapedUrl = `"${item.url}"`;
    noInputCsv.push(`${escapedTitle},${escapedUrl},${item.reason}`);
});
fs.writeFileSync('/Users/saeki/Downloads/img/list_project/①送信できなかったリスト.csv', noInputCsv.join('\n'), 'utf-8');

// CSV出力 - 不一致リスト
const mismatchCsv = ['タイトル,URL,入力項目数,問題'];
mismatchList.forEach(item => {
    const escapedTitle = `"${item.title.replace(/"/g, '""')}"`;
    const escapedUrl = `"${item.url}"`;
    const escapedIssues = `"${item.issues.join('; ')}"`;
    mismatchCsv.push(`${escapedTitle},${escapedUrl},${item.completedCount},${escapedIssues}`);
});
fs.writeFileSync('/Users/saeki/Downloads/img/list_project/②入力不一致リスト.csv', mismatchCsv.join('\n'), 'utf-8');

// CSV出力 - 正常リスト
const successCsv = ['タイトル,URL,入力項目数,名前,メール,メッセージ,会社名'];
successList.forEach(item => {
    const escapedTitle = `"${item.title.replace(/"/g, '""')}"`;
    const escapedUrl = `"${item.url}"`;
    successCsv.push(`${escapedTitle},${escapedUrl},${item.completedCount},${item.hasName ? '○' : '×'},${item.hasEmail ? '○' : '×'},${item.hasMessage ? '○' : '×'},${item.hasCompany ? '○' : '×'}`);
});
fs.writeFileSync('/Users/saeki/Downloads/img/list_project/③正常入力リスト.csv', successCsv.join('\n'), 'utf-8');

console.log('✅ CSV出力完了:');
console.log('   ①送信できなかったリスト.csv');
console.log('   ②入力不一致リスト.csv');
console.log('   ③正常入力リスト.csv');
