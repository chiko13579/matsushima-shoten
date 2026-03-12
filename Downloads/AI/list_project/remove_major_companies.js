const fs = require('fs');
const path = '/Users/saeki/Downloads/img/list_project/マーケ会社.csv';
const content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

// 大手企業の判定キーワード
const majorCompanyKeywords = [
  // 大手広告代理店
  '電通',
  '博報堂',
  'サイバーエージェント',
  'ADK', 'ＡＤＫ',
  '読売広告社',
  '大広',
  '東急エージェンシー',
  'JR東日本企画',
  'ジェイアール東日本企画',
  'オプト',
  'セプテーニ',
  'マッキャン',
  'オリコム',
  '朝日広告社',
  '日本経済広告社',
  '日本経済社',
  'D2C', 'Ｄ２Ｃ',

  // 大手IT・通信・システム
  'GMO', 'ＧＭＯ',
  'NTT', 'ＮＴＴ',
  'ソフトバンク', 'SoftBank',
  '楽天', 'Rakuten',
  'ヤフー', 'Yahoo',
  'LINE',
  'サイバー',
  'リクルート',
  'アクセンチュア', 'Accenture',
  'トランスコスモス',
  'ベルシステム24',
  'IBM', 'アイ・ビー・エム',
  '日立', 'HITACHI',
  '富士通', 'FUJITSU', 'ＦＵＪＩＴＳＵ',
  'NEC', 'ＮＥＣ',
  'ソニー', 'SONY',
  'パナソニック', 'Panasonic',
  'キヤノン', 'Canon',
  'コニカミノルタ',
  'SCSK', 'ＳＣＳＫ',
  'リコー', 'RICOH',

  // 印刷大手
  'DNP', 'ＤＮＰ', '大日本印刷',
  'TOPPAN', 'ＴＯＰＰＡＮ', '凸版',

  // 大手メディア
  '日テレ',
  'テレビ朝日',
  'TBS',
  'フジテレビ',
  'テレビ東京',

  // コンサル大手
  'デロイト', 'Deloitte',
  'PwC', 'KPMG', 'EY',
  'マッキンゼー', 'McKinsey',
  'ボストンコンサルティング', 'BCG',
  'ベイン', 'Bain',

  // 商社・金融・電力
  '三菱',
  '三井',
  '住友',
  '伊藤忠',
  '丸紅',
  'みずほ',
  '野村',
  '大和',
  'かんでん', '関西電力',
  '東京電力', '中部電力',

  // 自動車
  'トヨタ', 'Toyota',
  'ホンダ', 'Honda',

  // その他大手
  '東京商工リサーチ',
  'ユーザベース',
  'デジタルガレージ',
  'デジタルホールディングス',
  'ファンコミュニケーションズ',
  'バリューコマース',
  'アイモバイル',
  'インタースペース',
  'アドウェイズ',
  'フルスピード',
  'メンバーズ',
  'ブレインパッド',
  'アライドアーキテクツ',
  'ガイアックス',
  'ホットリンク',
  'UUUM',
  'ウーム',
  'ソウルドアウト',
  'ecbeing', 'ｅｃｂｅｉｎｇ',

  // 追加大手
  'Hakuhodo', 'Ｈａｋｕｈｏｄｏ',  // 博報堂系
  'コンセントリクス',  // BPO大手
  'DYM', 'ＤＹＭ',  // 人材大手
  'NRI', 'ＮＲＩ',  // 野村総研系
  'エムスリー', 'M3',  // 医療IT大手
  '阪急阪神',  // 鉄道系
  '東芝',  // 電機大手
  'SBヒューマンキャピタル', 'ＳＢヒューマンキャピタル',  // ソフトバンク系
  'RIZAP', 'ＲＩＺＡＰ', 'ライザップ',  // RIZAP
  '読売', 'ヨミウリ',  // メディア
  'グリー株式会社', 'GREE',  // ゲーム大手（グリーンは除外）
  'フリークアウト',  // 広告テック大手
  'ぴあ',  // チケット大手
  'スターティア',  // 上場IT企業
  'レアゾン',  // 大手
  'キュービック',  // 上場デジタルマーケ
  'ノバセル',  // ラクスル系
  'イー・ガーディアン',  // 上場監視

  // 追加大手マーケティング会社
  'サングローブ',  // 大手Web制作
  'Supership', 'Ｓｕｐｅｒｓｈｉｐ', 'スーパーシップ',  // KDDI系
  'シナジーマーケティング',  // 上場
  'オズマピーアール',  // 博報堂系PR
  'トライベック',  // 上場
  'ワンスター',  // 大手D2C
  'フロンテッジ',  // ソニー系
  'ウィルゲート',  // SEO大手
  'アユダンテ',  // SEO大手
  'アイオイクス',  // SEO大手
  'IMAGICA', 'ＩＭＡＧＩＣＡ', 'イマジカ',  // 映像大手
  'Leo Sophia', 'Ｌｅｏ　Ｓｏｐｈｉａ',  // 大手
  'いえらぶ',  // 不動産テック大手
  'FLUX', 'ＦＬＵＸ',  // 広告テック
  'マテリアル',  // PR大手（ただし小さい会社も含まれる可能性）
  'イングリウッド',  // EC支援大手
  '広済堂',  // 印刷大手系
  'エス・ケイ通信',  // 上場

  // さらに追加
  'ペンシル',  // 上場
  'カーツメディア',  // メディア系
  'コムニコ',  // SNSマーケ大手
  'プロジェクトカンパニー',  // 上場
  'デジタルアイデンティティ',  // SEO大手
  'カンリー',  // MEO大手
  'メディアジーン',  // メディア大手
  '新東通信',  // 広告代理店大手
  'ライダース・パブリシティ',  // PR大手
  'メディアハウスホールディングス',  // 人材メディア大手

  // 最終追加
  'ホリプロ',  // 芸能大手
  'サクラサクマーケティング',  // SEO上場
  'デジタルアスリート',  // リスティング大手

  // 追加（上場・大手）
  'ブランジスタ',  // 上場
  'コンデナスト',  // 海外メディア大手
  'スクロール',  // 上場EC
  'イプロス',  // キーエンス系
  'インキュデータ',  // ソフトバンク系
  'テテマーチ',  // SNSマーケ大手
  'ギャプライズ',  // CX大手
  'サムライト',  // コンテンツマーケ大手
  '廣告社',  // 老舗広告代理店
  'Ｃ　Ｃｈａｎｎｅｌ', 'C Channel',  // 動画メディア大手
  'Geolocation', 'ジオロケーション',  // 上場
  'ＣＩＮ　ＧＲＯＵＰ', 'CIN GROUP',  // 美容系大手
  'ＰＬＡＮ‐Ｂ', 'PLAN-B',  // SEO大手

  // さらに追加
  'ALH', 'ＡＬＨ',  // SES大手
  'コムテック',  // IT大手
  'あとらす二十一',  // Web大手
  'ゼネラルアサヒ',  // 印刷大手
  'ユーソナー',  // データベース大手
  'グロースエクスパートナーズ',  // 上場
  'ＹＲＫ',  // 広告代理店
  'ＣＤＧ',  // 上場販促
  'アドインテ',  // アドテク
  '１７ＬＩＶＥ', '17LIVE',  // ライブ配信大手
  'ＮＥＸＥＲ',  // 上場マーケリサーチ
  'ＡＤＤＩＸ',  // デジタルマーケ大手
  'ゴンドラ',  // 広告代理店大手

  // 最後の追加
  'ヴィアックス',  // 図書館運営大手
  'アイフラッグ',  // Web大手
  '中広',  // 上場広告
  'レクスト',  // 通販大手
];

let removed = 0;
const removedCompanies = [];

const filteredLines = dataLines.filter(line => {
  if (!line.trim()) return false;

  // CSVをパースして1列目（会社名）をチェック
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

  const companyName = parts[0] ? parts[0].replace(/^"|"$/g, '').trim() : '';

  // 大手企業かどうかチェック
  const isMajor = majorCompanyKeywords.some(keyword =>
    companyName.includes(keyword)
  );

  if (isMajor) {
    removed++;
    removedCompanies.push(companyName);
    return false;
  }
  return true;
});

const result = [header, ...filteredLines].join('\n');
fs.writeFileSync(path, result);

console.log('削除した件数:', removed);
console.log('残り件数:', filteredLines.length);
console.log('\n削除した企業:');
removedCompanies.forEach(name => console.log('  -', name));
