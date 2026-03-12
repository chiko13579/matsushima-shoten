const fs = require('fs');

const INPUT_FILE = '全国のシステム開発会社リスト_重複削除.csv';
const OUTPUT_FILE = '全国のシステム開発会社リスト_フィルタ済み.csv';

// まとめサイト・情報サイトのパターン
const SUMMARY_SITE_PATTERNS = [
  /おすすめ/,
  /比較/,
  /ランキング/,
  /まとめ/,
  /厳選/,
  /徹底比較/,
  /2024年/,
  /2025年/,
  /\d+社/,          // 10社、20社など
  /特徴別/,
  /費用相場/,
  /選び方/,
  /優良/,
  /一覧/,
  /imitsu\.jp/i,    // 比較サイト
  /biz\.ne\.jp/i,   // 比較サイト
  /hnavi\.co\.jp/i, // 比較サイト
  /system-kanji\.com/i, // 比較サイト
  /wiki/i,
  /wikipedia/i,
  /求人/,
  /転職/,
  /口コミ/,
  /レビュー/,
  /amazon/i,
  /楽天/i,
  /yahoo/i,
  /google/i,
];

// システム開発に関連するキーワード（会社名・URLに含まれるべき）
const INCLUDE_KEYWORDS = [
  'システム', 'system', 'ソフトウェア', 'software', 'アプリ', 'app',
  'IT', 'デジタル', 'digital', 'プログラム', 'program',
  'エンジニアリング', 'engineering', 'テクノロジー', 'technology',
  'ソリューション', 'solution', 'web', 'ウェブ',
  '開発', 'development', 'クラウド', 'cloud',
  'AI', '人工知能', 'DX', 'IoT'
];

// 除外キーワード（無関係な業種）
const EXCLUDE_KEYWORDS = [
  '税理士', '会計', '弁護士', '社労士', '行政書士',
  '不動産', '建設', '工務店', 'リフォーム',
  '飲食', 'レストラン', 'カフェ', '美容', 'サロン',
  '医療', 'クリニック', '病院', '薬局',
  '学習塾', '英会話', 'スクール', '教室',
  '保険', '金融', '銀行', '証券',
  '旅行', 'ホテル', '宿泊', '観光',
  '採用', '求人', '転職', '人材',
  'ブログ', 'note', 'youtube', 'twitter', 'facebook', 'instagram'
];

// 大手企業キーワード（除外）
const MAJOR_COMPANY_KEYWORDS = [
  // メガベンダー
  '富士通', 'fujitsu', 'NTTデータ', 'nttdata', '日立', 'hitachi',
  'NEC', 'IBM', 'アイビーエム', 'オラクル', 'oracle', 'マイクロソフト', 'microsoft',
  'SAP', 'サップ', 'セールスフォース', 'salesforce',

  // 大手SIer
  '野村総合研究所', 'NRI', '伊藤忠テクノソリューションズ', 'CTC',
  'SCSK', 'TIS', 'ティアイエス', '日本ユニシス', 'unisys',
  '大塚商会', 'otsuka', 'オービック', 'obic', 'トランスコスモス', 'transcosmos',

  // コンサルティングファーム
  'アクセンチュア', 'accenture', 'デロイト', 'deloitte',
  'PwC', 'ピーダブリューシー', 'KPMG', 'ケーピーエムジー',
  'アビームコンサルティング', 'abeam', 'ベイカレント', 'baycurrent',

  // グローバル企業
  'Google', 'グーグル', 'Amazon', 'アマゾン', 'Meta', 'メタ',
  'Apple', 'アップル', 'Cisco', 'シスコ',

  // 大手通信・電機メーカー系
  'ソフトバンク', 'softbank', 'KDDI', 'ケイディディアイ',
  'パナソニック', 'panasonic', 'ソニー', 'sony', '東芝', 'toshiba',
  '三菱電機', 'mitsubishi', 'シャープ', 'sharp', 'キヤノン', 'canon',

  // 楽天・Yahoo等
  '楽天', 'rakuten', 'ヤフー', 'yahoo', 'LINE', 'ライン',
  'サイバーエージェント', 'cyberagent', 'DeNA', 'ディーエヌエー',

  // その他大手
  'リクルート', 'recruit', 'パーソル', 'persol',
  'ワークスアプリケーションズ', 'worksap',
];

/**
 * CSVを読み込んで行に分割
 */
function loadCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  return lines;
}

/**
 * CSV行をパース（市名、会社名、URL）
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);

  return {
    city: fields[0] || '',
    company: fields[1] || '',
    url: fields[2] || ''
  };
}

/**
 * まとめサイトかどうかチェック
 */
