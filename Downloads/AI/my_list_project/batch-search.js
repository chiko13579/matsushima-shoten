const axios = require('axios');
const fs = require('fs').promises;

// 日本全国の主要都市リスト（1万件取得用）
const LOCATION_SETS = {
    // 関東エリア
    kanto: [
        '渋谷区', '新宿区', '港区', '千代田区', '中央区', '品川区', '世田谷区', '目黒区',
        '文京区', '台東区', '墨田区', '江東区', '豊島区', '北区', '荒川区', '板橋区',
        '練馬区', '足立区', '葛飾区', '江戸川区', '八王子市', '立川市', '武蔵野市',
        '三鷹市', '府中市', '調布市', '町田市', '横浜市', '川崎市', 'さいたま市'
    ],
    
    // 関西エリア
    kansai: [
        '大阪市北区', '大阪市中央区', '大阪市西区', '大阪市浪速区', '大阪市天王寺区',
        '大阪市淀川区', '大阪市東淀川区', '大阪市城東区', '大阪市阿倍野区', '大阪市住吉区',
        '京都市中京区', '京都市下京区', '京都市左京区', '京都市右京区', '京都市伏見区',
        '神戸市中央区', '神戸市灘区', '神戸市兵庫区', '神戸市東灘区', '神戸市西区',
        '堺市', '東大阪市', '枚方市', '豊中市', '吹田市', '尼崎市', '西宮市', '姫路市',
        '奈良市', '和歌山市'
    ],
    
    // 中部エリア
    chubu: [
        '名古屋市中村区', '名古屋市中区', '名古屋市東区', '名古屋市千種区', '名古屋市昭和区',
        '名古屋市瑞穂区', '名古屋市熱田区', '名古屋市港区', '名古屋市南区', '名古屋市守山区',
        '豊田市', '岡崎市', '一宮市', '春日井市', '豊橋市', '岐阜市', '大垣市', '多治見市',
        '静岡市', '浜松市', '沼津市', '富士市', '金沢市', '富山市', '福井市', '長野市',
        '松本市', '新潟市', '長岡市', '甲府市'
    ],
    
    // 北海道・東北エリア
    hokkaido_tohoku: [
        '札幌市中央区', '札幌市北区', '札幌市東区', '札幌市白石区', '札幌市豊平区',
        '札幌市西区', '札幌市厚別区', '札幌市手稲区', '札幌市清田区', '函館市',
        '旭川市', '釧路市', '帯広市', '小樽市', '苫小牧市', '仙台市青葉区', '仙台市宮城野区',
        '仙台市若林区', '仙台市太白区', '仙台市泉区', '石巻市', '福島市', '郡山市',
        'いわき市', '青森市', '盛岡市', '秋田市', '山形市', '八戸市', '弘前市'
    ],
    
    // 中国・四国エリア
    chugoku_shikoku: [
        '広島市中区', '広島市東区', '広島市南区', '広島市西区', '広島市安佐南区',
        '広島市安佐北区', '広島市佐伯区', '岡山市北区', '岡山市中区', '岡山市東区',
        '倉敷市', '福山市', '呉市', '尾道市', '鳥取市', '松江市', '米子市', '山口市',
        '下関市', '宇部市', '高松市', '松山市', '高知市', '徳島市', '坂出市',
        '丸亀市', '今治市', '新居浜市', '西条市', '四国中央市'
    ],
    
    // 九州・沖縄エリア
    kyushu_okinawa: [
        '福岡市博多区', '福岡市中央区', '福岡市東区', '福岡市南区', '福岡市西区',
        '福岡市城南区', '福岡市早良区', '北九州市小倉北区', '北九州市八幡西区', '久留米市',
        '熊本市中央区', '熊本市東区', '熊本市西区', '熊本市南区', '熊本市北区',
        '鹿児島市', '大分市', '宮崎市', '長崎市', '佐賀市', '那覇市', '浦添市',
        '沖縄市', '宜野湾市', '名護市', '糸満市', '豊見城市', '南城市', '西原町', 'うるま市'
    ]
};

async function batchSearch(locationSet, maxResults = 15) {
    const SERVER_URL = 'http://localhost:3000/api/search';
    const results = [];
    
    console.log(`\n🚀 ${locationSet} エリアの検索を開始します...`);
    console.log(`対象地域数: ${LOCATION_SETS[locationSet].length}`);
    
    for (let i = 0; i < LOCATION_SETS[locationSet].length; i++) {
        const location = LOCATION_SETS[locationSet][i];
        console.log(`\n[${i + 1}/${LOCATION_SETS[locationSet].length}] 検索中: ${location}`);
        
        try {
            const response = await axios.post(SERVER_URL, {
                location: location,
                maxResults: maxResults,
                useRealSearch: true
            });
            
            if (response.data.success && response.data.companies) {
                const companiesWithLocation = response.data.companies.map(company => ({
                    ...company,
                    searchLocation: location,
                    searchArea: locationSet
                }));
                results.push(...companiesWithLocation);
                console.log(`✅ ${response.data.companies.length}社を取得`);
            }
            
        } catch (error) {
            console.error(`❌ エラー (${location}):`, error.message);
        }
        
        // API制限対策で待機
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    return results;
}

async function saveResults(locationSet, results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `batch-results-${locationSet}-${timestamp}.json`;
    
    await fs.writeFile(filename, JSON.stringify({
        area: locationSet,
        totalCompanies: results.length,
        searchDate: new Date().toISOString(),
        companies: results
    }, null, 2));
    
    console.log(`\n✅ 結果を保存しました: ${filename}`);
    console.log(`総企業数: ${results.length}社`);
}

async function main() {
    console.log('🏢 大規模Web制作会社調査バッチ処理');
    console.log('=====================================');
    
    // コマンドライン引数からエリアを取得
    const args = process.argv.slice(2);
    const area = args[0] || 'kanto';
    const maxResults = parseInt(args[1]) || 15;
    
    if (!LOCATION_SETS[area]) {
        console.error('❌ 無効なエリア名です。以下から選択してください:');
        console.log(Object.keys(LOCATION_SETS).join(', '));
        process.exit(1);
    }
    
    try {
        const results = await batchSearch(area, maxResults);
        await saveResults(area, results);
        
        // 重複除去
        const uniqueResults = removeDuplicates(results);
        console.log(`重複除去後: ${uniqueResults.length}社`);
        
    } catch (error) {
        console.error('バッチ処理エラー:', error);
    }
}

function removeDuplicates(companies) {
    const seen = new Map();
    const uniqueCompanies = [];
    
    companies.forEach(company => {
        const url = company.url;
        let domain = '';
        
        try {
            domain = new URL(url).hostname;
        } catch (e) {
            domain = url;
        }
        
        const key = `${domain}_${company.companyName || ''}`;
        
        if (!seen.has(key)) {
            seen.set(key, true);
            uniqueCompanies.push(company);
        }
    });
    
    return uniqueCompanies;
}

// 実行
if (require.main === module) {
    main();
}

module.exports = { LOCATION_SETS, batchSearch };