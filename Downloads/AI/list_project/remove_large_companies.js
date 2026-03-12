const fs = require('fs');

const inputFile = '/Users/saeki/Downloads/img/list_project/全国のシステム開発会社リスト_営業OK.csv';
const outputFile = '/Users/saeki/Downloads/img/list_project/全国のシステム開発会社リスト_営業OK_中小企業.csv';

// 大手企業を判定するキーワード
const largeCompanyKeywords = [
  // 大手IT企業
  'NTT', 'ntt', 'エヌ・ティ・ティ', 'エヌティティ',
  '富士通', 'FUJITSU', 'Fujitsu',
  '日立', 'HITACHI', 'Hitachi',
  'NEC', 'nec', '日本電気',
  'IBM', 'ibm', 'アイ・ビー・エム',
  '楽天', 'Rakuten',
  'ソフトバンク', 'SoftBank', 'Softbank',
  'KDDI', 'kddi',
  'サイバーエージェント', 'CyberAgent',
  'ヤフー', 'Yahoo',
  'LINE', 'ライン',
  'メルカリ', 'Mercari',
  'DeNA', 'ディー・エヌ・エー',
  'グリー', 'GREE',
  'ミクシィ', 'mixi',
  // 大手SIer
  '野村総合研究所', 'NRI', 'nri',
  '大塚商会',
  'TIS', 'tis',
  'SCSK', 'scsk',
  'インテック', 'INTEC',
  '伊藤忠テクノソリューションズ', 'CTC',
  '日本ユニシス', 'ユニシス', 'Unisys',
  '電通国際情報サービス', 'ISID',
  'アクセンチュア', 'Accenture',
  // 大手メーカー系
  'パナソニック', 'Panasonic',
  'ソニー', 'SONY', 'Sony',
  'シャープ', 'SHARP', 'Sharp',
  '東芝', 'TOSHIBA', 'Toshiba',
  '三菱電機',
  'キヤノン', 'Canon',
  'リコー', 'RICOH', 'Ricoh',
  // 金融系大手
  '明治安田', '三菱UFJ', '三井住友', 'みずほ',
  '野村證券', '大和証券', 'SMBC',
  // その他大手
  'トヨタ', 'TOYOTA', 'Toyota',
  'ホンダ', 'HONDA', 'Honda',
  '日産', 'NISSAN', 'Nissan',
  'デンソー', 'DENSO',
  // 外資大手
  'Microsoft', 'マイクロソフト',
  'Google', 'グーグル',
  'Amazon', 'アマゾン', 'AWS',
  'Oracle', 'オラクル',
  'SAP', 'sap',
  'Salesforce', 'セールスフォース',
  // グループ会社判定用
  'グループ', 'ホールディングス', 'HD',
];

const data = fs.readFileSync(inputFile, 'utf8');
const lines = data.split('\n');

const header = lines[0];
const dataLines = lines.slice(1);

let removedCount = 0;
const removedCompanies = [];

const filteredLines = dataLines.filter(line => {
  if (!line.trim()) return false;

  const companyName = line.split(',')[1] || '';

  for (const keyword of largeCompanyKeywords) {
    if (companyName.includes(keyword)) {
      removedCount++;
      removedCompanies.push(companyName);
      return false;
    }
  }
  return true;
});

const output = [header, ...filteredLines].join('\n');
fs.writeFileSync(outputFile, output, 'utf8');

console.log(`元の件数: ${dataLines.filter(l => l.trim()).length}`);
console.log(`削除した大手企業: ${removedCount}件`);
console.log(`残りの件数: ${filteredLines.length}`);
console.log('\n削除した企業:');
removedCompanies.forEach(c => console.log(`  - ${c}`));
console.log(`\n出力ファイル: ${outputFile}`);
