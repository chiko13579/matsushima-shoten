const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '①送信できなかったリスト.csv');
const outputFile = path.join(__dirname, '①送信できなかったリスト_filtered.csv');
const excludedFile = path.join(__dirname, '①送信できなかったリスト_excluded.csv');

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
  /hw-jobs\.careermine\.jp/i,
  /crowdworks\.jp/i,
  /scouting\.mynavi\.jp/i,
  /support\.mid-tenshoku\.com/i,
  /help\.haken\.rikunabi\.com/i,
  /enhaken\.zendesk\.com/i,
  /job\.career-tasu\.jp/i,
  /career\.nikkei\.com/i,
  /freelance-start\.com/i,
  /nextengineer-benext\.jp/i,
  /jjc-tenshoku\.net/i,
  /manpowerjobnet\.com/i,
  /e-aidem\.com/i,
  /support\.en-ambi\.com/i,
  /mypage\.kotora\.jp/i,
  /shushoku-agent\.acaric\.jp/i,

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
  /decn\.co\.jp/i,
  /toonippo\.co\.jp/i,
  /txbiz\.tv-tokyo\.co\.jp/i,
  /hokkaido-np\.co\.jp/i,
  /niigata-nippo\.co\.jp/i,
  /chunichi\.co\.jp/i,
  /publickey1\.jp/i,
  /nishinippon\.co\.jp/i,
  /shizushinsbs\.co\.jp/i,
  /tbs\.co\.jp/i,
  /fukui-tv\.co\.jp/i,
  /chugoku-np\.co\.jp/i,
  /web-komachi\.com/i,

  // 市役所・自治体・官公庁
  /city\.[a-z]+\.lg\.jp/i,
  /city\.[a-z]+\.[a-z]+\.jp/i,
  /\.go\.jp/i,
  /pref\.[a-z]+\.jp/i,
  /\.metro\.tokyo\./i,

  // 書店・出版
  /kinokuniya\.co\.jp/i,
  /maruzenjunkudo\.co\.jp/i,
  /e-hon\.ne\.jp/i,
  /shoeisha\.co\.jp/i,
  /biz-book\.jp/i,
  /books\.or\.jp/i,

  // 大学・学校・研究機関
  /\.ac\.jp/i,
  /jeed\.go\.jp/i,
  /naist\.jp/i,
  /nii\.ac\.jp/i,
  /jst\.go\.jp/i,

  // 補助金・ポータルサイト
  /hojyokin-portal\.jp/i,
  /logoform\.jp/i,
  /j-net21\.smrj\.go\.jp/i,

  // 一般企業（システム会社でない）
  /khi\.co\.jp/i,           // 川崎重工
  /isuzu\.co\.jp/i,         // いすゞ
  /kobelco\.co\.jp/i,       // 神戸製鋼
  /kubota\.co\.jp/i,        // クボタ
  /fujielectric\.co\.jp/i,  // 富士電機
  /nipro\.co\.jp/i,         // ニプロ
  /jpower\.co\.jp/i,        // 電源開発
  /jr-central\.co\.jp/i,    // JR東海
  /keihan-holdings\.co\.jp/i, // 京阪
  /daiwalease\.co\.jp/i,    // 大和リース
  /taikisha\.co\.jp/i,      // 大気社
  /tanabe-pharma\.com/i,    // 田辺三菱製薬
  /toyal\.co\.jp/i,         // 東洋アルミ
  /shi\.co\.jp/i,           // 住友重機械
  /feps\.co\.jp/i,          // 古河電工パワー
  /ships-net\.co\.jp/i,     // 世界の艦船
  /u-tokai\.ac\.jp/i,       // 東海大学
  /digitalpr\.jp/i,         // デジタルPR
  /u-presscenter\.jp/i,     // プレスセンター
  /nedo\.go\.jp/i,          // NEDO
  /e-rad\.go\.jp/i,         // e-Rad
  /sansokan\.jp/i,          // 産創館
  /sbbit\.jp/i,             // ビジネス+IT
  /kenkey\.jp/i,            // 建設キー
  /businessnetwork\.jp/i,   // ビジネスネットワーク

  // ヘルプ・サポートサイト
  /zendesk\.com/i,
  /help\./i,
  /support\./i,
  /faq\./i,

  // フォームサービス
  /forms\.office\.com/i,
  /docs\.google\.com\/forms/i,
  /form\.run/i,
  /valuecommerce\.com/i,
  /tayori\.com/i,

  // その他除外
  /naviannounce\.com/i,
  /buffett-code\.com/i,
  /corporatedb\.jp/i,
  /catr\.jp/i,
  /sfs-inc\.jp/i,
  /netoff\.co\.jp/i,
  /chintaistyle\.jp/i,
  /fudosanryutsu\.co\.jp/i,
  /hikonefudousan\.com/i,
  /note\.com/i,
  /doi\.org/i,
  /ipsj\.ixsq\.nii\.ac\.jp/i,
  /acoustics\.jp/i,
  /jsa\.or\.jp/i,
  /qzss\.go\.jp/i,
  /cultive\.co\.jp/i,
  /suke-dachi\.jp/i,
  /ccube-career\.jp/i,
  /niigatakurashi\.com/i,
  /workshiga\.com/i,
  /swooo\.net/i,           // 紹介サイト
  /yard\.tips/i,           // 紹介サイト
  /n-v-l\.co/i,            // 紹介サイト
  /24u\.jp/i,              // 求人
  /b-mall\.ne\.jp/i,       // ビジネスモール
  /kjcbiz\.net/i,          // ビジネスネット
  /claris\.com/i,          // Claris
  /cybozupartner\./i,      // サイボウズパートナー
  /kurashimanet\.jp/i,     // 暮らしまねっと
  /itami-city\.jp/i,       // いたみん
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
  /インタビュー/i,
  /研究開発について/i,
  /都市計画課/i,
  /都市計画・/i,
  /開発許可/i,
  /まちづくり・都市計画/i,
  /公募型プロポーザル/i,
  /補助金/i,
  /助成金/i,
  /川崎重工/i,
  /電源開発/i,
  /JR東海/i,
  /神戸製鋼/i,
  /富士電機/i,
  /情報システム科/i,
  /専門学校/i,
  /高等専門学校/i,
  /職業能力開発/i,
  /大学院/i,
  /研究室/i,
  /研究所/i,
  /研究開発体制/i,
  /研究開発拠点/i,
  /研究開発倫理/i,
  /国立研究開発法人/i,
  /技術開発賞/i,
  /共同開発/i,
  /実証実験/i,
  /プロジェクト/i,
  /ロボットシステム開発/i,
  /防災システム/i,
  /防災備蓄管理システム/i,
  /スマートシティ/i,
  /再開発/i,
  /ニュータウン/i,
  /AIで激変/i,
  /ロシア大統領/i,
  /官報決算/i,
  /M&A/i,
  /中古\s*\|/i,
  /図書\s*-/i,
  /CiNii/i,
  /J-global/i,
  /Ndlサーチ/i,
  /国立国会図書館/i,
  /バイト情報/i,
  /アルバイト/i,
  /oaシステム開発科/i,
  /情報システム等に係る調達/i,
  /府・市町村共同システム/i,
  /絶対落ちないシステムを作れ/i,
  /訴訟に関するお知らせ/i,
  /システム開発訴訟/i,
  /雛形.*契約書/i,
  /積算システム/i,
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
