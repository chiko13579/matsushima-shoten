const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class SheetsHandler {
    constructor() {
        this.sheets = null;
        this.auth = null;
    }

    async init() {
        try {
            const credentialsPath = path.join(__dirname, 'credentials.json');
            
            try {
                await fs.access(credentialsPath);
            } catch (error) {
                throw new Error('credentials.json が見つかりません。Google Sheets API の認証設定が必要です。');
            }

            const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
            
            this.auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            
            return true;
        } catch (error) {
            console.error('Google Sheets API 初期化エラー:', error.message);
            return false;
        }
    }

    async createSpreadsheet(title, location) {
        try {
            const resource = {
                properties: {
                    title: `Web制作会社調査結果_${location}_${new Date().toISOString().slice(0, 10)}`
                },
                sheets: [{
                    properties: {
                        title: '調査結果',
                        gridProperties: {
                            columnCount: 16,
                            rowCount: 1000
                        }
                    }
                }]
            };

            const response = await this.sheets.spreadsheets.create({
                resource,
                fields: 'spreadsheetId,spreadsheetUrl'
            });

            return {
                spreadsheetId: response.data.spreadsheetId,
                spreadsheetUrl: response.data.spreadsheetUrl
            };
        } catch (error) {
            console.error('スプレッドシート作成エラー:', error.message);
            throw error;
        }
    }

    async writeCompanyData(spreadsheetId, companies, location) {
        try {
            const headers = [
                'No.',
                '検索地域',
                'URL',
                '会社名',
                '社長名',
                'お問合せURL',
                'FVテキスト',
                '強み',
                '制作実績ページ',
                '制作実績URL',
                '企業理念',
                '大切にしていること',
                '考え方・哲学',
                '設立年',
                '従業員数',
                '事業内容'
            ];

            const rows = [headers];

            companies.forEach((company, index) => {
                rows.push([
                    index + 1,
                    location || company.searchLocation || '',
                    company.url || '',
                    company.companyName || '',
                    company.ceoName || '',
                    company.contactUrl || '',
                    company.fvText || '',
                    company.strengths || '',
                    company.hasPortfolio ? 'あり' : 'なし',
                    company.portfolioUrl || '',
                    company.mission || '',
                    company.values || '',
                    company.philosophy || '',
                    company.founded || '',
                    company.employees || '',
                    company.businessType || ''
                ]);
            });

            const range = 'A1:P' + (companies.length + 1);

            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                resource: {
                    values: rows
                }
            });

            await this.formatSpreadsheet(spreadsheetId, companies.length + 1);

            return true;
        } catch (error) {
            console.error('データ書き込みエラー:', error.message);
            throw error;
        }
    }

    async formatSpreadsheet(spreadsheetId, dataRows) {
        try {
            const requests = [
                {
                    repeatCell: {
                        range: {
                            sheetId: 0,
                            startRowIndex: 0,
                            endRowIndex: 1,
                            startColumnIndex: 0,
                            endColumnIndex: 14
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: {
                                    red: 0.2,
                                    green: 0.6,
                                    blue: 0.9
                                },
                                textFormat: {
                                    foregroundColor: {
                                        red: 1.0,
                                        green: 1.0,
                                        blue: 1.0
                                    },
                                    bold: true
                                }
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat)'
                    }
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId: 0,
                            dimension: 'COLUMNS',
                            startIndex: 1,
                            endIndex: 2
                        },
                        properties: {
                            pixelSize: 300
                        },
                        fields: 'pixelSize'
                    }
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId: 0,
                            dimension: 'COLUMNS',
                            startIndex: 4,
                            endIndex: 5
                        },
                        properties: {
                            pixelSize: 300
                        },
                        fields: 'pixelSize'
                    }
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId: 0,
                            dimension: 'COLUMNS',
                            startIndex: 5,
                            endIndex: 6
                        },
                        properties: {
                            pixelSize: 250
                        },
                        fields: 'pixelSize'
                    }
                },
                {
                    updateBorders: {
                        range: {
                            sheetId: 0,
                            startRowIndex: 0,
                            endRowIndex: dataRows,
                            startColumnIndex: 0,
                            endColumnIndex: 14
                        },
                        top: {
                            style: 'SOLID',
                            width: 1,
                            color: {
                                red: 0.0,
                                green: 0.0,
                                blue: 0.0
                            }
                        },
                        bottom: {
                            style: 'SOLID',
                            width: 1,
                            color: {
                                red: 0.0,
                                green: 0.0,
                                blue: 0.0
                            }
                        },
                        left: {
                            style: 'SOLID',
                            width: 1,
                            color: {
                                red: 0.0,
                                green: 0.0,
                                blue: 0.0
                            }
                        },
                        right: {
                            style: 'SOLID',
                            width: 1,
                            color: {
                                red: 0.0,
                                green: 0.0,
                                blue: 0.0
                            }
                        }
                    }
                }
            ];

            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests
                }
            });

            return true;
        } catch (error) {
            console.error('フォーマット適用エラー:', error.message);
            return false;
        }
    }

    async saveToSpreadsheet(companies, location) {
        try {
            const isInitialized = await this.init();
            if (!isInitialized) {
                throw new Error('Google Sheets API の初期化に失敗しました。');
            }

            console.log('📊 新しいスプレッドシートを作成中...');
            const { spreadsheetId, spreadsheetUrl } = await this.createSpreadsheet('Web制作会社調査結果', location);

            console.log('💾 データを書き込み中...');
            await this.writeCompanyData(spreadsheetId, companies, location);

            return {
                success: true,
                spreadsheetId,
                spreadsheetUrl
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async addToExistingSpreadsheet(spreadsheetId, companies, location) {
        try {
            const isInitialized = await this.init();
            if (!isInitialized) {
                throw new Error('Google Sheets API の初期化に失敗しました。');
            }

            console.log('📊 既存のスプレッドシートにデータを追加中...');
            
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'A:A'
            });

            const existingRows = response.data.values ? response.data.values.length : 0;
            const startRow = existingRows + 2;

            const rows = companies.map((company, index) => [
                startRow + index - 1,
                location || '',
                company.url || '',
                company.companyName || '',
                company.ceoName || '',
                company.contactUrl || '',
                company.fvText || '',
                company.strengths || '',
                company.hasPortfolio ? 'あり' : 'なし',
                company.portfolioUrl || ''
            ]);

            const range = `A${startRow}:J${startRow + companies.length - 1}`;

            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                resource: {
                    values: rows
                }
            });

            return {
                success: true,
                spreadsheetId,
                addedRows: companies.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = SheetsHandler;