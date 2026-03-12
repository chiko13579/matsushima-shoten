const fs = require('fs');

const content = fs.readFileSync('/Users/saeki/Downloads/img/list_project/全国のシステム開発会社リスト_営業OK_中小企業_入力ログ.txt', 'utf-8');

// 各エントリを分割
const entries = content.split('============================================================').filter(e => e.trim());

const problems = [];

entries.forEach((entry, index) => {
    const lines = entry.trim().split('\n');

    // URLを取得
    const urlLine = lines.find(l => l.includes('URL:'));
    const url = urlLine ? urlLine.replace(/.*URL:\s*/, '').trim() : '';

    // タイトルを取得
    const titleLine = lines.find(l => l.includes('📝'));
    const title = titleLine ? titleLine.replace(/.*📝\s*/, '').trim() : '';

    // 入力できなかった
    const noInput = entry.includes('⚠️ 入力できる項目がありませんでした');

    // 入力完了項目数を取得
    const completedMatch = entry.match(/📊 入力完了: (\d+)項目/);
    const completedCount = completedMatch ? parseInt(completedMatch[1]) : 0;

    // 必須項目のチェック
    const hasName = entry.includes('fullName:') || entry.includes('name:');
    const hasEmail = entry.includes('email:');
    const hasMessage = entry.includes('message:');
    const hasCompany = entry.includes('company:');
    const hasTel = entry.includes('tel:');

    // 問題パターン
    const issues = [];

    if (noInput) {
        issues.push('❌ 入力できる項目なし');
    }

    if (!noInput && completedCount > 0) {
        if (!hasName) issues.push('⚠️ 名前未入力');
        if (!hasEmail) issues.push('⚠️ メール未入力');
        if (!hasMessage) issues.push('⚠️ メッセージ未入力');
        if (!hasCompany) issues.push('⚠️ 会社名未入力');
    }

    if (completedCount > 0 && completedCount <= 2) {
        issues.push(`⚠️ 入力項目が少ない (${completedCount}項目のみ)`);
    }

    if (issues.length > 0) {
        problems.push({
            index: index + 1,
            title,
            url,
            completedCount,
            issues
        });
    }
});

// 結果を分類して出力
const noInputProblems = problems.filter(p => p.issues.some(i => i.includes('入力できる項目なし')));
const missingFieldProblems = problems.filter(p => !p.issues.some(i => i.includes('入力できる項目なし')) && p.issues.some(i => i.includes('未入力') || i.includes('項目が少ない')));

console.log('========================================');
console.log('入力に問題があるエントリの抽出結果');
console.log('========================================\n');

console.log(`総エントリ数: ${entries.length - 1}件`); // ヘッダー分を除く
console.log(`問題あり: ${problems.length}件\n`);

console.log('----------------------------------------');
console.log(`【1】入力できる項目がなかった: ${noInputProblems.length}件`);
console.log('----------------------------------------');
noInputProblems.forEach((p, i) => {
    console.log(`${i + 1}. ${p.title}`);
    console.log(`   URL: ${p.url}`);
    console.log('');
});

console.log('\n----------------------------------------');
console.log(`【2】必須項目が欠けている（入力はできたが不完全）: ${missingFieldProblems.length}件`);
console.log('----------------------------------------');
missingFieldProblems.forEach((p, i) => {
    console.log(`${i + 1}. ${p.title}`);
    console.log(`   URL: ${p.url}`);
    console.log(`   入力完了: ${p.completedCount}項目`);
    console.log(`   問題: ${p.issues.join(', ')}`);
    console.log('');
});

// CSVも出力
const csvLines = ['タイプ,タイトル,URL,入力項目数,問題'];
problems.forEach(p => {
    const type = p.issues.some(i => i.includes('入力できる項目なし')) ? '入力不可' : '不完全';
    const escapedTitle = `"${p.title.replace(/"/g, '""')}"`;
    const escapedUrl = `"${p.url}"`;
    const escapedIssues = `"${p.issues.join('; ')}"`;
    csvLines.push(`${type},${escapedTitle},${escapedUrl},${p.completedCount},${escapedIssues}`);
});

fs.writeFileSync('/Users/saeki/Downloads/img/list_project/入力問題リスト.csv', csvLines.join('\n'), 'utf-8');
console.log('\n✅ CSV出力: 入力問題リスト.csv');