function isSummarySite(company, url) {
  const combinedText = `${company} ${url}`;
  return SUMMARY_SITE_PATTERNS.some(pattern => pattern.test(combinedText));
}

/**
 * テキストに含まれるキーワードをチェック
 */
function containsKeywords(text, keywords) {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * URLの階層数を計算
 */
function getUrlDepth(urlString) {
  try {
    const url = new URL(urlString);
    const pathname = url.pathname;
    const parts = pathname.split('/').filter(part => part.trim() !== '');
    return parts.length;
  } catch (error) {
    return 0;
  }
}

/**
 * システム開発会社として適切かチェック
 */
function isValidSystemCompany(company, url) {
  const combinedText = `${company} ${url}`;

  // 1. まとめサイトは除外
  if (isSummarySite(company, url)) {
    return false;
  }

  // 2. 除外キーワードチェック
  if (containsKeywords(combinedText, EXCLUDE_KEYWORDS)) {
    return false;
  }

  // 3. URL階層が深すぎる（4階層以上）は除外
  const depth = getUrlDepth(url);
  if (depth > 3) {
    return false;
  }

  // 4. システム開発関連のキーワードを含むかチェック
  if (!containsKeywords(combinedText, INCLUDE_KEYWORDS)) {
    return false;
  }

  return true;
}

/**
 * メイン処理
 */
function main() {
  console.log('=== システム開発会社フィルタリング開始 ===\n');

  const lines = loadCSV(INPUT_FILE);
  console.log(`総行数: ${lines.length}行`);

  // ヘッダー
  const header = lines[0];
  const filteredLines = [header];

  let totalCount = 0;
  let validCount = 0;
  let summaryCount = 0;
  let excludedCount = 0;
  let depthCount = 0;
  let keywordCount = 0;
  let majorCompanyCount = 0;

  // 各行をチェック
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    totalCount++;

    try {
      const { city, company, url } = parseCSVLine(line);

      // まとめサイトチェック
      if (isSummarySite(company, url)) {
        summaryCount++;
        if (summaryCount <= 10) {
          console.log(`[まとめサイト] ${company} - ${url}`);
        }
        continue;
      }

      // 除外キーワードチェック
      const combinedText = `${company} ${url}`;
      if (containsKeywords(combinedText, EXCLUDE_KEYWORDS)) {
        excludedCount++;
        if (excludedCount <= 10) {
          console.log(`[除外キーワード] ${company} - ${url}`);
        }
        continue;
      }

      // 大手企業チェック
      if (containsKeywords(combinedText, MAJOR_COMPANY_KEYWORDS)) {
        majorCompanyCount++;
        if (majorCompanyCount <= 10) {
          console.log(`[大手企業] ${company} - ${url}`);
        }
        continue;
      }

      // URL階層チェック
      const depth = getUrlDepth(url);
      if (depth > 3) {
        depthCount++;
        if (depthCount <= 10) {
          console.log(`[階層深すぎ:${depth}] ${company} - ${url}`);
        }
        continue;
      }

      // 含むべきキーワードチェック
      if (!containsKeywords(combinedText, INCLUDE_KEYWORDS)) {
        keywordCount++;
        if (keywordCount <= 10) {
          console.log(`[キーワード不一致] ${company} - ${url}`);
        }
        continue;
      }

      // すべてのチェックをパス
      filteredLines.push(line);
      validCount++;

    } catch (error) {
      console.error(`行 ${i} のパースエラー:`, error.message);
    }
  }

  // 結果を保存
  fs.writeFileSync(OUTPUT_FILE, filteredLines.join('\n'), 'utf-8');

  console.log('\n=== フィルタリング完了 ===');
  console.log(`元のデータ: ${totalCount}件`);
  console.log(`有効なデータ: ${validCount}件`);
  console.log('\n除外内訳:');
  console.log(`  まとめサイト: ${summaryCount}件`);
  console.log(`  除外キーワード: ${excludedCount}件`);
  console.log(`  大手企業: ${majorCompanyCount}件`);
  console.log(`  URL階層深すぎ: ${depthCount}件`);
  console.log(`  キーワード不一致: ${keywordCount}件`);
  console.log(`  合計除外: ${summaryCount + excludedCount + majorCompanyCount + depthCount + keywordCount}件`);
  console.log(`\n残存率: ${((validCount / totalCount) * 100).toFixed(1)}%`);
  console.log(`\n出力ファイル: ${OUTPUT_FILE}`);
}

main();
