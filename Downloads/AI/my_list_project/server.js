const express = require('express');
const cors = require('cors');
const path = require('path');
const WebCompanyResearcher = require('./index');

const app = express();
const PORT = 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 静的ファイル配信
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web-app.html'));
});

// 検索API
app.post('/api/search', async (req, res) => {
    const { location, maxResults, companyType, useRealSearch } = req.body;
    
    try {
        if (!location) {
            return res.status(400).json({ error: '場所が指定されていません' });
        }
        
        if (useRealSearch) {
            // 実際のPuppeteer検索
            const researcher = new WebCompanyResearcher();
            await researcher.init();
            
            const searchResults = await researcher.searchWebCompanies(location, maxResults);
            
            if (searchResults.length === 0) {
                await researcher.close();
                return res.status(404).json({ error: 'Web制作会社が見つかりませんでした' });
            }
            
            const companies = [];
            
            for (let i = 0; i < searchResults.length; i++) {
                try {
                    console.log(`\n=== 企業 ${i + 1}/${searchResults.length} の情報取得開始 ===`);
                    console.log(`URL: ${searchResults[i].url}`);
                    console.log(`タイトル: ${searchResults[i].title}`);
                    
                    const companyInfo = await researcher.extractCompanyInfo(searchResults[i].url);
                    
                    console.log('取得した企業情報:', JSON.stringify(companyInfo, null, 2));
                    
                    const combinedData = {
                        ...searchResults[i],
                        ...companyInfo
                    };
                    
                    console.log('結合後のデータ:', JSON.stringify(combinedData, null, 2));
                    
                    companies.push(combinedData);
                    
                    console.log(`✅ 企業 ${i + 1} の情報取得完了`);
                    
                } catch (error) {
                    console.error(`❌ 企業情報取得エラー: ${searchResults[i].url}`, error.message);
                    console.error('エラー詳細:', error);
                    
                    // エラーが発生した場合でも基本情報は追加
                    companies.push({
                        ...searchResults[i],
                        companyName: '',
                        ceoName: '',
                        contactUrl: '',
                        fvText: '',
                        strengths: '',
                        hasPortfolio: false,
                        portfolioUrl: ''
                    });
                }
                
                // 2秒待機
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            await researcher.close();
            
            res.json({
                success: true,
                location,
                totalFound: companies.length,
                companies
            });
            
        } else {
            // テスト用サンプルデータ
            const isMarketing = companyType === 'marketing';
            const typePrefix = isMarketing ? 'マーケティング' : 'Web制作';
            
            const sampleCompanies = [
                {
                    title: `株式会社${typePrefix}Creators ${location}`,
                    url: "https://example.com/webcreators",
                    companyName: `株式会社${typePrefix}Creators ${location}支社`,
                    ceoName: "田中太郎",
                    contactUrl: "https://example.com/contact",
                    fvText: isMarketing ? "デジタル時代を勝ち抜く、戦略的マーケティングで企業成長を加速させます。" : "あなたのビジネスを次のステージへ。最新技術で実現する、成果にコミットするWeb制作。",
                    strengths: isMarketing ? "デジタルマーケティングとSNS運用に特化したサービスを提供。10年以上の実績。" : "レスポンシブデザインとSEO対策に特化したWeb制作サービスを提供。10年以上の実績。",
                    hasPortfolio: true,
                    portfolioUrl: "https://example.com/webcreators/portfolio",
                    businessType: isMarketing ? "デジタルマーケティング・SNS運用・広告代理" : "Web制作・システム開発・SEOコンサルティング"
                },
                {
                    title: `${typePrefix}スタジオABC ${location}`,
                    url: "https://example.com/designabc",
                    companyName: `${typePrefix}スタジオABC ${location}店`,
                    ceoName: "佐藤花子",
                    contactUrl: "https://example.com/inquiry",
                    fvText: isMarketing ? "SNSを通じてブランドストーリーを紡ぐ。感動を生むマーケティングコミュニケーション。" : "美しいデザインで、ブランドの想いを伝える。心に響くビジュアルコミュニケーション。",
                    strengths: isMarketing ? "SNSマーケティングとブランディング戦略に特化。大手企業との取引実績多数。" : "ブランディングを重視したデザイン制作。大手企業との取引実績多数。",
                    hasPortfolio: true,
                    portfolioUrl: "https://example.com/designabc/works",
                    businessType: isMarketing ? "SNSマーケティング・ブランディング・広告企画" : "ブランディング・グラフィックデザイン・Web制作"
                },
                {
                    title: `クリエイティブ合同会社 ${location}`,
                    url: "https://example.com/creative",
                    companyName: `クリエイティブ合同会社 ${location}オフィス`,
                    ceoName: "山田次郎",
                    contactUrl: "https://example.com/contact-us",
                    fvText: isMarketing ? "スタートアップの成長を加速する、革新的なマーケティング戦略を提案します。" : "スタートアップの挑戦を支える、革新的なデジタルソリューション。",
                    strengths: isMarketing ? "スタートアップ企業向けのコスト効率の良いマーケティング支援サービス。" : "スタートアップ企業向けのコスト効率の良いWeb制作サービス。",
                    hasPortfolio: false,
                    portfolioUrl: null,
                    businessType: isMarketing ? "デジタルマーケティング・SNS運用・広告運用" : "Web制作・アプリ開発・ITコンサルティング"
                },
                {
                    title: `テックソリューション株式会社 ${location}`,
                    url: "https://example.com/techsolution",
                    companyName: `テックソリューション株式会社 ${location}本社`,
                    ceoName: "鈴木一郎",
                    contactUrl: "https://example.com/contact",
                    fvText: "テクノロジーの力で、ビジネスの可能性を最大化。信頼のシステム開発パートナー。",
                    strengths: "ECサイト構築とシステム開発に特化。24時間サポート体制。",
                    hasPortfolio: true,
                    portfolioUrl: "https://example.com/techsolution/case-studies",
                    businessType: "ECサイト構築・システム開発・ITコンサルティング"
                },
                {
                    title: `ウェブデザインプロ ${location}`,
                    url: "https://example.com/webdesignpro",
                    companyName: `ウェブデザインプロ ${location}スタジオ`,
                    ceoName: "高橋美咲",
                    contactUrl: "https://example.com/inquiry",
                    fvText: "ユーザー体験を革新する、美しく使いやすいデザインを追求します。",
                    strengths: "UI/UXデザインに強み。アプリ開発からWebサイトまで幅広く対応。",
                    hasPortfolio: true,
                    portfolioUrl: "https://example.com/webdesignpro/gallery",
                    businessType: "UI/UXデザイン・アプリ開発・Web制作"
                }
            ];
            
            const results = sampleCompanies.slice(0, maxResults);
            
            res.json({
                success: true,
                location,
                totalFound: results.length,
                companies: results,
                isTestData: true
            });
        }
        
    } catch (error) {
        console.error('検索エラー:', error);
        res.status(500).json({ 
            error: '検索中にエラーが発生しました',
            details: error.message 
        });
    }
});

// スプレッドシート保存API
app.post('/api/save-to-sheets', async (req, res) => {
    const { companies, spreadsheetId } = req.body;
    
    try {
        if (!companies || companies.length === 0) {
            return res.status(400).json({ error: '保存する企業データがありません' });
        }
        
        const SheetsHandler = require('./sheets-handler');
        const sheetsHandler = new SheetsHandler();
        
        // 初期化チェック
        const hasCredentials = await sheetsHandler.init();
        if (!hasCredentials) {
            return res.status(500).json({ 
                error: 'Google Sheets APIの設定が必要です。npm run setupを実行してください。' 
            });
        }
        
        // 地域ごとにグループ化
        const companiesByLocation = {};
        companies.forEach(company => {
            const location = company.searchLocation || '不明';
            if (!companiesByLocation[location]) {
                companiesByLocation[location] = [];
            }
            companiesByLocation[location].push(company);
        });
        
        // ユーザー指定のスプレッドシートID、またはデフォルトを使用
        const SPREADSHEET_ID = spreadsheetId || '1w3Zms2oNlaF7EH6PYc4rgpgpoGRGJYmGrr0QrlzPFww';
        let spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
        let totalSaved = 0;
        
        console.log(`📊 使用するスプレッドシートID: ${SPREADSHEET_ID}`);
        
        for (const [location, locationCompanies] of Object.entries(companiesByLocation)) {
            const result = await sheetsHandler.addToExistingSpreadsheet(SPREADSHEET_ID, locationCompanies, location);
            
            if (result.success) {
                totalSaved += result.addedRows || locationCompanies.length;
                console.log(`✅ ${location}: ${locationCompanies.length}件のデータを追加`);
            } else {
                console.error(`スプレッドシート保存エラー (${location}):`, result.error);
                
                // より詳細なエラーメッセージ
                if (result.error.includes('permission')) {
                    return res.status(403).json({ 
                        error: `権限エラー: スプレッドシートID "${SPREADSHEET_ID}" にアクセスできません。共有設定を確認してください。`,
                        details: 'サービスアカウント (web-company-scraper@x-auto-poster-466609.iam.gserviceaccount.com) を編集者として追加してください。'
                    });
                } else if (result.error.includes('not found')) {
                    return res.status(404).json({ 
                        error: `スプレッドシートが見つかりません: "${SPREADSHEET_ID}"`,
                        details: 'スプレッドシートIDが正しいか確認してください。'
                    });
                }
            }
        }
        
        if (totalSaved > 0) {
            res.json({
                success: true,
                spreadsheetUrl,
                spreadsheetId: SPREADSHEET_ID,
                savedCount: totalSaved
            });
        } else {
            res.status(500).json({ 
                error: 'スプレッドシートの保存に失敗しました' 
            });
        }
        
    } catch (error) {
        console.error('スプレッドシート保存エラー:', error);
        res.status(500).json({ 
            error: 'スプレッドシート保存中にエラーが発生しました',
            details: error.message 
        });
    }
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 サーバーが起動しました: http://localhost:${PORT}`);
    console.log('Webブラウザでアクセスしてください！');
});

module.exports = app;