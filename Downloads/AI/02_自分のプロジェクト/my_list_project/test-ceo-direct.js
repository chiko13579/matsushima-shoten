const CompanyInfoExtractor = require('./company-extractor');

// 直接的なテスト
function testCEOValidation() {
    const extractor = new CompanyInfoExtractor();
    
    const testNames = [
        '山田 太郎',
        '田中太郎', 
        '佐藤花子',
        '鈴木一郎',
        '会長',
        '岩上貴洋 資本金',
        'John Smith',
        'Taro Yamada',
        '田中',
        '社長',
        '代表取締役'
    ];
    
    console.log('=== CEO名の有効性テスト ===');
    testNames.forEach(name => {
        const cleaned = extractor.cleanCEOName(name);
        const isValid = extractor.isValidCEOName(cleaned);
        
        // 詳細デバッグ
        console.log(`\n"${name}" → "${cleaned}"`);
        if (cleaned) {
            console.log(`  長さ: ${cleaned.length}`);
            console.log(`  文字コード: ${cleaned.split('').map(c => c.charCodeAt(0)).join(', ')}`);
            console.log(`  スペース分離: [${cleaned.split(/\s+/).join(', ')}]`);
            console.log(`  日本語テスト: ${/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff\u30fc\u3005]/.test(cleaned)}`);
            console.log(`  英字テスト: ${/[a-zA-Z]/.test(cleaned)}`);
        }
        console.log(`  結果: ${isValid ? '✅ 有効' : '❌ 無効'}`);
    });
}

testCEOValidation();