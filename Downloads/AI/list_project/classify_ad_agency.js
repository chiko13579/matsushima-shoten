const fs = require('fs');

const content = fs.readFileSync('/Users/saeki/Downloads/img/list_project/全国の広告代理店リスト_営業OK_入力ログ.txt', 'utf-8');

// 各エントリを分割（[番号/総数] 会社名 で区切る）
const entryPattern = /\[\d+\/\d+\]\s+.+?\n\n📝/g;
const entries = content.split(/(?=\[\d+\/\d+\])/g).filter(e => e.includes('📝') && e.includes('URL:'));

const noInputList = [];      // 送信できなかったもの
const mismatchList = [];     // 項目と入力値の不一致
const successList = [];      // 値が正しく入ったもの

entries.forEach((entry, index) => {
    const lines = entry.trim().split('\n');

    // 会社名を取得
    const companyMatch = entry.match(/\[\d+\/\d+\]\s+(.+)/);
    const companyName = companyMatch ? companyMatch[1].trim() : '';

    // URLを取得
    const urlMatch = entry.match(/URL:\s*(.+)/);
    const url = urlMatch ? urlMatch[1].trim() : '';

    if (!companyName || !url) return;

    // 入力完了項目数を取得
    const completedMatch = entry.match(/✅ 入力完了: (\d+)項目/);
    const completedCount = completedMatch ? parseInt(completedMatch[1]) : 0;

    // 入力項目を解析
    const hasName = entry.includes('(fullName)') || entry.includes('fullName:');
    const hasEmail = entry.includes('(email)') || entry.includes('email:');
    const hasMessage = entry.includes('(message)') || entry.includes('message:');
    const hasCompany = entry.includes('(company)') || entry.includes('company:');
    const hasTel = entry.includes('(tel)') || entry.includes('tel:');

    // 問題をチェック
    const issues = [];

    // 入力できなかった
    if (completedCount === 0) {
        noInputList.push({
            companyName,
            url,
            reason: '入力項目0件'
        });
        return;
    }

    // 必須項目未入力
    if (entry.includes('❗ 必須項目で未入力')) {
        const missingMatch = entry.match(/❗ 必須項目で未入力: (\d+)項目/);
        issues.push(`必須項目未入力${missingMatch ? missingMatch[1] + '件' : ''}`);
    }

    // reCAPTCHA検出
    if (entry.includes('reCAPTCHAを検出')) {
        issues.push('reCAPTCHA検出');
    }

    // エラーメッセージ検出
    if (entry.includes('送信後にエラーメッセージを検出')) {
        issues.push('エラー検出');
    }

    // 入力項目が少ない
    if (completedCount <= 2) {
        issues.push(`入力項目が少ない(${completedCount}項目)`);
    }

    // 必須項目チェック
    const missingFields = [];
    if (!hasName) missingFields.push('名前');
    if (!hasEmail) missingFields.push('メール');
    if (!hasMessage) missingFields.push('メッセージ');

    if (missingFields.length >= 2) {
        issues.push(`${missingFields.join('・')}なし`);
    }

    if (issues.length > 0) {
        mismatchList.push({
            companyName,
            url,
            completedCount,
            issues
        });
    } else if (completedCount >= 3 && hasEmail) {
        successList.push({
            companyName,
            url,
            completedCount,
            hasName,
            hasEmail,
            hasMessage,
            hasCompany,
            hasTel
        });
    } else {
        mismatchList.push({
            companyName,
            url,
            completedCount,
            issues: ['入力が不十分']
        });
    }
});

// フォルダ作成
const outputDir = '/Users/saeki/Downloads/img/list_project/広告代理店リスト';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 結果を出力
console.log('========================================');
console.log('広告代理店 入力結果の分類');
console.log('========================================\n');

console.log(`【1】送信できなかった: ${noInputList.length}件`);
console.log(`【2】項目と入力値の不一致/不完全: ${mismatchList.length}件`);
console.log(`【3】値が正しく入った: ${successList.length}件`);
console.log(`合計: ${noInputList.length + mismatchList.length + successList.length}件\n`);

// CSV出力 - 送信できなかったもの
const noInputCsv = ['会社名,URL,理由'];
noInputList.forEach(item => {
    const escapedName = `"${item.companyName.replace(/"/g, '""')}"`;
    const escapedUrl = `"${item.url}"`;
    noInputCsv.push(`${escapedName},${escapedUrl},${item.reason}`);
});
fs.writeFileSync(`${outputDir}/①送信できなかったリスト.csv`, noInputCsv.join('\n'), 'utf-8');

// CSV出力 - 不一致リスト
const mismatchCsv = ['会社名,URL,入力項目数,問題'];
mismatchList.forEach(item => {
    const escapedName = `"${item.companyName.replace(/"/g, '""')}"`;
    const escapedUrl = `"${item.url}"`;
    const escapedIssues = `"${item.issues.join('; ')}"`;
    mismatchCsv.push(`${escapedName},${escapedUrl},${item.completedCount},${escapedIssues}`);
});
fs.writeFileSync(`${outputDir}/②入力不一致リスト.csv`, mismatchCsv.join('\n'), 'utf-8');

// CSV出力 - 正常リスト
const successCsv = ['会社名,URL,入力項目数,名前,メール,メッセージ,会社名入力,電話'];
successList.forEach(item => {
    const escapedName = `"${item.companyName.replace(/"/g, '""')}"`;
    const escapedUrl = `"${item.url}"`;
    successCsv.push(`${escapedName},${escapedUrl},${item.completedCount},${item.hasName ? '○' : '×'},${item.hasEmail ? '○' : '×'},${item.hasMessage ? '○' : '×'},${item.hasCompany ? '○' : '×'},${item.hasTel ? '○' : '×'}`);
});
fs.writeFileSync(`${outputDir}/③正常入力リスト.csv`, successCsv.join('\n'), 'utf-8');

// 元ログもコピー
fs.copyFileSync('/Users/saeki/Downloads/img/list_project/全国の広告代理店リスト_営業OK_入力ログ.txt', `${outputDir}/全国の広告代理店リスト_営業OK_入力ログ.txt`);

console.log('✅ CSV出力完了:');
console.log(`   ${outputDir}/①送信できなかったリスト.csv`);
console.log(`   ${outputDir}/②入力不一致リスト.csv`);
console.log(`   ${outputDir}/③正常入力リスト.csv`);
