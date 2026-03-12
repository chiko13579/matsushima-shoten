const fs = require('fs');
const path = require('path');

// 入力・出力ファイル
const INPUT_FILE = '全国のWeb制作会社リスト.csv';
const OUTPUT_FILE = '全国のWeb制作会社リスト_フィルタ済み.csv';

// フィルタリング用キーワード（会社名とURLの両方をチェック）
const INCLUDE_KEYWORDS = [
  // Web制作関連
  '制作', 'デザイン', 'web', 'ウェブ', 'ホームページ', 'サイト',
  'クリエイティブ', 'プロダクション', 'スタジオ', 'デジタル',

  // 印刷関連
  '印刷', 'プリント', '広告',

  // その他関連
  '企画', 'マーケティング', 'ブランディング', 'システム開発',
  'IT', 'コンサル', 'メディア'
];

// 除外キーワード（まとめサイトなどを除外）
const EXCLUDE_KEYWORDS = [
  'まとめ', 'wiki', 'wikipedia', 'ウィキ', 'ブログ', 'note',
  'youtube', 'twitter', 'facebook', 'instagram', 'アメブロ',
  '求人', '転職', '口コミ', 'レビュー', '比較サイト', 'ランキング',
  'amazon', '楽天', 'yahoo', 'google', 'hatena', 'はてな',
  'naver', 'livedoor', 'fc2', 'アメーバ'
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
 * テキストに含まれるキーワードをチェック
 */
function containsKeywords(text, keywords) {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * 行をフィルタリング
 */
function filterLine(company, url) {
  const combinedText = `${company} ${url}`;

  // 除外キーワードチェック
  if (containsKeywords(combinedText, EXCLUDE_KEYWORDS)) {
    return false;
  }

  // 含むべきキーワードチェック
  if (containsKeywords(combinedText, INCLUDE_KEYWORDS)) {
    return true;
  }

  return false;
}

/**
 * メイン処理
 */
function main() {
  console.log('=== Web制作会社・印刷会社フィルタリング開始 ===\n');

  // CSVを読み込み
  const lines = loadCSV(INPUT_FILE);
  console.log(`総行数: ${lines.length}行`);

  // ヘッダー
  const header = lines[0];
  const filteredLines = [header];

  let totalCount = 0;
  let filteredCount = 0;

  // 各行をフィルタリング
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    totalCount++;

    try {
      const { city, company, url } = parseCSVLine(line);

      if (filterLine(company, url)) {
        filteredLines.push(line);
        filteredCount++;
      }
    } catch (error) {
      console.error(`行 ${i} のパースエラー:`, error.message);
    }
  }

  // 結果を保存
  fs.writeFileSync(OUTPUT_FILE, filteredLines.join('\n'), 'utf-8');

  console.log('\n=== フィルタリング完了 ===');
  console.log(`元のデータ: ${totalCount}件`);
  console.log(`フィルタ後: ${filteredCount}件`);
  console.log(`除外: ${totalCount - filteredCount}件`);
  console.log(`除外率: ${((totalCount - filteredCount) / totalCount * 100).toFixed(1)}%`);
  console.log(`\n出力ファイル: ${OUTPUT_FILE}`);
}

main();
