const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '②入力不一致リスト.csv');
const outputFile = path.join(__dirname, '②入力不一致リスト_filtered.csv');
const excludedFile = path.join(__dirname, '②入力不一致リスト_excluded.csv');

// システム会社以外を除外するためのパターン
const excludeUrlPatterns = [
  // 求人サイト
  /pasonacareer\.jp/i,
  /geekly\.co\.jp/i,
  /it-kyujin\.jp/i,
  /engineer-factory\.com/i,
  /itnavi\.jp/i,
  /career-on\.jp/i,
  /gigabaito\.com/i,
  /hatarakuzo\.com/i,
  /djob\.docomo\.ne\.jp/i,
  /csc-staff\.com/i,
  /job-net\.jp/i,
  /job\.fellow-s\.co\.jp/i,
  /job\.selva-i\.co\.jp/i,
  /chibacari\.com/i,

  // ニュース・メディアサイト
  /nikkan\.co\.jp/i,
  /niikei\.jp/i,
  /nikoukei\.co\.jp/i,
  /sanyonews\.jp/i,
  /businessinsider\.jp/i,
  /dxmagazine\.jp/i,
  /mamor-web\.jp/i,
  /ikikata-dappi\.jp/i,
  /creators-station\.jp/i,

  // 市役所・自治体
  /city\.[a-z]+\.lg\.jp/i,
  /city\.[a-z]+\.[a-z]+\.jp/i,
  /faq\.city\./i,

  // 書店・出版
  /kinokuniya\.co\.jp/i,
  /maruzenjunkudo\.co\.jp/i,
  /e-hon\.ne\.jp/i,
  /shoeisha\.co\.jp/i,
  /biz-book\.jp/i,

  // 補助金・ポータルサイト
  /hojyokin-portal\.jp/i,
  /logoform\.jp/i,

  // 一般企業（システム会社でない）
  /nishio-newtown\.jp/i,  // ニュータウン開発
  /fukutsu\.co\.jp/i,      // 福山通運
  /toyota-tsusho\.com/i,   // 豊田通商
  /teijin\.co\.jp/i,       // 帝人
  /telnavi\.jp/i,          // 電話番号検索
  /jpnumber\.com/i,        // 電話番号検索
  /ekiten\.jp/i,           // エキテン
  /bizloop\.jp/i,          // ビズループ
  /kaishalist\.com/i,      // 会社リスト
  /n-seikei\.jp/i,         // 日本整経新聞
  /presscube\.jp/i,        // プレスキューブ
  /form\.run/i,            // フォームラン
  /reserva\.be/i,          // 予約サイト
  /sur\.ly/i,              // 短縮URL
  /hubspot\.com/i,         // Hubspot
  /outsystems\.com/i,      // OutSystems
  /hiroshimaworks\.jp/i,   // ひろしまワークス
  /life-tsuyama\.jp/i,     // 津山移住サイト
  /turnup\.tokushima\.jp/i, // Turn Up徳島
  /e-uturn\.jp/i,          // Uターンサイト
  /hikidashi-ehime\.jp/i,  // ひきだし愛媛
  /it-place-ehime\.jp/i,   // IT Place愛媛
  /popinsight\.jp/i,       // ポップインサイト
  /edge-work\.com/i,       // エッジワーク
  /bousaihaku\.com/i,      // 防災博
  /co-ad\.jp/i,            // 広告
  /web-kanji\.com/i,       // Web幹事
  /inquiry\.impress\.co\.jp/i, // インプレス
  /jt-tsushin\.jp/i,       // JT通信
  /zuken\.co\.jp/i,        // 図研
  /digital-gyosei\.com/i,  // デジタル行政
  /ivry\.jp/i,             // IVRy
  /supportcenter\.excite\.co\.jp/i, // エキサイト
  /kmcanet\.com/i,         // KMCAネット
  /nextjp\.co\.jp/i,       // 物販ネクスト

  // 商工会議所・団体
  /suitacci\.or\.jp/i,     // 吹田商工会議所
  /miyada\.or\.jp/i,       // 宮田村商工会
  /ozu-portal\.com/i,      // 大津町ポータル

  // その他除外
  /jspacesystems\.or\.jp/i, // 宇宙システム
  /if3-moonshot\.org/i,    // ムーンショット
  /y-solution-office\.com/i, // 生産設備
  /kawai-mechanical\.com/i, // 機械製作
  /nikkekikai\.com/i,      // ニッケ機械
  /ground-ct\.co\.jp/i,    // グランド調査開発
  /onomichikaihatsu\.com/i, // 尾道開発
  /j-bdc\.com/i,           // 備南開発
  /lights-lab\.jp/i,       // カーエアコン
  /hi-biz\.jp/i,           // ハイビズ
  /yodogawa\.co\.jp/i,     // 淀川
  /nikkanad\.co\.jp/i,     // 日刊広告
  /systemfour\.jp/i,       // 鈑金ツール
  /golfjyo\.co\.jp/i,      // ゴルフ場システム
  /yosizuka\.jp/i,         // 車いす
  /dazaifudenko\.jp/i,     // 電工
];

// タイトルで除外するパターン
const excludeTitlePatterns = [
  /倒産/i,
  /破産/i,
  /閉鎖/i,
  /ニュース/i,
  /新聞/i,
  /市役所/i,
  /市公式/i,
  /入札/i,
  /PDF/i,
  /書籍/i,
  /本・コミック/i,
  /電子書籍/i,
  /紀伊國屋/i,
  /丸善/i,
  /ジュンク堂/i,
  /プレスリリース/i,
  /電話番号\d+は/i,
  /0\d{9,}は/i,
  /求人/i,
  /転職/i,
  /エンジニア(派遣|募集|採用)/i,
  /【.*】.*エンジニア/i,
  /SE・システムエンジニア.*求人/i,
  /研修でitエンジニア/i,
];

// CSVを読み込み
const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n');
const header = lines[0];

const filteredLines = [header];
const excludedLines = [header];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // CSVパース（簡易版）
  const match = line.match(/^"([^"]*)",\s*"([^"]*)",/);
  if (!match) {
    filteredLines.push(line);
    continue;
  }

  const title = match[1];
  const url = match[2];

  let excluded = false;
  let reason = '';

  // URLパターンでチェック
  for (const pattern of excludeUrlPatterns) {
    if (pattern.test(url)) {
      excluded = true;
      reason = `URL: ${pattern}`;
      break;
    }
  }

  // タイトルパターンでチェック
  if (!excluded) {
    for (const pattern of excludeTitlePatterns) {
      if (pattern.test(title)) {
        excluded = true;
        reason = `Title: ${pattern}`;
        break;
      }
    }
  }

  if (excluded) {
    excludedLines.push(line);
    console.log(`除外: ${title.substring(0, 50)}... (${reason})`);
  } else {
    filteredLines.push(line);
  }
}

// 結果を書き込み
fs.writeFileSync(outputFile, filteredLines.join('\n'), 'utf-8');
fs.writeFileSync(excludedFile, excludedLines.join('\n'), 'utf-8');

console.log('\n=== 結果 ===');
console.log(`元のデータ: ${lines.length - 1} 件`);
console.log(`フィルタ後: ${filteredLines.length - 1} 件`);
console.log(`除外: ${excludedLines.length - 1} 件`);
console.log(`\n出力ファイル: ${outputFile}`);
console.log(`除外リスト: ${excludedFile}`);
