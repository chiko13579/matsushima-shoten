const readlineSync = require('readline-sync');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class SetupWizard {
    constructor() {
        this.credentialsPath = path.join(__dirname, 'credentials.json');
    }

    async run() {
        console.log('🚀 Google Sheets API 設定ウィザード');
        console.log('=' .repeat(50));
        
        const hasCredentials = await this.checkCredentials();
        
        if (hasCredentials) {
            console.log('✅ credentials.json が見つかりました！');
            const useExisting = readlineSync.question('既存の設定を使用しますか？ (y/n): ');
            
            if (useExisting.toLowerCase() === 'y') {
                const isValid = await this.validateCredentials();
                if (isValid) {
                    console.log('🎉 設定完了！Google Sheets機能が使用できます。');
                    return true;
                } else {
                    console.log('❌ 認証ファイルに問題があります。再設定します。');
                }
            }
        }
        
        console.log('\n📋 Google Cloud Platform の設定が必要です。');
        console.log('以下の手順で進めます：\n');
        
        this.showStep1();
        this.showStep2();
        this.showStep3();
        this.showStep4();
        this.showStep5();
        
        const proceed = readlineSync.question('設定を完了しましたか？ (y/n): ');
        
        if (proceed.toLowerCase() === 'y') {
            await this.promptForCredentials();
            return await this.validateCredentials();
        } else {
            console.log('後で設定する場合は、再度このウィザードを実行してください。');
            return false;
        }
    }

    async checkCredentials() {
        try {
            await fs.access(this.credentialsPath);
            return true;
        } catch {
            return false;
        }
    }

    async validateCredentials() {
        try {
            const credentialsContent = await fs.readFile(this.credentialsPath, 'utf8');
            const credentials = JSON.parse(credentialsContent);
            
            const requiredFields = [
                'type',
                'project_id',
                'private_key',
                'client_email',
                'client_id'
            ];
            
            const missingFields = requiredFields.filter(field => !credentials[field]);
            
            if (missingFields.length > 0) {
                console.log(`❌ 必須フィールドが不足しています: ${missingFields.join(', ')}`);
                return false;
            }
            
            if (credentials.type !== 'service_account') {
                console.log('❌ サービスアカウントの認証情報である必要があります。');
                return false;
            }
            
            console.log('✅ 認証ファイルの形式は正しいです。');
            
            try {
                const SheetsHandler = require('./sheets-handler');
                const sheetsHandler = new SheetsHandler();
                const isInitialized = await sheetsHandler.init();
                
                if (isInitialized) {
                    console.log('✅ Google Sheets API への接続に成功しました！');
                    return true;
                } else {
                    console.log('❌ Google Sheets API への接続に失敗しました。');
                    return false;
                }
            } catch (error) {
                console.log('❌ API接続テストでエラーが発生しました:', error.message);
                return false;
            }
            
        } catch (error) {
            console.log('❌ 認証ファイルの読み込みに失敗しました:', error.message);
            return false;
        }
    }

    showStep1() {
        console.log('📋 ステップ 1: Google Cloud Console にアクセス');
        console.log('   🌐 https://console.cloud.google.com/');
        console.log('   - 新しいプロジェクトを作成または既存プロジェクトを選択');
        console.log('   - プロジェクト名例: "web-company-research"');
        
        const openBrowser = readlineSync.question('\nブラウザで Google Cloud Console を開きますか？ (y/n): ');
        if (openBrowser.toLowerCase() === 'y') {
            this.openUrl('https://console.cloud.google.com/');
        }
        
        readlineSync.question('\nステップ1が完了したらEnterキーを押してください...');
    }

    showStep2() {
        console.log('\n📋 ステップ 2: Google Sheets API を有効化');
        console.log('   1. 左メニューから「APIとサービス」→「ライブラリ」');
        console.log('   2. "Google Sheets API" を検索');
        console.log('   3. 「Google Sheets API」をクリック');
        console.log('   4. 「有効にする」ボタンをクリック');
        
        const openAPI = readlineSync.question('\nAPIライブラリページを開きますか？ (y/n): ');
        if (openAPI.toLowerCase() === 'y') {
            this.openUrl('https://console.cloud.google.com/apis/library/sheets.googleapis.com');
        }
        
        readlineSync.question('\nステップ2が完了したらEnterキーを押してください...');
    }

    showStep3() {
        console.log('\n📋 ステップ 3: サービスアカウントの作成');
        console.log('   1. 「APIとサービス」→「認証情報」');
        console.log('   2. 「認証情報を作成」→「サービスアカウント」');
        console.log('   3. サービスアカウント名: "web-company-scraper"');
        console.log('   4. 「作成して続行」をクリック');
        console.log('   5. ロール: 「編集者」を選択');
        console.log('   6. 「完了」をクリック');
        
        const openCredentials = readlineSync.question('\n認証情報ページを開きますか？ (y/n): ');
        if (openCredentials.toLowerCase() === 'y') {
            this.openUrl('https://console.cloud.google.com/apis/credentials');
        }
        
        readlineSync.question('\nステップ3が完了したらEnterキーを押してください...');
    }

    showStep4() {
        console.log('\n📋 ステップ 4: 認証キーの生成');
        console.log('   1. 作成したサービスアカウントをクリック');
        console.log('   2. 「キー」タブを選択');
        console.log('   3. 「鍵を追加」→「新しい鍵を作成」');
        console.log('   4. キーのタイプ: 「JSON」を選択');
        console.log('   5. 「作成」をクリック');
        console.log('   6. JSONファイルがダウンロードされます');
        
        readlineSync.question('\nステップ4が完了したらEnterキーを押してください...');
    }

    showStep5() {
        console.log('\n📋 ステップ 5: 認証ファイルの配置');
        console.log('   1. ダウンロードしたJSONファイルを "credentials.json" に名前変更');
        console.log('   2. このプロジェクトフォルダに配置');
        console.log(`   配置先: ${this.credentialsPath}`);
        
        readlineSync.question('\nステップ5が完了したらEnterキーを押してください...');
    }

    async promptForCredentials() {
        console.log('\n🔍 認証ファイルを確認しています...');
        
        const hasFile = await this.checkCredentials();
        
        if (!hasFile) {
            console.log('❌ credentials.json が見つかりません。');
            
            const retry = readlineSync.question('ファイルを配置後、再試行しますか？ (y/n): ');
            if (retry.toLowerCase() === 'y') {
                await this.promptForCredentials();
            }
        } else {
            console.log('✅ credentials.json が見つかりました！');
        }
    }

    openUrl(url) {
        try {
            let command;
            switch (process.platform) {
                case 'darwin':
                    command = `open "${url}"`;
                    break;
                case 'win32':
                    command = `start "${url}"`;
                    break;
                default:
                    command = `xdg-open "${url}"`;
            }
            
            exec(command, (error) => {
                if (error) {
                    console.log(`URL を手動で開いてください: ${url}`);
                }
            });
        } catch (error) {
            console.log(`URL を手動で開いてください: ${url}`);
        }
    }
}

async function runSetupWizard() {
    const wizard = new SetupWizard();
    const success = await wizard.run();
    
    if (success) {
        console.log('\n🎉 セットアップ完了！');
        console.log('npm start でツールを実行し、Googleスプレッドシート機能をお試しください。');
    } else {
        console.log('\n⚠️  セットアップが未完了です。');
        console.log('必要に応じて後で再実行してください: npm run setup');
    }
}

if (require.main === module) {
    runSetupWizard().catch(console.error);
}

module.exports = SetupWizard;