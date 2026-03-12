const fs = require('fs');

const content = fs.readFileSync('/Users/saeki/Downloads/img/list_project/全国のシステム開発会社リスト_営業OK_中小企業_入力ログ.txt', 'utf-8');

// 各エントリを分割
const entries = content.split('============================================================').filter(e => e.trim());

// 正しい値のマッピング
const expectedValues = {
    fullName: '森田憲治',
    fullNameKana: ['もりたけんじ', 'モリタケンジ'],
    company: 'あなたのおかげ',
    tel: '09091749043',
    email: 'info@anatano-okage.c',
    subject: 'システム開発のご相談',
    message: '突然のご連絡失礼いたします'
};

const problems = [];

entries.forEach((entry, index) => {
    const lines = entry.trim().split('\n');

    // URLを取得
    const urlLine = lines.find(l => l.includes('URL:'));
    const url = urlLine ? urlLine.replace(/.*URL:\s*/, '').trim() : '';

    // タイトルを取得
    const titleLine = lines.find(l => l.includes('📝'));
    const title = titleLine ? titleLine.replace(/.*📝\s*/, '').trim() : '';

    // 入力できなかったものはスキップ
    if (entry.includes('⚠️ 入力できる項目がありませんでした')) {
        return;
    }

    const issues = [];

    // 入力された項目を抽出
    const inputLines = lines.filter(l => l.includes('✅') && l.includes(':'));

    inputLines.forEach(line => {
        // ✅ fieldName: value の形式をパース
        const match = line.match(/✅\s+(\w+):\s*(.+)/);
        if (!match) return;

        const fieldName = match[1];
        const value = match[2].trim();

        // チェックボックスやラジオボタンはスキップ
        if (fieldName === 'チェックボックス' || fieldName === 'ラジオボタン') return;

        // フィールド名と値の不一致をチェック

        // 1. fullName に電話番号やメールが入っている
        if (fieldName === 'fullName') {
            if (value.includes('@') || /^\d{10,}$/.test(value.replace(/-/g, ''))) {
                issues.push(`❌ fullName に不正な値: ${value}`);
            } else if (value === 'もりたけんじ' || value === 'モリタケンジ') {
                issues.push(`❌ fullName にふりがなが入力: ${value}`);
            }
        }

        // 2. fullNameKana に漢字が入っている
        if (fieldName === 'fullNameKana') {
            if (value === '森田憲治') {
                issues.push(`❌ fullNameKana に漢字が入力: ${value}`);
            } else if (/[一-龯]/.test(value)) {
                issues.push(`❌ fullNameKana に漢字が含まれる: ${value}`);
            }
        }

        // 3. email にメール以外が入っている
        if (fieldName === 'email') {
            if (!value.includes('@') && !value.includes('...')) {
                issues.push(`❌ email に不正な値: ${value}`);
            }
        }

        // 4. tel に電話番号以外が入っている
        if (fieldName === 'tel') {
            const cleanTel = value.replace(/[-\s]/g, '');
            if (!/^\d+$/.test(cleanTel) && value !== '09091749043') {
                issues.push(`❌ tel に不正な値: ${value}`);
            }
        }

        // 5. company にメールや電話が入っている
        if (fieldName === 'company') {
            if (value.includes('@') || /^\d{10,}$/.test(value.replace(/-/g, ''))) {
                issues.push(`❌ company に不正な値: ${value}`);
            }
        }

        // 6. message に件名などが入っている（短すぎる場合）
        if (fieldName === 'message') {
            if (value === 'システム開発のご相談') {
                issues.push(`❌ message に件名が入力: ${value}`);
            }
        }

        // 7. subject にメッセージ本文が入っている
        if (fieldName === 'subject') {
            if (value.includes('突然のご連絡')) {
                issues.push(`❌ subject にメッセージ本文が入力`);
            }
        }
    });

    // 同じ項目に重複入力をチェック
    const fieldCounts = {};
    inputLines.forEach(line => {
        const match = line.match(/✅\s+(\w+):/);
        if (match && match[1] !== 'チェックボックス' && match[1] !== 'ラジオボタン') {
            const field = match[1];
            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        }
    });

    Object.entries(fieldCounts).forEach(([field, count]) => {
        if (count >= 3) {
            issues.push(`⚠️ ${field} が ${count}回重複入力されている`);
        }
    });

    if (issues.length > 0) {
        problems.push({
            index: index + 1,
            title,
            url,
            issues
        });
    }
});

// 結果を出力
console.log('========================================');
console.log('項目と入力値の不一致リスト');
console.log('========================================\n');

console.log(`問題あり: ${problems.length}件\n`);

problems.forEach((p, i) => {
    console.log(`${i + 1}. ${p.title}`);
    console.log(`   URL: ${p.url}`);
    p.issues.forEach(issue => {
        console.log(`   ${issue}`);
    });
    console.log('');
});

// CSVも出力
const csvLines = ['番号,タイトル,URL,問題'];
problems.forEach((p, i) => {
    const escapedTitle = `"${p.title.replace(/"/g, '""')}"`;
    const escapedUrl = `"${p.url}"`;
    const escapedIssues = `"${p.issues.join('; ')}"`;
    csvLines.push(`${i + 1},${escapedTitle},${escapedUrl},${escapedIssues}`);
});

fs.writeFileSync('/Users/saeki/Downloads/img/list_project/入力不一致リスト.csv', csvLines.join('\n'), 'utf-8');
console.log('\n✅ CSV出力: 入力不一致リスト.csv');
